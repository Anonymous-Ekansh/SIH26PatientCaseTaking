from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Path
from enum import Enum
from typing import List
import logging

logger = logging.getLogger(__name__)

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
    auth_user_id: str = Form(..., description="Supabase auth_user_id (UUID)"),
    doc_type: DocType = Form(...),
):
    """
    Upload a document and run the full OCR + entity extraction pipeline.
    """
    document_id = None

    try:
        # --- Read file bytes ---
        file_bytes = await file.read()
        filename = file.filename or "document"

        # --- Look up internal patient ID ---
        patient_result = (
            supabase.table("patients")
            .select("id")
            .eq("auth_user_id", auth_user_id)
            .maybe_single()
            .execute()
        )

        if not patient_result.data:
            raise HTTPException(
                status_code=404,
                detail="Patient must complete onboarding first.",
            )

        internal_patient_id = patient_result.data["id"]

        # --- Look up or create in_progress encounter ---
        encounter_result = (
            supabase.table("encounters")
            .select("id")
            .eq("patient_id", internal_patient_id)
            .eq("status", "in_progress")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if encounter_result.data and len(encounter_result.data) > 0:
            encounter_id = encounter_result.data[0]["id"]
        else:
            new_encounter = (
                supabase.table("encounters")
                .insert({
                    "patient_id": internal_patient_id,
                    "status": "in_progress",
                    "mode": "allopathic"
                })
                .execute()
            )
            if not new_encounter.data:
                raise HTTPException(status_code=500, detail="Failed to create encounter.")
            encounter_id = new_encounter.data[0]["id"]

        # --- Upload raw file to Supabase Storage ---
        storage_path = f"{auth_user_id}/encounters/{encounter_id}/raw/{filename}"
        content_type = file.content_type or "application/octet-stream"

        upload_result = supabase.storage.from_("patient-documents").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )

        # --- Insert into documents table ---
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

        # --- Call Sarvam OCR ---
        raw_text = await call_sarvam_ocr(file_bytes, filename)
        logger.warning(f"[PIPELINE] OCR returned text length: {len(raw_text)}")
        logger.warning(f"[PIPELINE] OCR text preview (first 500 chars): {raw_text[:500]}")

        # --- Call Groq LLM extraction ---
        entities = await extract_entities(raw_text)
        logger.warning(f"[PIPELINE] Extraction returned {len(entities)} entities")
        logger.warning(f"[PIPELINE] Entities: {entities}")

        # --- Insert extracted entities ---
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

        # --- Update document status to "done" ---
        supabase.table("documents").update({"ocr_status": "done"}).eq(
            "id", document_id
        ).execute()

        return {
            "document_id": document_id,
            "encounter_id": encounter_id,
            "storage_path": storage_path,
            "extracted_entities": entities,
        }

    except OCRError as e:
        if document_id:
            supabase.table("documents").update({"ocr_status": "failed"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    except ExtractionError as e:
        if document_id:
            supabase.table("documents").update({"ocr_status": "failed"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")

    except HTTPException:
        raise

    except Exception as e:
        if document_id:
            supabase.table("documents").update({"ocr_status": "failed"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/by-patient/{auth_user_id}")
def get_documents_by_patient(auth_user_id: str = Path(...)):
    """
    Get all documents and extracted entities for the patient's current in-progress encounter.
    """
    try:
        # 1. Get internal patient id
        patient_result = (
            supabase.table("patients")
            .select("id")
            .eq("auth_user_id", auth_user_id)
            .maybe_single()
            .execute()
        )
        if not patient_result or not patient_result.data:
            raise HTTPException(status_code=404, detail="Patient not found.")
        
        internal_patient_id = patient_result.data["id"]

        # 2. Get latest encounter (regardless of status)
        encounter_result = (
            supabase.table("encounters")
            .select("id")
            .eq("patient_id", internal_patient_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not encounter_result or not encounter_result.data or len(encounter_result.data) == 0:
            return [] # No active encounter, no documents

        encounter_id = encounter_result.data[0]["id"]

        # 3. Get documents with entities
        docs_result = (
            supabase.table("documents")
            .select("*, extracted_entities(*)")
            .eq("encounter_id", encounter_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        
        return docs_result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/encounter-summary/{encounter_id}")
def get_encounter_summary(encounter_id: str = Path(...)):
    """
    Get full summary data for an encounter: encounter details, conversation, documents+entities, ayush.
    Uses backend service role — bypasses RLS so doctors can view patient data.
    """
    try:
        # 1. Get encounter with patient info
        encounter_result = (
            supabase.table("encounters")
            .select("*, patients(auth_user_id, name, phone, email)")
            .eq("id", encounter_id)
            .maybe_single()
            .execute()
        )
        if not encounter_result or not encounter_result.data:
            raise HTTPException(status_code=404, detail="Encounter not found.")

        encounter = encounter_result.data
        patient_auth_id = encounter.get("patients", {}).get("auth_user_id")

        # 2. Get conversation
        convo_result = (
            supabase.table("conversations")
            .select("*")
            .eq("encounter_id", encounter_id)
            .maybe_single()
            .execute()
        )

        # 3. Get documents with entities
        docs_result = (
            supabase.table("documents")
            .select("*, extracted_entities(*)")
            .eq("encounter_id", encounter_id)
            .order("uploaded_at", desc=True)
            .execute()
        )

        # 4. Get AYUSH assessment
        ayush_result = (
            supabase.table("ayush_assessments")
            .select("*")
            .eq("encounter_id", encounter_id)
            .maybe_single()
            .execute()
        )

        return {
            "encounter": encounter,
            "conversation": convo_result.data if convo_result else None,
            "documents": docs_result.data if docs_result else [],
            "ayush": ayush_result.data if ayush_result else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/doctor-bookings/{doctor_auth_id}")
def get_doctor_bookings(doctor_auth_id: str = Path(...)):
    """
    Get all bookings for a doctor, including patient info and slot info.
    Uses service role to bypass RLS.
    """
    try:
        # 1. Get doctor
        doc_result = (
            supabase.table("doctors")
            .select("id")
            .eq("auth_user_id", doctor_auth_id)
            .maybe_single()
            .execute()
        )
        if not doc_result or not doc_result.data:
            raise HTTPException(status_code=404, detail="Doctor not found.")

        doctor_id = doc_result.data["id"]

        # 2. Get bookings with patient and slot info
        bookings_result = (
            supabase.table("bookings")
            .select("*, patients(name, phone), doctor_availability_slots(date, start_time, end_time)")
            .eq("doctor_id", doctor_id)
            .order("created_at", desc=True)
            .execute()
        )

        return bookings_result.data if bookings_result else []

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patient-summary/{patient_id}")
def get_patient_summary(patient_id: str = Path(...)):
    """
    Get the full summary for a patient's latest encounter.
    Uses service role to bypass RLS — designed for doctor view.
    """
    try:
        # 1. Get patient info
        patient_result = (
            supabase.table("patients")
            .select("*")
            .eq("id", patient_id)
            .maybe_single()
            .execute()
        )
        if not patient_result or not patient_result.data:
            raise HTTPException(status_code=404, detail="Patient not found.")

        patient = patient_result.data

        # 2. Get latest encounter
        encounter_result = (
            supabase.table("encounters")
            .select("id")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )

        encounter_id = encounter_result.data["id"] if (encounter_result and encounter_result.data) else None

        conversation = None
        documents = []
        ayush = None

        if encounter_id:
            # 3. Get conversation
            convo_result = (
                supabase.table("conversations")
                .select("*")
                .eq("encounter_id", encounter_id)
                .maybe_single()
                .execute()
            )
            conversation = convo_result.data if convo_result else None

            # 4. Get documents with entities
            docs_result = (
                supabase.table("documents")
                .select("*, extracted_entities(*)")
                .eq("encounter_id", encounter_id)
                .order("uploaded_at", desc=True)
                .execute()
            )
            documents = docs_result.data if docs_result else []

            # 5. Get AYUSH assessment
            ayush_result = (
                supabase.table("ayush_assessments")
                .select("*")
                .eq("encounter_id", encounter_id)
                .maybe_single()
                .execute()
            )
            ayush = ayush_result.data if ayush_result else None

        return {
            "patient": patient,
            "encounter_id": encounter_id,
            "conversation": conversation,
            "documents": documents,
            "ayush": ayush,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DoctorEditsPayload(BaseModel):
    conversation_id: str
    chief_complaint: str
    past_history: str
    drug_allergy_history: str
    family_history: str
    doctor_notes: str

@router.post("/doctor-notes")
def save_doctor_notes(payload: DoctorEditsPayload):
    """
    Saves doctor edits to the conversation state securely using the service role key.
    Bypasses RLS issues.
    """
    try:
        # First fetch the existing conversation to preserve the rest of its state
        convo_res = supabase.table("conversations").select("state").eq("id", payload.conversation_id).maybe_single().execute()
        if not convo_res or not convo_res.data:
            raise HTTPException(status_code=404, detail="Conversation not found.")
            
        current_state = convo_res.data.get("state") or {}
        
        # Merge new fields
        current_state["past_history"] = payload.past_history
        current_state["drug_allergy_history"] = payload.drug_allergy_history
        current_state["family_history"] = payload.family_history
        current_state["doctor_notes"] = payload.doctor_notes
        
        update_res = (
            supabase.table("conversations")
            .update({
                "chief_complaint": payload.chief_complaint,
                "state": current_state
            })
            .eq("id", payload.conversation_id)
            .execute()
        )
        
        return {"status": "success", "message": "Doctor notes saved."}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
