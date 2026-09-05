from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional

from app.supabase_client import supabase
from app.agent.graph import start_interview, submit_answer
from app.agent.persistence import load_conversation_state

router = APIRouter(tags=["conversation"])


class StartConversationRequest(BaseModel):
    auth_user_id: str


class AnswerRequest(BaseModel):
    auth_user_id: str
    encounter_id: str
    answer: str


@router.post("/start")
def start_conversation(req: StartConversationRequest):
    """
    Start a new pre-screening interview.
    Looks up the patient, gets/creates an in_progress encounter, and kicks off the agent.
    """
    try:
        # 1. Get internal patient id
        patient_result = (
            supabase.table("patients")
            .select("id")
            .eq("auth_user_id", req.auth_user_id)
            .maybe_single()
            .execute()
        )
        if not patient_result.data:
            raise HTTPException(status_code=404, detail="Patient not found.")
        
        internal_patient_id = patient_result.data["id"]

        # 2. Look up or create in_progress encounter
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

        # 3. Start the interview
        step = start_interview(encounter_id=encounter_id, user_id=req.auth_user_id)
        
        return {
            "encounter_id": encounter_id,
            "step": step
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import traceback

@router.post("/answer")
def answer_question(req: AnswerRequest):
    """
    Submit an answer to the current question and get the next step.
    """
    try:
        # Verify patient exists (security check)
        patient_result = (
            supabase.table("patients")
            .select("id")
            .eq("auth_user_id", req.auth_user_id)
            .maybe_single()
            .execute()
        )
        if not patient_result.data:
            raise HTTPException(status_code=404, detail="Patient not found.")

        # Advance the interview graph
        step = submit_answer(
            encounter_id=req.encounter_id,
            answer=req.answer,
            user_id=req.auth_user_id
        )
        
        return step

    except HTTPException:
        raise
    except Exception as e:
        err_msg = traceback.format_exc()
        print(f"ERROR IN /answer:\n{err_msg}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{err_msg}")


@router.get("/state/{encounter_id}")
def get_conversation_state(encounter_id: str):
    """
    Get the raw state of a conversation from the database (useful for resuming on page reload).
    """
    try:
        state = load_conversation_state(encounter_id)
        if not state:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return {"state": state}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File, Response
from pydantic import BaseModel
from app.services.speech import sarvam_tts, sarvam_asr

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
async def generate_tts(req: TTSRequest):
    """Generate text-to-speech audio."""
    try:
        audio_bytes = await sarvam_tts(req.text)
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"ERROR IN /tts:\n{err_msg}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asr")
async def transcribe_asr(audio: UploadFile = File(...)):
    """Transcribe speech-to-text."""
    try:
        audio_bytes = await audio.read()
        transcript = await sarvam_asr(audio_bytes)
        return {"text": transcript}
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"ERROR IN /asr:\n{err_msg}")
        raise HTTPException(status_code=500, detail=str(e))
