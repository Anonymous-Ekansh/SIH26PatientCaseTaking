import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
a = supabase.table("ayush_assessments").select("*").limit(1).execute()
print("Ayush:", list(a.data[0].keys()) if a.data else "none")
