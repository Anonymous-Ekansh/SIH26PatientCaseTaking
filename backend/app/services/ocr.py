# OCR call to Sarvam Document Digitisation API

import httpx
from app.config import SARVAM_API_KEY


class OCRError(Exception):
    """Raised when the Sarvam OCR API call fails."""
    pass


async def call_sarvam_ocr(file_bytes: bytes, filename: str = "document.pdf") -> str:
    """
    Send a file to Sarvam's Document Digitisation API and return the extracted text.

    Args:
        file_bytes: Raw bytes of the uploaded document.
        filename: Original filename (used in the multipart upload).

    Returns:
        The raw extracted text from the document.

    Raises:
        OCRError: If the API key is missing, the request fails, or the response is non-200.
    """
    if not SARVAM_API_KEY:
        raise OCRError("SARVAM_API_KEY is not configured in .env")

    url = "https://api.sarvam.ai/parse/document"

    # Determine content type from filename
    content_type = "application/pdf"
    if filename.lower().endswith((".png",)):
        content_type = "image/png"
    elif filename.lower().endswith((".jpg", ".jpeg")):
        content_type = "image/jpeg"
    elif filename.lower().endswith((".webp",)):
        content_type = "image/webp"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "API-Subscription-Key": SARVAM_API_KEY,
                },
                files={
                    "file": (filename, file_bytes, content_type),
                },
            )

        if response.status_code != 200:
            raise OCRError(
                f"Sarvam OCR API returned status {response.status_code}: {response.text}"
            )

        data = response.json()

        # The Sarvam API returns parsed text — extract it from the response
        # Typical response structure: {"text": "...", ...} or similar
        if isinstance(data, dict):
            # Try common response keys
            text = data.get("text") or data.get("extracted_text") or data.get("content", "")
            if not text and "pages" in data:
                # Some document APIs return per-page results
                pages = data["pages"]
                text = "\n\n".join(
                    p.get("text", "") for p in pages if isinstance(p, dict)
                )
            if not text:
                # Fallback: serialize the whole response as text
                import json
                text = json.dumps(data, indent=2)
            return text
        elif isinstance(data, str):
            return data
        else:
            import json
            return json.dumps(data, indent=2)

    except httpx.HTTPError as e:
        raise OCRError(f"HTTP error during Sarvam OCR call: {str(e)}") from e
