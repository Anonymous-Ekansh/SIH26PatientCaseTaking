from app.supabase_client import supabase
import sys

res = supabase.table("patients").select("auth_user_id").limit(1).execute()
if res.data:
    uid = res.data[0]["auth_user_id"]
    print("Found UID:", uid)
else:
    print("No patients found")
