from app.supabase_client import supabase
import json

res = supabase.table("conversations").select("*").limit(1).execute()
if res.data:
    print(json.dumps(res.data[0], indent=2))
else:
    print("No conversations found")
