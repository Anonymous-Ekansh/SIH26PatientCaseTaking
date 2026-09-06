import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
d = supabase.table("doctors").select("*").limit(1).execute()
print("Doctors:", list(d.data[0].keys()) if d.data else "none")
s = supabase.table("doctor_availability_slots").select("*").limit(1).execute()
print("Slots:", list(s.data[0].keys()) if s.data else "none")
