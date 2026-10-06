import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath('backend'))
from app.supabase_client import supabase

res = supabase.rpc("ct_verify_audit_chain").execute()
print(res.data)
