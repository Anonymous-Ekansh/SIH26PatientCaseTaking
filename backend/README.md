# Hospital Kiosk Backend

FastAPI backend for the Hospital Kiosk application.

## Setup

1. **Install Python dependencies:**
   Make sure you have Python 3.9+ installed. Create a virtual environment and install requirements:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include your Supabase, Sarvam, and Groq API keys.

## Running Locally

Start the development server using `uvicorn`:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.
You can view the interactive API documentation at `http://localhost:8000/docs`.
