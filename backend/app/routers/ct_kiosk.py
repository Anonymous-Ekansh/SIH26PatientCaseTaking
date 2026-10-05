import os
import json
import hmac
import hashlib
import base64
import time
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from app.supabase_client import supabase

router = APIRouter()

SECRET = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "fallback-secret-kiosk")

def create_jwt(payload):
    header = {"alg": "HS256", "typ": "JWT"}
    b64_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    b64_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    msg = f"{b64_header}.{b64_payload}"
    signature = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).digest()
    b64_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{msg}.{b64_signature}"

def verify_jwt(token):
    try:
        parts = token.split(".")
        if len(parts) != 3: return None
        msg = f"{parts[0]}.{parts[1]}"
        signature = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).digest()
        b64_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
        if parts[2] != b64_signature: return None
        
        payload_b64 = parts[1]
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        
        if payload.get("exp", 0) < time.time(): return None
        return payload
    except Exception:
        return None

def get_kiosk_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    payload = verify_jwt(token)
    if not payload or "participant_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["participant_id"]

class LoginRequest(BaseModel):
    subject_code: str
    pin: str

@router.post("/login")
def kiosk_login(req: LoginRequest):
    res = supabase.rpc("ct_verify_pin", {"p_code": req.subject_code, "p_pin": req.pin}).execute()
    participant_id = res.data
    if not participant_id:
        raise HTTPException(status_code=401, detail="Invalid PIN or subject code")
    
    # 30 min expiration
    token = create_jwt({"participant_id": participant_id, "exp": int(time.time()) + 1800})
    return {"token": token, "participant_id": participant_id}

@router.get("/me")
def get_me(pid: str = Depends(get_kiosk_user)):
    res = supabase.table("ct_participants").select("id, subject_code, study_id, status, withdrawn_at").eq("id", pid).single().execute()
    return res.data

@router.get("/consent")
def get_consent(pid: str = Depends(get_kiosk_user)):
    p = supabase.table("ct_participants").select("study_id").eq("id", pid).single().execute().data
    # Get latest consent version for the study
    res = supabase.table("ct_consent_versions").select("*").eq("study_id", p["study_id"]).order("version", desc=True).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No consent version found")
    return res.data[0]

class ConsentSubmit(BaseModel):
    version_id: str
    method: str
    read_aloud: bool

@router.post("/consent")
def submit_consent(req: ConsentSubmit, pid: str = Depends(get_kiosk_user)):
    # verify not withdrawn
    p = supabase.table("ct_participants").select("withdrawn_at").eq("id", pid).single().execute().data
    if p and p.get("withdrawn_at"):
        raise HTTPException(status_code=403, detail="Participant is withdrawn")
        
    supabase.table("ct_consents").insert({
        "participant_id": pid,
        "version_id": req.version_id,
        "consented_at": "now()",
        "method": req.method,
        "read_aloud": req.read_aloud
    }).execute()
    return {"status": "success"}

@router.post("/withdraw")
def withdraw_consent(pid: str = Depends(get_kiosk_user)):
    supabase.table("ct_participants").update({"withdrawn_at": "now()", "status": "withdrawn"}).eq("id", pid).execute()
    return {"status": "withdrawn"}

@router.get("/screening")
def get_screening(pid: str = Depends(get_kiosk_user)):
    p = supabase.table("ct_participants").select("study_id, withdrawn_at").eq("id", pid).single().execute().data
    if p and p.get("withdrawn_at"):
        raise HTTPException(status_code=403, detail="Participant is withdrawn")
        
    res = supabase.table("ct_form_templates").select("*").eq("study_id", p["study_id"]).eq("kind", "screening").execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No screening form found")
    return res.data[0]

class FormSubmit(BaseModel):
    form_template_id: str
    answers: dict
    source: str

@router.post("/screening")
def submit_screening(req: FormSubmit, pid: str = Depends(get_kiosk_user)):
    p = supabase.table("ct_participants").select("withdrawn_at").eq("id", pid).single().execute().data
    if p and p.get("withdrawn_at"):
        raise HTTPException(status_code=403, detail="Participant is withdrawn")
        
    # We need a visit_id to store form response. In screening, maybe we use a dummy or create a screening visit?
    # Wait,ct_form_responses requires visit_id. Let's create a visit if one doesn't exist.
    v_res = supabase.table("ct_visits").select("id").eq("participant_id", pid).eq("status", "scheduled").limit(1).execute()
    
    if not v_res.data:
        # Just create an ad-hoc visit for screening
        v_ins = supabase.table("ct_visits").insert({
            "participant_id": pid,
            "status": "done",
            "actual_on": "now()"
        }).execute()
        visit_id = v_ins.data[0]["id"]
    else:
        visit_id = v_res.data[0]["id"]
        # Do not mark done yet, coordinator will verify

    supabase.table("ct_form_responses").insert({
        "visit_id": visit_id,
        "form_template_id": req.form_template_id,
        "answers": req.answers,
        "source": req.source
    }).execute()
    return {"status": "success"}

@router.get("/next_visit")
def get_next_visit(pid: str = Depends(get_kiosk_user)):
    p = supabase.table("ct_participants").select("study_id, withdrawn_at").eq("id", pid).single().execute().data
    if p and p.get("withdrawn_at"):
        raise HTTPException(status_code=403, detail="Participant is withdrawn")
        
    v_res = supabase.table("ct_visits").select("*").eq("participant_id", pid).eq("status", "scheduled").order("scheduled_on").limit(1).execute()
    if not v_res.data:
        raise HTTPException(status_code=404, detail="No scheduled visit found")
    visit = v_res.data[0]
    
    # get templates
    templates = supabase.table("ct_form_templates").select("*").eq("study_id", p["study_id"]).in_("kind", ["visit", "side_effects", "dashavidha", "prakriti"]).execute().data
    return {"visit": visit, "templates": templates}

class VisitFormSubmit(BaseModel):
    visit_id: str
    form_template_id: str
    answers: dict
    source: str

@router.post("/visit_response")
def submit_visit_response(req: VisitFormSubmit, pid: str = Depends(get_kiosk_user)):
    p = supabase.table("ct_participants").select("withdrawn_at").eq("id", pid).single().execute().data
    if p and p.get("withdrawn_at"):
        raise HTTPException(status_code=403, detail="Participant is withdrawn")
        
    # verify visit belongs to participant
    v = supabase.table("ct_visits").select("id").eq("id", req.visit_id).eq("participant_id", pid).single().execute().data
    if not v:
        raise HTTPException(status_code=403, detail="Invalid visit")

    # If this is the Prakriti form, calculate scores
    t = supabase.table("ct_form_templates").select("kind").eq("id", req.form_template_id).single().execute().data
    if t and t["kind"] == "prakriti":
        from app.data.ayush_questions import AYUSH_QUESTIONS
        dosha_score = {"vata": 0, "pitta": 0, "kapha": 0}
        for q in AYUSH_QUESTIONS:
            if q["id"] in req.answers:
                ans_val = req.answers[q["id"]]
                ans_list = ans_val if isinstance(ans_val, list) else [ans_val]
                for val in ans_list:
                    # value matches label since Kiosk options are strings
                    for option in q.get("options", []):
                        if option["label"] == val and "dosha" in option:
                            dosha_score[option["dosha"]] += 1
        req.answers["prakriti_scores"] = dosha_score

    supabase.table("ct_form_responses").insert({
        "visit_id": req.visit_id,
        "form_template_id": req.form_template_id,
        "answers": req.answers,
        "source": req.source
    }).execute()
    return {"status": "success"}
