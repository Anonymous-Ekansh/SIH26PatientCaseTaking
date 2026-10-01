from fastapi import APIRouter
from app.supabase_client import get_supabase_client

router = APIRouter()

@router.post("/run")
async def run_alerts():
    supabase = get_supabase_client()
    try:
        # We call the RPC function to run alerts
        res = supabase.rpc("ct_run_alerts").execute()
        return {"status": "success", "message": "Alerts checked."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
