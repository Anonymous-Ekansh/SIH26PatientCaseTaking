# LLM entity extraction call to Groq

import json
import httpx
from app.config import GROQ_API_KEY


class ExtractionError(Exception):
    """Raised when the Groq extraction API call fails."""
    pass


EXTRACTION_PROMPT = """You are a clinical NLP extraction system. Given the following OCR text from a medical document, extract all structured clinical entities.

Return ONLY a valid JSON array, with NO explanation or surrounding text. Each element must have these exact keys:
- "entity_type": one of "diagnosis", "medication", "lab_value", "procedure"
- "label": the name of the entity (e.g. "Type 2 Diabetes", "Metformin", "Hemoglobin")
- "value": the associated value if any (e.g. "500mg twice daily", "8.2"), or null
- "unit": the unit of measurement if applicable (e.g. "g/dL", "mg"), or null
- "ref_range": the reference range if given (e.g. "12-16 g/dL"), or null
- "is_abnormal": boolean, true ONLY for lab_value entries where the value falls outside the reference range. You must compare the value against the ref_range to determine this. For non lab_value entities, set to false.

Example output:
[
  {"entity_type": "diagnosis", "label": "Type 2 Diabetes", "value": null, "unit": null, "ref_range": null, "is_abnormal": false},
  {"entity_type": "medication", "label": "Metformin", "value": "500mg twice daily", "unit": null, "ref_range": null, "is_abnormal": false},
  {"entity_type": "lab_value", "label": "Hemoglobin", "value": "8.2", "unit": "g/dL", "ref_range": "12-16 g/dL", "is_abnormal": true}
]

If no entities can be extracted, return an empty array: []

OCR TEXT:
"""


async def extract_entities(raw_text: str) -> list[dict]:
    """
    Send raw OCR text to Groq's chat completion API to extract structured clinical entities.

    Args:
        raw_text: The raw OCR text from a medical document.

    Returns:
        A list of dicts, each representing an extracted clinical entity.

    Raises:
        ExtractionError: If the API key is missing, the request fails, or the response is not valid JSON.
    """
    if not GROQ_API_KEY:
        raise ExtractionError("GROQ_API_KEY is not configured in .env")

    url = "https://api.groq.com/openai/v1/chat/completions"

    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {
                "role": "system",
                "content": "You are a medical entity extraction assistant. You only output valid JSON arrays.",
            },
            {
                "role": "user",
                "content": EXTRACTION_PROMPT + raw_text,
            },
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code != 200:
            raise ExtractionError(
                f"Groq API returned status {response.status_code}: {response.text}"
            )

        data = response.json()

        # Extract the message content from the chat completion response
        content = data["choices"][0]["message"]["content"].strip()

        # Sometimes models wrap JSON in markdown code blocks — strip those
        if content.startswith("```"):
            # Remove ```json or ``` prefix and trailing ```
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines).strip()

        # Parse the JSON
        try:
            entities = json.loads(content)
        except json.JSONDecodeError as e:
            raise ExtractionError(
                f"Groq response is not valid JSON: {str(e)}\nRaw content: {content[:500]}"
            ) from e

        if not isinstance(entities, list):
            raise ExtractionError(
                f"Expected a JSON array from Groq, got {type(entities).__name__}: {content[:500]}"
            )

        # Validate each entity has the required keys
        required_keys = {"entity_type", "label", "value", "unit", "ref_range", "is_abnormal"}
        valid_entity_types = {"diagnosis", "medication", "lab_value", "procedure"}

        validated_entities = []
        for entity in entities:
            if not isinstance(entity, dict):
                continue
            # Fill in missing keys with defaults
            validated = {
                "entity_type": entity.get("entity_type", "diagnosis"),
                "label": entity.get("label", "Unknown"),
                "value": entity.get("value"),
                "unit": entity.get("unit"),
                "ref_range": entity.get("ref_range"),
                "is_abnormal": entity.get("is_abnormal", False),
            }
            # Clamp entity_type to valid values
            if validated["entity_type"] not in valid_entity_types:
                validated["entity_type"] = "diagnosis"
            validated_entities.append(validated)

        return validated_entities

    except httpx.HTTPError as e:
        raise ExtractionError(f"HTTP error during Groq API call: {str(e)}") from e
