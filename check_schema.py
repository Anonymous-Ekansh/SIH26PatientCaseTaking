import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
# Just fetch one row to see keys
e = supabase.table("encounters").select("*").limit(1).execute()
print("Encounters:", list(e.data[0].keys()) if e.data else "none")
b = supabase.table("bookings").select("*").limit(1).execute()
print("Bookings:", list(b.data[0].keys()) if b.data else "none")
c = supabase.table("conversations").select("*").limit(1).execute()
print("Conversations:", list(c.data[0].keys()) if c.data else "none")
