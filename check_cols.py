import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

for table in ["conversation_turns", "history_sections"]:
    res = supabase.table(table).select("*").limit(1).execute()
    print(f"{table}:", list(res.data[0].keys()) if res.data else "none")
