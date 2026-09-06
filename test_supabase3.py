import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from supabase import create_client
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
res = supabase.table("doctors").select("id").eq("auth_user_id", "54728560-63ce-42cb-b7b5-0c7ce6823ba4").maybe_single().execute()
print(type(res))
if res is None:
    print("res is None!")
else:
    print(res.data)
