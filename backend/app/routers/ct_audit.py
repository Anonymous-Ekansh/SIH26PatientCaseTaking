from fastapi import APIRouter
from app.supabase_client import supabase

router = APIRouter()

@router.post("/verify")
async def verify_audit_chain():
    try:
        res = supabase.rpc("ct_verify_audit_chain").execute()
        return {"status": "success", "result": res.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
