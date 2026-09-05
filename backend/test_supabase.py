from app.supabase_client import supabase

res = supabase.table("encounters").select("id").limit(1).execute()
if res.data:
    eid = res.data[0]["id"]
    print("Found encounter:", eid)
else:
    print("No encounters found")
