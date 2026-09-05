"""
Manual, interactive smoke test for the full interview graph — this DOES call
the Groq LLM (classification, question generation, red-flag fallback), so
make sure GROQ_API_KEY is set in backend/.env before running.

Run from the `backend` directory (same level as `app/`):

    cd backend
    python -m app.agent.manual_test

Type answers at each prompt. It ends when the graph reaches END (shows the
final collected state) or emergency_triage fires (shows the red-flag reasons).
"""

from .graph import start_interview, submit_answer

ENCOUNTER_ID = "manual-test-001"


def _print_step(step: dict) -> None:
    if step["paused"]:
        kind = step.get("type")
        if kind == "chief_complaint_request":
            print("\nQ: What brings you in today?")
        else:
            print(f"\n[field={step.get('field')}] Q: {step.get('question')}")
    else:
        final_state = step["final_state"]
        print("\n--- INTERVIEW COMPLETE ---")
        print(f"status: {final_state.get('status')}")
        print(f"category: {final_state.get('complaint_category')}")
        print(f"hpi: {final_state.get('hpi')}")
        print(f"past_history: {final_state.get('past_history')}")
        print(f"drug_allergy_history: {final_state.get('drug_allergy_history')}")
        print(f"family_history: {final_state.get('family_history')}")
        print(f"red_flag: {final_state.get('red_flag')} {final_state.get('red_flag_reasons')}")


def main() -> None:
    step = start_interview(ENCOUNTER_ID)
    _print_step(step)

    while step["paused"]:
        answer = input("> ").strip()
        step = submit_answer(ENCOUNTER_ID, answer)
        _print_step(step)


if __name__ == "__main__":
    main()