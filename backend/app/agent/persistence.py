# Conversation state persistence — saves/loads interview state to/from Supabase

from app.supabase_client import supabase


def save_conversation_state(encounter_id: str, user_id: str, state: dict) -> None:
    """Upsert the current interview state into the conversations table."""
    supabase.table("conversations").upsert(
        {
            "encounter_id": encounter_id,
            "user_id": user_id,
            "status": state.get("status"),
            "chief_complaint": state.get("chief_complaint"),
            "complaint_category": state.get("complaint_category"),
            "red_flag": state.get("red_flag", False),
            "red_flag_reasons": state.get("red_flag_reasons", []),
            "state": state,
        },
        on_conflict="encounter_id",
    ).execute()


def load_conversation_state(encounter_id: str) -> dict | None:
    """Load the saved interview state for an encounter."""
    result = (
        supabase.table("conversations")
        .select("state")
        .eq("encounter_id", encounter_id)
        .maybe_single()
        .execute()
    )
    return result.data["state"] if result.data else None