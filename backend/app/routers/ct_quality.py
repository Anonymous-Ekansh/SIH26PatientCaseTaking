from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import logging
from app.supabase_client import supabase

router = APIRouter()
logger = logging.getLogger(__name__)

class VisitSaveRequest(BaseModel):
    visit_id: str
    actual_on: date
    status: str

@router.post("/visit_save")
async def save_visit(req: VisitSaveRequest):
    try:
        # Get visit and template
        res = supabase.table("ct_visits").select("*, ct_visit_templates(day_offset, window_days), ct_participants(study_id, enrolled_on)").eq("id", req.visit_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Visit not found")
        
        visit = res.data
        template = visit.get("ct_visit_templates")
        participant = visit.get("ct_participants")
        
        # Update visit
        supabase.table("ct_visits").update({
            "actual_on": req.actual_on.isoformat(),
            "status": req.status
        }).eq("id", req.visit_id).execute()
        
        # Automatic edit check for window deviation
        if template and participant and participant.get("enrolled_on") and req.actual_on:
            enrolled_on = datetime.strptime(participant["enrolled_on"], "%Y-%m-%d").date()
            # target date is enrolled_on + day_offset
            day_offset = template.get("day_offset", 0)
            window = template.get("window_days", 0)
            
            # calculate difference in days between actual_on and enrolled_on
            diff = (req.actual_on - enrolled_on).days
            
            if diff < (day_offset - window) or diff > (day_offset + window):
                # Create a query
                query_text = f"System Edit Check: Visit actual date ({req.actual_on}) is outside the allowed window (Target: Day {day_offset} ± {window} days)."
                
                # Check if this exact query already exists to avoid duplicates
                existing = supabase.table("ct_queries").select("id").eq("study_id", participant["study_id"]).eq("text", query_text).execute()
                if not existing.data:
                    supabase.table("ct_queries").insert({
                        "study_id": participant["study_id"],
                        "text": query_text,
                        "status": "open",
                        "opened_at": datetime.now().isoformat()
                    }).execute()
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Visit save failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
