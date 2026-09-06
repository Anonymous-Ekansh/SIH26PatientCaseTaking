from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.data.ayush_questions import AYUSH_QUESTIONS, compute_vaya_category
import os
from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

router = APIRouter(tags=["ayush"])

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase = None

class StartAyushRequest(BaseModel):
    auth_user_id: str

class AyushSubmission(BaseModel):
    encounter_id: str
    patient_id: str
    answers: Dict[str, Any]

@router.post("/start")
def start_ayush(req: StartAyushRequest):
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase not configured")
            
        patient_result = (
            supabase.table("patients")
            .select("id, date_of_birth")
            .eq("auth_user_id", req.auth_user_id)
            .maybe_single()
            .execute()
        )
        if not patient_result.data:
            raise HTTPException(status_code=404, detail="Patient not found.")
            
        internal_patient_id = patient_result.data["id"]
        dob = patient_result.data.get("date_of_birth")
        
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
                    "mode": "ayush"
                })
                .execute()
            )
            encounter_id = new_encounter.data[0]["id"]

        return {
            "encounter_id": encounter_id,
            "patient_id": internal_patient_id,
            "date_of_birth": dob
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/questions")
def get_ayush_questions():
    return {"questions": AYUSH_QUESTIONS}

import json
from openai import OpenAI

def generate_ayush_summary(answers: dict, prakriti: dict, dominant: str, vaya: str, bmi: float) -> str:
    """Generates a professional clinical summary of the Ayush assessment using Groq LLM."""
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return "LLM Summarization unavailable: No GROQ_API_KEY configured."
            
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
        )
        
        prompt = f"""
        You are an expert Ayurvedic doctor. Please write a concise, professional clinical summary (1-2 paragraphs) of the following patient assessment:
        
        - Vaya (Age Category): {vaya}
        - BMI: {bmi if bmi else 'Not provided'}
        - Dosha Scores: {json.dumps(prakriti)}
        - Dominant Prakriti: {dominant.upper()}
        - Raw Answers: {json.dumps(answers)}
        
        Focus on their constitution, imbalances based on their answers, and briefly mention general lifestyle/dietary advice for this prakriti. Do NOT use markdown bolding/formatting excessively, keep it readable as a plain text clinical note.
        """
        
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "system", "content": "You are a helpful Ayurvedic AI."}, {"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"LLM Summarization failed: {e}")
        return f"Assessment captured. (LLM Summary failed: {e})"

@router.post("/submit")
def submit_ayush_assessment(submission: AyushSubmission):
    answers = submission.answers
    dosha_score = {"vata": 0, "pitta": 0, "kapha": 0}
    pending_physical_exam = []

    for q in AYUSH_QUESTIONS:
        if q["id"] not in answers:
            continue
            
        ans = answers[q["id"]]
        ans_list = ans if isinstance(ans, list) else [ans]
        
        # Determine if this question informs Prakriti (either as primary section or in also_informs)
        informs_prakriti = q["section"] == "Prakriti" or ("also_informs" in q and "Prakriti" in q["also_informs"])
        
        if informs_prakriti:
            for val in ans_list:
                for option in q.get("options", []):
                    if option["value"] == val and "dosha" in option:
                        dosha_score[option["dosha"]] += 1
                        
        if q.get("requires_physical_exam"):
            pending_physical_exam.append(q["id"])

    # Determine dominant dosha (or mixed if scores are equal, but simple max for now)
    dominant = max(dosha_score, key=dosha_score.get) if any(dosha_score.values()) else "unknown"

    bmi = None
    if "height" in answers and "weight" in answers:
        try:
            height_m = float(answers["height"]) / 100
            bmi = round(float(answers["weight"]) / (height_m ** 2), 1)
        except (ValueError, ZeroDivisionError, TypeError):
            pass

    # Vaya calculation (default to 30 if age not explicitly provided)
    age = answers.get("age")
    try:
        age_int = int(age) if age is not None else 30
    except (ValueError, TypeError):
        age_int = 30
    
    vaya = compute_vaya_category(age_int)
    
    # Generate LLM Summary
    llm_summary = generate_ayush_summary(answers, dosha_score, dominant, vaya, bmi)
    
    # Add llm_summary inside raw_answers so we don't need a DB migration
    answers["llm_summary"] = llm_summary

    result = {
        "prakriti_scores": dosha_score,
        "dominant_prakriti": dominant,
        "bmi": bmi,
        "vaya_category": vaya,
        "pending_physical_exam_fields": pending_physical_exam,
        "raw_answers": answers,
    }

    # Save to Supabase
    if supabase:
        try:
            # Check if one already exists for this encounter
            existing = supabase.table("ayush_assessments").select("id").eq("encounter_id", submission.encounter_id).execute()
            if existing.data and len(existing.data) > 0:
                # Update
                supabase.table("ayush_assessments").update({
                    "raw_answers": result["raw_answers"],
                    "prakriti_scores": result["prakriti_scores"],
                    "dominant_prakriti": result["dominant_prakriti"],
                    "bmi": result["bmi"],
                    "vaya_category": result["vaya_category"],
                    "pending_physical_exam_fields": result["pending_physical_exam_fields"],
                }).eq("encounter_id", submission.encounter_id).execute()
            else:
                # Insert
                supabase.table("ayush_assessments").insert({
                    "encounter_id": submission.encounter_id,
                    "patient_id": submission.patient_id,
                    "raw_answers": result["raw_answers"],
                    "prakriti_scores": result["prakriti_scores"],
                    "dominant_prakriti": result["dominant_prakriti"],
                    "bmi": result["bmi"],
                    "vaya_category": result["vaya_category"],
                    "pending_physical_exam_fields": result["pending_physical_exam_fields"],
                }).execute()
        except Exception as e:
            print(f"Error saving AYUSH assessment to Supabase: {e}")
            # We don't fail the request if saving fails, but log it
    else:
        print("Supabase client not initialized, cannot save AYUSH assessment.")

    return result
