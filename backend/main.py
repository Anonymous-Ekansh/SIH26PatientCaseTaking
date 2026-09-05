import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents

logging.basicConfig(level=logging.WARNING)

app = FastAPI(title="Hospital Kiosk Backend")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://medikiosk-sih26.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/documents")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Hospital Kiosk API"}
