import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
try:
    res = supabase.table("patients").select("*").eq("id", "c5b8d8dd-3a68-4812-8b85-4a47344efd85").maybe_single().execute()
    print("Type of res:", type(res))
    print("Data:", res.data)
except Exception as e:
    print("Exception:", type(e))
    print("Error:", e)
