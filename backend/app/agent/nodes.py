import json
import time
from typing import Optional, Tuple

from openai import OpenAI, RateLimitError
from langgraph.types import interrupt
from app.config import CONVERSATION_GROQ_API_KEY

from .state import (
    InterviewState,
    CATEGORY_HPI_FIELDS,
    FIELD_DESCRIPTIONS,
    HISTORY_SECTION_PROMPTS,
    RED_FLAG_RULES,
    get_next_missing_hpi_field,
)

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=CONVERSATION_GROQ_API_KEY,
)

MODEL_NAME = "qwen-2.5-32b"  # Groq's qwen model (or you can use llama-3.1-8b-instant for speed)

# Which history section comes after the one just captured. None = last one,
# moves on to the final safety check instead of another open section.
HISTORY_SECTION_ADVANCE = {
    "past_history": "drug_allergy_history",
    "drug_allergy_history": "family_history",
    "family_history": None,
}


def _call_llm(prompt: str, max_tokens: int) -> Optional[str]:
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except RateLimitError:
            time.sleep(6)
    return None


def _parse_json(raw_text: Optional[str]) -> dict:
    if not raw_text:
        return {}
    cleaned = raw_text.strip().strip("`").replace("json", "", 1).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {}


# ---------------------------------------------------------------------------
# Chief complaint + classification
# ---------------------------------------------------------------------------

def ask_chief_complaint(state: InterviewState) -> dict:
    # Pauses here. FastAPI's /start route will send back the patient's
    # typed/spoken complaint, which becomes the value of `chief_complaint`.
    complaint = interrupt({"type": "chief_complaint_request"})
    return {"chief_complaint": complaint, "status": "complaint_captured"}


# Cheap keyword pass tried before spending an LLM call on classification.
_KEYWORD_CATEGORY_MAP = {
    "chest_pain": ["chest pain", "chest tightness", "chest pressure"],
    "respiratory": ["cough", "breathless", "shortness of breath", "wheeze"],
    "gastrointestinal": ["stomach", "abdominal", "vomit", "diarrhea", "nausea"],
    "fever": ["fever", "temperature", "chills"],
    "headache_neuro": ["headache", "migraine", "dizziness", "numbness"],
    "musculoskeletal": ["joint pain", "back pain", "muscle pain", "sprain"],
}


def classify_complaint(state: InterviewState) -> dict:
    complaint_lower = (state["chief_complaint"] or "").lower()
    categories = list(CATEGORY_HPI_FIELDS.keys())

    category = next(
        (cat for cat, kws in _KEYWORD_CATEGORY_MAP.items() if any(kw in complaint_lower for kw in kws)),
        None,
    )

    if category is None:
        prompt = f"""Classify this patient's chief complaint into exactly one category from
this list: {categories}.

Chief complaint: {state['chief_complaint']}

Respond with ONLY valid JSON, no other text:
{{"category": "..."}}
"""
        parsed = _parse_json(_call_llm(prompt, max_tokens=50))
        candidate = parsed.get("category")
        category = candidate if candidate in categories else "general"

    fields_needed = CATEGORY_HPI_FIELDS.get(category, CATEGORY_HPI_FIELDS["general"])
    return {
        "complaint_category": category,
        "hpi_fields_needed": fields_needed,
        "hpi": {field: None for field in fields_needed},
        "current_section": "hpi",
        "status": "complaint_classified",
    }


# ---------------------------------------------------------------------------
# HPI (branches by category)
# ---------------------------------------------------------------------------

def generate_hpi_question(state: InterviewState) -> dict:
    target_field = get_next_missing_hpi_field(state)
    field_description = FIELD_DESCRIPTIONS[target_field]
    known = {k: v for k, v in state["hpi"].items() if v is not None}

    prompt = f"""You are a doctor taking a patient's clinical history.
Chief complaint: {state['chief_complaint']}
Complaint category: {state['complaint_category']}
Information gathered so far: {known}

Ask ONE specific question to find out: {field_description}
Respond with ONLY valid JSON, no other text:
{{"question": "...", "options": ["...", "...", "..."]}}
"""
    parsed = _parse_json(_call_llm(prompt, max_tokens=200))
    question = parsed.get("question", "Can you tell me more?")

    return {"last_question": question, "last_question_field": target_field, "status": "question_asked"}


def capture_hpi_answer(state: InterviewState) -> dict:
    field = state["last_question_field"]
    # Pauses here too. FastAPI's /answer route resumes with the patient's answer.
    answer = interrupt({"type": "answer_request", "question": state["last_question"], "field": field})
    updated_hpi = dict(state["hpi"])
    updated_hpi[field] = answer
    return {"hpi": updated_hpi, "questions_asked": state["questions_asked"] + 1, "status": "answer_captured"}


# ---------------------------------------------------------------------------
# Red-flag detection: rule-based first, LLM fallback
# ---------------------------------------------------------------------------

def _rule_based_red_flag(category: Optional[str], text_blob: str) -> Tuple[bool, list]:
    text_blob = text_blob.lower()
    reasons = []
    for rule in RED_FLAG_RULES:
        if rule["category"] is not None and rule["category"] != category:
            continue
        if any(kw in text_blob for kw in rule["any_of"]):
            reasons.append(rule["reason"])
    return (len(reasons) > 0, reasons)


def hpi_red_flag_check(state: InterviewState) -> dict:
    text_blob = " ".join(
        [state["chief_complaint"] or ""] + [str(v) for v in state["hpi"].values() if v]
    )
    is_red_flag, reasons = _rule_based_red_flag(state["complaint_category"], text_blob)

    if not is_red_flag:
        prompt = f"""You are a triage safety-check assistant. Decide if this patient's
current information suggests a medical emergency. Only flag on genuine danger combinations,
not single mild symptoms.

Chief complaint: {state['chief_complaint']}
Category: {state['complaint_category']}
HPI so far: {state['hpi']}

Respond with ONLY valid JSON:
{{"red_flag": true or false, "reasons": ["short reason", ...]}}
"""
        parsed = _parse_json(_call_llm(prompt, max_tokens=250))
        if parsed:
            is_red_flag = bool(parsed.get("red_flag", False))
            reasons = parsed.get("reasons", [])
        else:
            danger = ["chest pain", "difficulty breathing", "stroke"]
            if (state["chief_complaint"] or "").lower() in danger:
                is_red_flag, reasons = True, ["LLM check unavailable — defaulting to caution"]

    return {"red_flag": is_red_flag, "red_flag_reasons": reasons, "status": "hpi_red_flag_checked"}


def route_after_hpi_red_flag(state: InterviewState) -> str:
    if state["red_flag"]:
        return "emergency"
    if get_next_missing_hpi_field(state) is None:
        return "next_section"
    return "continue"


# ---------------------------------------------------------------------------
# Single open-ended history sections (past_history, drug_allergy_history,
# family_history) — each is one question, per the decision not to sub-divide.
# ---------------------------------------------------------------------------

def ask_open_section(state: InterviewState) -> dict:
    section = state["current_section"]
    if section == "hpi":
        section = "past_history"  # first history section after HPI finishes
    question = HISTORY_SECTION_PROMPTS[section]
    return {
        "last_question": question,
        "last_question_field": section,
        "current_section": section,
        "status": f"{section}_asked",
    }


def capture_open_section(state: InterviewState) -> dict:
    section = state["last_question_field"]
    answer = interrupt({"type": "answer_request", "question": state["last_question"], "field": section})
    next_section = HISTORY_SECTION_ADVANCE[section]
    return {
        section: answer,
        "current_section": next_section or section,
        "questions_asked": state["questions_asked"] + 1,
        "status": f"{section}_captured",
    }


def route_after_section(state: InterviewState) -> str:
    section_just_captured = state["last_question_field"]
    next_section = HISTORY_SECTION_ADVANCE[section_just_captured]
    return next_section or "final_check"


# ---------------------------------------------------------------------------
# Final safety check — reruns rule+LLM check over the complete intake, since
# past/drug history can surface risk that HPI alone didn't (e.g. known
# cardiac disease plus today's chest pain).
# ---------------------------------------------------------------------------

def final_red_flag_check(state: InterviewState) -> dict:
    text_blob = " ".join(
        [state["chief_complaint"] or ""]
        + [str(v) for v in state["hpi"].values() if v]
        + [
            state["past_history"] or "",
            state["drug_allergy_history"] or "",
            state["family_history"] or "",
        ]
    )
    is_red_flag, reasons = _rule_based_red_flag(state["complaint_category"], text_blob)

    if not is_red_flag:
        prompt = f"""You are a triage safety-check assistant reviewing a completed intake.
Only flag on genuine danger combinations, not single mild findings. If red_flag is true,
you MUST include at least one specific reason — never return true with an empty reasons list.

Chief complaint: {state['chief_complaint']}
HPI: {state['hpi']}
Past history: {state['past_history']}
Drug/allergy history: {state['drug_allergy_history']}
Family history: {state['family_history']}

Respond with ONLY valid JSON:
{{"red_flag": true or false, "reasons": ["short reason", ...]}}
"""
        parsed = _parse_json(_call_llm(prompt, max_tokens=250))
        if parsed:
            is_red_flag = bool(parsed.get("red_flag", False))
            reasons = parsed.get("reasons", [])
            if is_red_flag and not reasons:
                reasons = ["Model flagged this case but did not provide a reason — flag kept out of caution, recommend manual review."]

    return {"red_flag": is_red_flag, "red_flag_reasons": reasons, "status": "final_check_complete"}

def route_after_final_check(state: InterviewState) -> str:
    return "emergency" if state["red_flag"] else "done"


def emergency_triage(state: InterviewState) -> dict:
    return {"status": "emergency_flagged"}