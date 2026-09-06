import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
p = supabase.table("patients").select("*").limit(1).execute()
print("Patients:", list(p.data[0].keys()) if p.data else "none")
