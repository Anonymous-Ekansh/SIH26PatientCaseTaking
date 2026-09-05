from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from app.data.ayush_questions import AYUSH_QUESTIONS, compute_vaya_category

router = APIRouter(tags=["ayush"])

class AyushSubmission(BaseModel):
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

    dominant = max(dosha_score, key=dosha_score.get)

    bmi = None
    if "height" in answers and "weight" in answers:
        height_m = float(answers["height"]) / 100
        bmi = round(float(answers["weight"]) / (height_m ** 2), 1)

    vaya = compute_vaya_category(answers.get("age", 30))

    return {
        "prakriti_scores": dosha_score,
        "dominant_prakriti": dominant,
        "bmi": bmi,
        "vaya_category": vaya,
        "pending_physical_exam_fields": pending_physical_exam,
        "raw_answers": answers,
    }