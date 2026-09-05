# OCR call to Sarvam Document Intelligence API (doc-ai v1)
# This is an async job-based API: submit → poll status → download results

import json
import asyncio
import httpx
from app.config import SARVAM_API_KEY


class OCRError(Exception):
    """Raised when the Sarvam OCR API call fails."""
    pass


BASE_URL = "https://api.sarvam.ai"
DIGITISE_URL = f"{BASE_URL}/doc-ai/v1/job/digitise"
STATUS_URL_TEMPLATE = f"{BASE_URL}/doc-ai/v1/job/{{job_id}}/status"
DOWNLOAD_URL_TEMPLATE = f"{BASE_URL}/doc-ai/v1/job/{{job_id}}/download-url"

# Terminal states for polling
TERMINAL_STATUSES = {"completed", "partially_completed", "failed", "rejected"}

# Polling configuration
POLL_INTERVAL_SECONDS = 3
MAX_POLL_ATTEMPTS = 40  # 3s * 40 = 120s max wait


def _get_content_type(filename: str) -> str:
    """Determine content type from filename extension."""
    lower = filename.lower()
    if lower.endswith(".png"):
        return "image/png"
    elif lower.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    elif lower.endswith(".webp"):
        return "image/webp"
    elif lower.endswith(".tiff") or lower.endswith(".tif"):
        return "image/tiff"
    else:
        return "application/pdf"


def _get_headers() -> dict:
    """Return auth headers for Sarvam API."""
    return {"api-subscription-key": SARVAM_API_KEY}


async def call_sarvam_ocr(file_bytes: bytes, filename: str = "document.pdf") -> str:
    """
    Send a file to Sarvam's Document Intelligence API and return the extracted text.

    This uses the async job-based workflow:
    1. POST /doc-ai/v1/job/digitise  → get job_id
    2. GET  /doc-ai/v1/job/{job_id}/status  → poll until terminal
    3. GET  /doc-ai/v1/job/{job_id}/download-url  → get result URL
    4. GET  the download URL → get the actual OCR text

    Args:
        file_bytes: Raw bytes of the uploaded document.
        filename: Original filename (used in the multipart upload).

    Returns:
        The raw extracted text from the document.

    Raises:
        OCRError: If the API key is missing, the request fails, or polling times out.
    """
    if not SARVAM_API_KEY:
        raise OCRError("SARVAM_API_KEY is not configured in .env")

    content_type = _get_content_type(filename)
    headers = _get_headers()

    async with httpx.AsyncClient(timeout=120.0) as client:

        # ── Step 1: Submit the digitisation job ──
        try:
            submit_response = await client.post(
                DIGITISE_URL,
                headers=headers,
                files={"file": (filename, file_bytes, content_type)},
                data={"output_format": "json"},
            )
        except httpx.HTTPError as e:
            raise OCRError(f"HTTP error submitting OCR job: {str(e)}") from e

        if submit_response.status_code not in (200, 201, 202):
            raise OCRError(
                f"Sarvam digitise API returned status {submit_response.status_code}: "
                f"{submit_response.text}"
            )

        submit_data = submit_response.json()
        job_id = submit_data.get("job_id") or submit_data.get("id")

        if not job_id:
            raise OCRError(
                f"No job_id in Sarvam digitise response: {json.dumps(submit_data)}"
            )

        # ── Step 2: Poll for job completion ──
        status_url = STATUS_URL_TEMPLATE.format(job_id=job_id)
        final_status = None

        for attempt in range(MAX_POLL_ATTEMPTS):
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

            try:
                status_response = await client.get(status_url, headers=headers)
            except httpx.HTTPError as e:
                raise OCRError(f"HTTP error polling OCR status: {str(e)}") from e

            if status_response.status_code != 200:
                raise OCRError(
                    f"Sarvam status API returned {status_response.status_code}: "
                    f"{status_response.text}"
                )

            status_data = status_response.json()
            current_status = status_data.get("status", "").lower()

            if current_status in TERMINAL_STATUSES:
                final_status = current_status
                break

        if final_status is None:
            raise OCRError(
                f"OCR job {job_id} timed out after {MAX_POLL_ATTEMPTS * POLL_INTERVAL_SECONDS}s"
            )

        if final_status in ("failed", "rejected"):
            raise OCRError(f"OCR job {job_id} ended with status: {final_status}")

        # ── Step 3: Download the results ──
        download_url_endpoint = DOWNLOAD_URL_TEMPLATE.format(job_id=job_id)

        try:
            dl_response = await client.get(download_url_endpoint, headers=headers)
        except httpx.HTTPError as e:
            raise OCRError(f"HTTP error fetching download URL: {str(e)}") from e

        if dl_response.status_code != 200:
            raise OCRError(
                f"Sarvam download-url API returned {dl_response.status_code}: "
                f"{dl_response.text}"
            )

        dl_data = dl_response.json()

        # The response may contain the result directly or a URL to download from
        # Try to extract text from the response itself first
        text = _extract_text_from_response(dl_data)

        if text:
            return text

        # If there's a download URL, fetch that
        result_url = dl_data.get("url") or dl_data.get("download_url")
        if result_url:
            try:
                result_response = await client.get(result_url)
            except httpx.HTTPError as e:
                raise OCRError(f"HTTP error downloading OCR result: {str(e)}") from e

            if result_response.status_code != 200:
                raise OCRError(
                    f"Failed to download OCR result: status {result_response.status_code}"
                )

            # Try to parse as JSON first
            try:
                result_data = result_response.json()
                text = _extract_text_from_response(result_data)
                if text:
                    return text
                # If we can't extract text, return the raw JSON as text
                return json.dumps(result_data, indent=2)
            except (json.JSONDecodeError, ValueError):
                # It's plain text
                return result_response.text

        # Fallback: return raw response as JSON string
        return json.dumps(dl_data, indent=2)


def _extract_text_from_response(data) -> str | None:
    """
    Try to extract readable text from a Sarvam API response object.
    Handles multiple possible response structures.
    """
    if isinstance(data, str):
        return data

    if not isinstance(data, dict):
        return None

    # Direct text fields
    for key in ("text", "extracted_text", "content", "markdown", "md"):
        if key in data and data[key]:
            return str(data[key])

    # Per-page results
    if "pages" in data and isinstance(data["pages"], list):
        page_texts = []
        for page in data["pages"]:
            if isinstance(page, dict):
                for key in ("text", "content", "markdown", "md"):
                    if key in page and page[key]:
                        page_texts.append(str(page[key]))
                        break
            elif isinstance(page, str):
                page_texts.append(page)
        if page_texts:
            return "\n\n".join(page_texts)

    # Results array
    if "results" in data and isinstance(data["results"], list):
        result_texts = []
        for result in data["results"]:
            if isinstance(result, dict):
                for key in ("text", "content", "markdown", "md"):
                    if key in result and result[key]:
                        result_texts.append(str(result[key]))
                        break
            elif isinstance(result, str):
                result_texts.append(result)
        if result_texts:
            return "\n\n".join(result_texts)

    return None
