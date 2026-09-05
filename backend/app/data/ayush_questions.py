# Multi-parameter questions use "also_informs" to map one answer to several
# Dashavidha parameters — asked once, scored against each listed parameter.
# "multi_select": True allows choosing more than one option.
# requires_physical_exam=True still flags "patient-reported, pending exam".

AYUSH_QUESTIONS = [

    # ---------- 1. PRAKRITI (constitution) — baseline, dosha-mapped ----------
    {"id": "build", "section": "Prakriti", "text": "How would you describe your body build?",
     "options": [{"value": "thin", "label": "Thin/light", "dosha": "vata"},
                 {"value": "medium", "label": "Medium/muscular", "dosha": "pitta"},
                 {"value": "heavy", "label": "Broad/heavy", "dosha": "kapha"}]},

    {"id": "skin", "section": "Prakriti", "text": "How is your skin usually?",
     "options": [{"value": "dry", "label": "Dry, rough", "dosha": "vata"},
                 {"value": "warm", "label": "Warm, sensitive, prone to rashes", "dosha": "pitta"},
                 {"value": "oily", "label": "Oily, smooth, cool", "dosha": "kapha"}]},

    {"id": "appetite", "section": "Prakriti", "text": "How is your appetite usually?",
     "options": [{"value": "irregular", "label": "Irregular, variable", "dosha": "vata"},
                 {"value": "strong", "label": "Strong, irritable if delayed", "dosha": "pitta"},
                 {"value": "steady", "label": "Steady but slow", "dosha": "kapha"}]},

    {"id": "sleep", "section": "Prakriti", "text": "How do you usually sleep?",
     "options": [{"value": "light", "label": "Light, easily disturbed", "dosha": "vata"},
                 {"value": "moderate", "label": "Moderate, sound", "dosha": "pitta"},
                 {"value": "deep", "label": "Deep, heavy, hard to wake", "dosha": "kapha"}]},

    # Serves Prakriti (baseline temperament) AND Sattva (psychological strength)
    {"id": "stress", "section": "Prakriti", "also_informs": ["Sattva"],
     "text": "How do you usually react under stress?",
     "options": [{"value": "anxious", "label": "Anxious, worried", "dosha": "vata"},
                 {"value": "irritable", "label": "Irritable, angry", "dosha": "pitta"},
                 {"value": "calm", "label": "Calm, composed", "dosha": "kapha"}]},

    # Serves Prakriti (mental nature) AND Sattva (focus)
    {"id": "memory", "section": "Prakriti", "also_informs": ["Sattva"],
     "text": "How are your memory and focus?",
     "options": [{"value": "quick_forget", "label": "Learn fast, forget fast; easily distracted", "dosha": "vata"},
                 {"value": "sharp", "label": "Sharp and clear", "dosha": "pitta"},
                 {"value": "slow_retain", "label": "Slow to learn, strong retention", "dosha": "kapha"}]},

    # ---------- 2. VIKRITI (current imbalance) ----------
    # NOTE: if the main complaint-driven flow already captured the chief
    # complaint + HPI, prefer referencing that instead of re-asking location.
    {"id": "recent_imbalance", "section": "Vikriti", "multi_select": True,
     "text": "What has felt most 'off' lately? (choose any)",
     "options": [{"value": "digestion", "label": "Digestion"},
                 {"value": "sleep", "label": "Sleep"},
                 {"value": "energy", "label": "Energy levels"},
                 {"value": "mood", "label": "Mood"},
                 {"value": "aches", "label": "Body aches"},
                 {"value": "none", "label": "Nothing unusual"}]},

    # ---------- 3+4+9. PHYSICAL STAMINA (merged) ----------
    # One question, mapped to Sara, Samhanana, and Vyayama Shakti — replaces
    # physical_resilience + strain_tolerance + exertion_tolerance.
    {"id": "stamina", "section": "Vyayama Shakti", "also_informs": ["Sara", "Samhanana"],
     "requires_physical_exam": True,
     "text": "How is your physical stamina and strength?",
     "options": [{"value": "strong", "label": "Strong — handle strain/exertion easily"},
                 {"value": "moderate", "label": "Moderate — tire after a while"},
                 {"value": "low", "label": "Tire quickly / get breathless or injured easily"}]},

    # ---------- 3. SARA (tissue quality) — physical exam ----------
    {"id": "tissue_signs", "section": "Sara", "multi_select": True, "requires_physical_exam": True,
     "text": "Have you noticed any of these recently? (choose any)",
     "options": [{"value": "hair_fall", "label": "Hair fall / early greying"},
                 {"value": "brittle_nails", "label": "Brittle nails"},
                 {"value": "dull_skin", "label": "Dull / very dry skin"},
                 {"value": "none", "label": "None of these"}]},

    # ---------- 5. PRAMANA (measurements) ----------
    {"id": "height", "section": "Pramana", "type": "number", "text": "Height (in cm)?"},
    {"id": "weight", "section": "Pramana", "type": "number", "text": "Weight (in kg)?"},

    # ---------- 6. SATMYA (adaptability) ----------
    {"id": "food_intolerance", "section": "Satmya", "multi_select": True,
     "text": "Any foods that consistently disagree with you? (choose any)",
     "options": [{"value": "dairy", "label": "Dairy"}, {"value": "spicy", "label": "Spicy"},
                 {"value": "fried", "label": "Fried/oily"}, {"value": "gluten", "label": "Wheat/gluten"},
                 {"value": "none", "label": "None"}]},

    {"id": "climate_tolerance", "section": "Satmya",
     "text": "Which weather bothers you more?",
     "options": [{"value": "hot_bothers", "label": "Hot weather"},
                 {"value": "cold_bothers", "label": "Cold weather"},
                 {"value": "both_fine", "label": "Both are fine"}]},

    {"id": "medicine_reactions", "section": "Satmya", "multi_select": True,
     "text": "Have you ever reacted badly to a medicine? (choose any)",
     "options": [{"value": "rash", "label": "Rash / itching"}, {"value": "swelling", "label": "Swelling"},
                 {"value": "breathing", "label": "Breathing difficulty"},
                 {"value": "stomach", "label": "Stomach upset"}, {"value": "none", "label": "Never"}]},

    # ---------- 8. AHARA SHAKTI (digestive capacity) ----------
    {"id": "digestion_quantity", "section": "Ahara Shakti",
     "text": "How much can you comfortably eat in one sitting?",
     "options": [{"value": "small", "label": "Small portions"},
                 {"value": "moderate", "label": "Moderate"},
                 {"value": "large", "label": "Large portions"}]},

    {"id": "hunger_frequency", "section": "Ahara Shakti",
     "text": "How soon after eating do you feel hungry again?",
     "options": [{"value": "soon", "label": "Within 2 hours"},
                 {"value": "normal", "label": "2–4 hours"},
                 {"value": "late", "label": "More than 4 hours"}]},

    {"id": "bowel", "section": "Ahara Shakti",
     "text": "How are your bowel movements usually?",
     "options": [{"value": "regular", "label": "Regular, daily"},
                 {"value": "constipated", "label": "Often constipated"},
                 {"value": "loose", "label": "Often loose"},
                 {"value": "irregular", "label": "Irregular"}]},

    {"id": "bloating", "section": "Ahara Shakti",
     "text": "Do you get bloating, gas, or heaviness after meals?",
     "options": [{"value": "often", "label": "Often"}, {"value": "sometimes", "label": "Sometimes"},
                 {"value": "rarely", "label": "Rarely"}]},

    # ---------- 10. VAYA (age) — computed, see compute_vaya_category() ----------

    # ---------- AHARA (diet) ----------
    {"id": "meal_timing", "section": "Ahara", "text": "Do you eat at fixed times or irregularly?",
     "options": [{"value": "fixed", "label": "Fixed times"}, {"value": "irregular", "label": "Irregular"}]},

    {"id": "diet_type", "section": "Ahara", "text": "Your diet type?",
     "options": [{"value": "veg", "label": "Vegetarian"}, {"value": "nonveg", "label": "Non-vegetarian"},
                 {"value": "vegan", "label": "Vegan"}]},

    {"id": "water_intake", "section": "Ahara", "text": "How much water per day?",
     "options": [{"value": "low", "label": "Less than 1 L"}, {"value": "medium", "label": "1–2 L"},
                 {"value": "high", "label": "More than 2 L"}]},

    {"id": "substances", "section": "Ahara", "multi_select": True,
     "text": "Do you consume any of these? (choose any)",
     "options": [{"value": "tea_coffee", "label": "Tea/coffee"}, {"value": "alcohol", "label": "Alcohol"},
                 {"value": "tobacco", "label": "Tobacco"}, {"value": "none", "label": "None"}]},

    {"id": "fasting", "section": "Ahara", "text": "Do you follow fasting practices?",
     "options": [{"value": "regular", "label": "Regularly"}, {"value": "occasional", "label": "Occasionally"},
                 {"value": "no", "label": "No"}]},

    # ---------- VIHARA (lifestyle) ----------
    {"id": "sleep_pattern", "section": "Vihara", "text": "Your sleep timing?",
     "options": [{"value": "early_regular", "label": "Early & regular"},
                 {"value": "late_regular", "label": "Late but regular"},
                 {"value": "irregular", "label": "Irregular"}]},

    # Serves Vihara AND Vyayama Shakti (replaces separate activity_level)
    {"id": "work_activity", "section": "Vihara", "also_informs": ["Vyayama Shakti"],
     "text": "How active is your typical day?",
     "options": [{"value": "sedentary", "label": "Mostly sitting/desk"},
                 {"value": "moderate", "label": "Moderately active"},
                 {"value": "active", "label": "Physically demanding"}]},

    {"id": "screen_time", "section": "Vihara", "text": "Daily screen time?",
     "options": [{"value": "low", "label": "Under 2 hours"}, {"value": "medium", "label": "2–5 hours"},
                 {"value": "high", "label": "Over 5 hours"}]},

    {"id": "seasonal_changes", "section": "Vihara",
     "text": "Does your health change with the seasons?",
     "options": [{"value": "yes", "label": "Yes, noticeably"}, {"value": "no", "label": "Not really"}]},
]


def compute_vaya_category(age: int) -> str:
    """Vaya (age) is computed, not asked — reuses the patient's existing age field."""
    if age <= 16:
        return "bala"      # childhood
    elif age <= 60:
        return "madhya"    # middle age
    else:
        return "vriddha"   # old age
