from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import user, jobs, applications, tracking
from app.database import init_db

app = FastAPI(title="LinkedIn Job Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(tracking.router)


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
