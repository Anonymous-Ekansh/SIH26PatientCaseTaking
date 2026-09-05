import os
from supabase import create_client, Client

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],  # service role — backend bypasses RLS, decides ownership itself
)


def save_conversation_state(encounter_id: str, user_id: str, state: dict) -> None:
    supabase.table("conversations").upsert({
        "id": encounter_id,
        "user_id": user_id,
        "status": state.get("status"),
        "chief_complaint": state.get("chief_complaint"),
        "complaint_category": state.get("complaint_category"),
        "red_flag": state.get("red_flag", False),
        "red_flag_reasons": state.get("red_flag_reasons", []),
        "state": state,
    }).execute()


def load_conversation_state(encounter_id: str) -> dict | None:
    result = supabase.table("conversations").select("state").eq("id", encounter_id).single().execute()
    return result.data["state"] if result.data else None