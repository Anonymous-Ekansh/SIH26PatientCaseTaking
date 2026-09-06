import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
c = supabase.table("conversations").select("id, state").execute()
for row in c.data:
    state = row.get("state") or {}
    print(f"Conversation {row['id']}: has doctor_notes? {'doctor_notes' in state}")
    if 'doctor_notes' in state:
        print(f"  Notes: {state['doctor_notes']}")
