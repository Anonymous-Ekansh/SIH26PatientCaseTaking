from typing import Optional, TypedDict


class InterviewState(TypedDict):
    # bookkeeping
    section_order: list[str]
    current_section: str
    status: str
    questions_asked: int
    last_question: Optional[str]
    last_question_field: Optional[str]

    # chief complaint + classification
    chief_complaint: Optional[str]
    complaint_category: Optional[str]

    # HPI (branches by category)
    hpi_fields_needed: list[str]
    hpi: dict

    # single open-ended history sections
    past_history: Optional[str]
    drug_allergy_history: Optional[str]
    family_history: Optional[str]

    # red flags
    red_flag: bool
    red_flag_reasons: list[str]


SECTION_ORDER = ["chief_complaint", "hpi", "past_history", "drug_allergy_history", "family_history"]

# Chief-complaint category -> ordered HPI fields to collect for that category.
# "general" is the fallback bucket for anything that doesn't match a known pattern.
CATEGORY_HPI_FIELDS = {
    "chest_pain": ["onset", "character", "radiation", "severity", "associated_symptoms"],
    "respiratory": ["onset", "character", "severity", "associated_symptoms"],
    "gastrointestinal": ["onset", "character", "bowel_habit_change", "associated_symptoms"],
    "fever": ["onset", "pattern", "highest_temperature", "associated_symptoms"],
    "headache_neuro": ["onset", "character", "severity", "visual_changes", "associated_symptoms"],
    "musculoskeletal": ["onset", "character", "radiation", "aggravating_relieving", "severity"],
    "general": ["onset", "character", "severity", "associated_symptoms"],
}

FIELD_DESCRIPTIONS = {
    "onset": "when the symptom started",
    "character": "what the symptom feels like (e.g. sharp, dull, crushing, burning, throbbing)",
    "radiation": "whether the symptom spreads or moves to another part of the body",
    "severity": "how severe the symptom is, e.g. on a 1-10 scale",
    "associated_symptoms": "any other symptoms happening alongside the main complaint",
    "bowel_habit_change": "any change in bowel habits (diarrhea, constipation, blood, etc.)",
    "pattern": "whether the fever is continuous, intermittent, or comes with chills/rigors",
    "highest_temperature": "the highest temperature noted, if known",
    "visual_changes": "any vision changes, light sensitivity, or blurred vision",
    "aggravating_relieving": "what makes it better or worse (movement, rest, pressure)",
}

# Each of these history sections is asked as ONE open-ended question (per the
# decision to not sub-divide them into structured fields).
HISTORY_SECTION_PROMPTS = {
    "past_history": "Do you have any past medical conditions, surgeries, or hospitalizations we should know about?",
    "drug_allergy_history": "Are you currently taking any medications, and do you have any known drug or other allergies?",
    "family_history": "Does anyone in your immediate family have a history of major illnesses (e.g. heart disease, diabetes, cancer)?",
}

# Rule-based red-flag keyword combinations, checked before falling back to the LLM.
# "category": None means the rule applies regardless of complaint category.
RED_FLAG_RULES = [
    {
        "category": "chest_pain",
        "any_of": ["breathless", "sweating", "left arm", "jaw pain", "radiat"],
        "reason": "Chest pain with signs suggestive of cardiac origin",
    },
    {
        "category": "respiratory",
        "any_of": ["blue lips", "cannot speak", "gasping", "severe breathless"],
        "reason": "Respiratory distress signs",
    },
    {
        "category": "headache_neuro",
        "any_of": ["worst headache", "sudden", "confusion", "slurred", "weakness on one side"],
        "reason": "Headache with possible neurological emergency signs",
    },
    {
        "category": None,
        "any_of": ["unconscious", "unresponsive", "seizure", "severe bleeding"],
        "reason": "Generic emergency keyword detected",
    },
    {
    "category": "headache_neuro",
    "any_of": ["neck stiffness", "stiff neck", "neck pain", "photophobia", "light sensitivity", "rash"],
    "reason": "Headache with possible meningeal signs (neck stiffness/pain, photophobia, or rash)",
    }, 
]


def initial_state() -> InterviewState:
    return {
        "section_order": SECTION_ORDER,
        "current_section": "chief_complaint",
        "status": "start",
        "questions_asked": 0,
        "last_question": None,
        "last_question_field": None,
        "chief_complaint": None,
        "complaint_category": None,
        "hpi_fields_needed": [],
        "hpi": {},
        "past_history": None,
        "drug_allergy_history": None,
        "family_history": None,
        "red_flag": False,
        "red_flag_reasons": [],
    }


def get_next_missing_hpi_field(state: InterviewState) -> Optional[str]:
    for field in state["hpi_fields_needed"]:
        if state["hpi"].get(field) is None:
            return field
    return None