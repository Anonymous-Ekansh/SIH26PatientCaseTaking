from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from enum import Enum

from app.supabase_client import supabase
from app.services.ocr import call_sarvam_ocr, OCRError
from app.services.extraction import extract_entities, ExtractionError

router = APIRouter(tags=["documents"])


class DocType(str, Enum):
    prescription = "prescription"
    lab_report = "lab_report"
    discharge_summary = "discharge_summary"
    other = "other"


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    patient_id: str = Form(..., description="Supabase auth_user_id (UUID)"),
    encounter_id: str = Form(...),
    doc_type: DocType = Form(...),
):
    """
    Upload a document and run the full OCR + entity extraction pipeline.

    Steps:
    1. Upload raw file to Supabase Storage bucket "patient-documents".
    2. Look up internal patient ID from auth_user_id.
    3. Insert a row into the "documents" table with ocr_status="processing".
    4. Call Sarvam OCR to extract raw text.
    5. Call Groq LLM to extract structured clinical entities.
    6. Insert extracted entities into the "extracted_entities" table.
    7. Update document ocr_status to "done" (or "failed" on error).
    """

    document_id = None

    try:
        # --- Read file bytes ---
        file_bytes = await file.read()
        filename = file.filename or "document"

        # --- 1. Upload raw file to Supabase Storage ---
        storage_path = f"{patient_id}/encounters/{encounter_id}/raw/{filename}"

        # Determine content type
        content_type = file.content_type or "application/octet-stream"

        upload_result = supabase.storage.from_("patient-documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )

        # --- 2. Look up internal patient ID ---
        patient_result = (
            supabase.table("patients")
            .select("id")
            .eq("auth_user_id", patient_id)
            .single()
            .execute()
        )

        if not patient_result.data:
            raise HTTPException(
                status_code=404,
                detail=f"No patient found with auth_user_id={patient_id}",
            )

        internal_patient_id = patient_result.data["id"]

        # --- 3. Insert into documents table ---
        doc_insert = (
            supabase.table("documents")
            .insert(
                {
                    "patient_id": internal_patient_id,
                    "encounter_id": encounter_id,
                    "doc_type": doc_type.value,
                    "storage_path": storage_path,
                    "ocr_status": "processing",
                }
            )
            .execute()
        )

        if not doc_insert.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to insert document record into database.",
            )

        document_id = doc_insert.data[0]["id"]

        # --- 4. Call Sarvam OCR ---
        raw_text = await call_sarvam_ocr(file_bytes, filename)

        # --- 5. Call Groq LLM extraction ---
        entities = await extract_entities(raw_text)

        # --- 6. Insert extracted entities ---
        if entities:
            entity_rows = [
                {
                    "document_id": document_id,
                    "entity_type": entity["entity_type"],
                    "label": entity["label"],
                    "value": entity.get("value"),
                    "unit": entity.get("unit"),
                    "ref_range": entity.get("ref_range"),
                    "is_abnormal": entity.get("is_abnormal", False),
                }
                for entity in entities
            ]

            supabase.table("extracted_entities").insert(entity_rows).execute()

        # --- 7. Update document status to "done" ---
        supabase.table("documents").update({"ocr_status": "done"}).eq(
            "id", document_id
        ).execute()

        return {
            "document_id": document_id,
            "ocr_status": "done",
            "extracted_entities": entities,
        }

    except OCRError as e:
        # OCR failed — mark document as failed if we have a document_id
        if document_id:
            supabase.table("documents").update({"ocr_status": "failed"}).eq(
                "id", document_id
            ).execute()
        raise HTTPException(status_code=502, detail=f"OCR processing failed: {str(e)}")

    except ExtractionError as e:
        # Extraction failed — mark document as failed
        if document_id:
            supabase.table("documents").update({"ocr_status": "failed"}).eq(
                "id", document_id
            ).execute()
        raise HTTPException(
            status_code=502, detail=f"Entity extraction failed: {str(e)}"
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise

    except Exception as e:
        # Catch-all — mark document as failed
        if document_id:
            supabase.table("documents").update({"ocr_status": "failed"}).eq(
                "id", document_id
            ).execute()
        raise HTTPException(
            status_code=500, detail=f"Unexpected error during processing: {str(e)}"
        )
