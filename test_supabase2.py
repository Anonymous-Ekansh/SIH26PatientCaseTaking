import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
try:
    res = supabase.table("encounters").select("id").eq("patient_id", "c5b8d8dd-3a68-4812-8b85-4a47344efd85").order("created_at", desc=True).limit(1).maybe_single().execute()
    print("Type of res:", type(res))
    if hasattr(res, 'data'):
        print("Data:", res.data)
    else:
        print("No data attribute")
except Exception as e:
    print("Exception:", type(e))
    print("Error:", e)
