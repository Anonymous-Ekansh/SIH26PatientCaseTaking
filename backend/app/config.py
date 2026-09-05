import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
CONVERSATION_GROQ_API_KEY = os.environ.get("CONVERSATION_GROQ_API_KEY") or GROQ_API_KEY
CONVERSATION_SARVAM_API_KEY = os.environ.get("CONVERSATION_SARVAM_API_KEY") or SARVAM_API_KEY

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Warning: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
