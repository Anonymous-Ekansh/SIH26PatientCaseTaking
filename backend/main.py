from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import documents

app = FastAPI(title="Hospital Kiosk Backend")

# Enable CORS for all origins for now (restrict later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents.router, prefix="/api/documents")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Hospital Kiosk API"}
