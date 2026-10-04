import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.supabase_client import supabase
from app.agent.nodes import _rule_based_red_flag, _call_llm, _parse_json
from app.routers.ct_kiosk import get_kiosk_user

router = APIRouter()

class SideEffectCheckRequest(BaseModel):
    participant_id: str
    visit_id: str
    question_text: str
    answer_text: str

def is_red_flag(text: str) -> bool:
    # Use rule-based and LLM-based logic similar to nodes.py
    # Fallback to general category
    is_flag, reasons = _rule_based_red_flag("general", text)
    if not is_flag:
        prompt = f"""You are a triage safety-check assistant for a clinical trial.
Decide if this patient's free-text side effect report suggests a medical emergency or a serious adverse event (SAE).
Only flag on genuine danger combinations (e.g. chest pain, difficulty breathing, severe bleeding, stroke symptoms).

Participant reported: {text}

Respond with ONLY valid JSON:
{{"red_flag": true or false, "reasons": ["short reason", ...]}}
"""
        parsed = _parse_json(_call_llm(prompt, max_tokens=250))
        if parsed:
            is_flag = bool(parsed.get("red_flag", False))
    return is_flag

@router.post("/check_flag")
def check_adverse_flag(req: SideEffectCheckRequest):
    # This is called via service role or kiosk token
    flagged = is_red_flag(req.answer_text)
    
    if flagged:
        # insert candidate AE
        # get study_id and site_id from visit
        v_res = supabase.table("ct_visits").select("study_id, site_id").eq("id", req.visit_id).single().execute()
        if v_res.data:
            supabase.table("ct_adverse_events").insert({
                "participant_id": req.participant_id,
                "study_id": v_res.data["study_id"],
                "site_id": v_res.data["site_id"],
                "status": "candidate",
                "source": "voice_flag",
                "verbatim_term": req.answer_text,
                "aware_at": "now()"
            }).execute()
            
    return {"flagged": flagged}
