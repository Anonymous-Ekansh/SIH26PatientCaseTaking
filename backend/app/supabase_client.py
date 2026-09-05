from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Initialize Supabase client using the service role key to bypass RLS
# Ensure these are provided in .env to prevent initialization errors
supabase: Client = create_client(SUPABASE_URL or "", SUPABASE_SERVICE_ROLE_KEY or "")
