import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.supabase_client import supabase
from app.services.ocr import call_sarvam_ocr
from app.routers.documents import extract_entities

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_lab(
    study_id: str = Form(...),
    participant_id: str = Form(...),
    visit_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Read file bytes
        file_bytes = await file.read()
        filename = file.filename
        
        # Upload to Supabase bucket ct-files
        path = f"{study_id}/{participant_id}/{visit_id}/{filename}"
        try:
            supabase.storage.from_("ct-files").upload(path, file_bytes)
        except Exception as e:
            # Handle if already exists or other storage error by ignoring or logging
            logger.warning(f"Storage upload issue (might exist): {e}")
        
        # Call Sarvam OCR
        raw_text = await call_sarvam_ocr(file_bytes, filename)
        
        # Call Groq LLM Extraction
        entities = await extract_entities(raw_text)
        
        # Flag abnormal values
        abnormal_flags = []
        extracted_dict = {}
        if entities:
            for entity in entities:
                label = entity.get("label", "unknown")
                extracted_dict[label] = {
                    "value": entity.get("value"),
                    "unit": entity.get("unit"),
                    "ref_range": entity.get("ref_range"),
                    "is_abnormal": entity.get("is_abnormal", False)
                }
                if entity.get("is_abnormal"):
                    abnormal_flags.append(label)
                
        # Insert into ct_lab_documents
        res = supabase.table("ct_lab_documents").insert({
            "visit_id": visit_id,
            "file_path": path,
            "ocr_text": raw_text,
            "extracted": extracted_dict,
            "status": "extracted"
        }).execute()
        
        return {"status": "success", "abnormal_flags": abnormal_flags, "document_id": res.data[0]["id"] if res.data else None}
    except Exception as e:
        logger.error(f"Lab upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
