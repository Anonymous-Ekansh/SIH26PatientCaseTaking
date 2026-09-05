from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.data.ayush_questions import AYUSH_QUESTIONS, compute_vaya_category
import os
from supabase import create_client, Client

router = APIRouter(tags=["ayush"])

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase = None

class AyushSubmission(BaseModel):
    encounter_id: str
    patient_id: str
    answers: Dict[str, Any]

@router.get("/questions")
def get_ayush_questions():
    return {"questions": AYUSH_QUESTIONS}

@router.post("/submit")
def submit_ayush_assessment(submission: AyushSubmission):
    answers = submission.answers
    dosha_score = {"vata": 0, "pitta": 0, "kapha": 0}
    pending_physical_exam = []

    for q in AYUSH_QUESTIONS:
        if q["id"] not in answers:
            continue
        if q["section"] == "Prakriti":
            for option in q.get("options", []):
                if option["value"] == answers[q["id"]]:
                    dosha_score[option["dosha"]] += 1
        if q.get("requires_physical_exam"):
            pending_physical_exam.append(q["id"])

    # Determine dominant dosha (or mixed if scores are equal, but simple max for now)
    dominant = max(dosha_score, key=dosha_score.get)

    bmi = None
    if "height" in answers and "weight" in answers:
        try:
            height_m = float(answers["height"]) / 100
            bmi = round(float(answers["weight"]) / (height_m ** 2), 1)
        except (ValueError, ZeroDivisionError):
            pass

    # Vaya calculation (default to 30 if age not explicitly provided)
    vaya = compute_vaya_category(int(answers.get("age", 30)))

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

    return result
