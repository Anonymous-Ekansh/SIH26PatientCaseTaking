# Each question has: id, section (one of the 10 Dashavidha Pariksha parameters,
# or "Ahara"/"Vihara"), text, and either options (multiple choice) or type ("text"/"number").
# requires_physical_exam=True marks parameters that need doctor confirmation —
# these should be visually flagged as "patient-reported, pending exam" in the summary UI.

AYUSH_QUESTIONS = [

    # ---------- 1. PRAKRITI (constitution) ----------
    {"id": "build", "section": "Prakriti", "text": "How would you describe your body build?",
     "options": [{"value": "thin", "label": "Thin/light", "dosha": "vata"},
                 {"value": "medium", "label": "Medium/muscular", "dosha": "pitta"},
                 {"value": "heavy", "label": "Broad/heavy", "dosha": "kapha"}]},

    {"id": "skin", "section": "Prakriti", "text": "How is your skin usually?",
     "options": [{"value": "dry", "label": "Dry, rough", "dosha": "vata"},
                 {"value": "warm", "label": "Warm, sensitive, prone to rashes", "dosha": "pitta"},
                 {"value": "oily", "label": "Oily, smooth, cool", "dosha": "kapha"}]},

    {"id": "appetite", "section": "Prakriti", "text": "How is your appetite generally?",
     "options": [{"value": "irregular", "label": "Irregular, variable", "dosha": "vata"},
                 {"value": "strong", "label": "Strong, sharp, irritable if delayed", "dosha": "pitta"},
                 {"value": "steady", "label": "Steady but slow", "dosha": "kapha"}]},

    {"id": "sleep", "section": "Prakriti", "text": "How do you usually sleep?",
     "options": [{"value": "light", "label": "Light, easily disturbed", "dosha": "vata"},
                 {"value": "moderate", "label": "Moderate, sound", "dosha": "pitta"},
                 {"value": "deep", "label": "Deep, heavy, hard to wake", "dosha": "kapha"}]},

    {"id": "stress", "section": "Prakriti", "text": "How do you react under stress?",
     "options": [{"value": "anxious", "label": "Anxious, worried", "dosha": "vata"},
                 {"value": "irritable", "label": "Irritable, angry", "dosha": "pitta"},
                 {"value": "calm", "label": "Calm, withdrawn", "dosha": "kapha"}]},

    {"id": "memory", "section": "Prakriti", "text": "How is your memory?",
     "options": [{"value": "quick_forget", "label": "Quick to learn, quick to forget", "dosha": "vata"},
                 {"value": "sharp", "label": "Sharp and clear", "dosha": "pitta"},
                 {"value": "slow_retain", "label": "Slow to learn, doesn't forget", "dosha": "kapha"}]},

    # ---------- 2. VIKRITI (current imbalance) ----------
    {"id": "digestion_change", "section": "Vikriti", "type": "text",
     "text": "Has your digestion been different lately compared to usual? How?"},
    {"id": "recent_changes", "section": "Vikriti", "type": "text",
     "text": "Any recent changes in your sleep, energy, or mood?"},
    {"id": "current_discomfort", "section": "Vikriti", "type": "text",
     "text": "Where do you feel discomfort or imbalance most right now?"},

    # ---------- 3. SARA (tissue quality) — needs physical confirmation ----------
    {"id": "skin_quality_current", "section": "Sara", "type": "text", "requires_physical_exam": True,
     "text": "How would you describe your skin right now — dry, glowing, dull?"},
    {"id": "hair_nails", "section": "Sara", "type": "text", "requires_physical_exam": True,
     "text": "Any recent hair fall, greying, or nail brittleness?"},
    {"id": "physical_resilience", "section": "Sara", "type": "text", "requires_physical_exam": True,
     "text": "Do you generally feel physically strong/resilient, or do you tire easily?"},

    # ---------- 4. SAMHANANA (structural compactness) — needs physical confirmation ----------
    {"id": "strain_tolerance", "section": "Samhanana", "type": "text", "requires_physical_exam": True,
     "text": "Do you feel able to tolerate physical strain well, or do you tire/get injured easily?"},

    # ---------- 5. PRAMANA (measurements) ----------
    {"id": "height", "section": "Pramana", "type": "number", "text": "What is your height (in cm)?"},
    {"id": "weight", "section": "Pramana", "type": "number", "text": "What is your weight (in kg)?"},

    # ---------- 6. SATMYA (adaptability/compatibility) ----------
    {"id": "food_intolerance", "section": "Satmya", "type": "text",
     "text": "Are there any foods that consistently disagree with you?"},
    {"id": "climate_tolerance", "section": "Satmya",
     "text": "Do you tolerate hot or cold weather well, or does one bother you more?",
     "options": [{"value": "hot_bothers", "label": "Hot weather bothers me more"},
                 {"value": "cold_bothers", "label": "Cold weather bothers me more"},
                 {"value": "both_fine", "label": "Both are fine"}]},
    {"id": "medicine_reactions", "section": "Satmya", "type": "text",
     "text": "Have you had unusual reactions to any medicines in the past?"},

    # ---------- 7. SATTVA (psychological strength) ----------
    {"id": "stress_handling", "section": "Sattva", "type": "text",
     "text": "How do you handle stress or pain — do you stay composed, or does it affect you strongly?"},
    {"id": "focus", "section": "Sattva", "type": "text",
     "text": "How is your focus and concentration generally?"},

    # ---------- 8. AHARA SHAKTI (digestive capacity) ----------
    {"id": "digestion_quantity", "section": "Ahara Shakti",
     "text": "How much food can you comfortably eat in one sitting?",
     "options": [{"value": "small", "label": "Small portions"},
                 {"value": "moderate", "label": "Moderate"},
                 {"value": "large", "label": "Large portions"}]},
    {"id": "hunger_frequency", "section": "Ahara Shakti", "type": "text",
     "text": "How long after eating do you feel hungry again?"},
    {"id": "bloating", "section": "Ahara Shakti", "type": "text",
     "text": "Do you experience bloating, gas, or heaviness after meals?"},
    {"id": "bowel", "section": "Ahara Shakti", "type": "text",
     "text": "How regular are your bowel movements?"},

    # ---------- 9. VYAYAMA SHAKTI (exercise capacity) ----------
    {"id": "activity_level", "section": "Vyayama Shakti", "type": "text",
     "text": "How much physical activity do you typically do in a day/week?"},
    {"id": "exertion_tolerance", "section": "Vyayama Shakti", "type": "text",
     "text": "How much exertion can you handle before feeling tired or breathless?"},

    # ---------- 10. VAYA (age) ----------
    # No question needed here — computed automatically from the patient's
    # existing age/DOB field at registration. See compute_vaya_category() below.

    # ---------- AHARA (diet) ----------
    {"id": "meal_timing", "section": "Ahara", "text": "Do you eat meals at fixed times or irregularly?",
     "options": [{"value": "fixed", "label": "Fixed times"}, {"value": "irregular", "label": "Irregular"}]},
    {"id": "diet_type", "section": "Ahara", "text": "What is your diet type?",
     "options": [{"value": "veg", "label": "Vegetarian"},
                 {"value": "nonveg", "label": "Non-vegetarian"},
                 {"value": "vegan", "label": "Vegan"}]},
    {"id": "water_intake", "section": "Ahara", "type": "text", "text": "How much water do you drink per day?"},
    {"id": "substances", "section": "Ahara", "type": "text",
     "text": "Do you consume tea, coffee, alcohol, or tobacco? How often?"},
    {"id": "food_cravings", "section": "Ahara", "type": "text",
     "text": "Any specific food cravings or aversions?"},
    {"id": "fasting", "section": "Ahara", "type": "text", "text": "Do you follow any fasting practices?"},

    # ---------- VIHARA (lifestyle/daily routine) ----------
    {"id": "sleep_pattern", "section": "Vihara", "type": "text",
     "text": "What time do you usually sleep and wake up, and how is your sleep quality?"},
    {"id": "work_nature", "section": "Vihara", "text": "What is the nature of your work?",
     "options": [{"value": "sedentary", "label": "Mostly sedentary/desk-based"},
                 {"value": "active", "label": "Physically active"}]},
    {"id": "screen_time", "section": "Vihara", "type": "text", "text": "How much screen time do you have daily?"},
    {"id": "routine_regularity", "section": "Vihara",
     "text": "Is your daily routine generally fixed or unpredictable?",
     "options": [{"value": "fixed", "label": "Fixed schedule"}, {"value": "variable", "label": "Unpredictable"}]},
    {"id": "seasonal_changes", "section": "Vihara", "type": "text",
     "text": "Have you noticed your health changing with the seasons?"},
]


def compute_vaya_category(age: int) -> str:
    """Vaya (age) is computed, not asked directly — reuses the patient's existing age field."""
    if age <= 16:
        return "bala"      # childhood
    elif age <= 60:
        return "madhya"    # middle age
    else:
        return "vriddha"   # old age
