from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import aiofiles
import os
import uuid

from app.database import get_db
from app.models.user import UserProfile, SearchQuery
from app.schemas.user import (
    UserProfileCreate, UserProfileUpdate, UserProfileOut,
    SearchQueryCreate, SearchQueryOut,
)

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile", response_model=UserProfileOut)
async def get_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No profile found. Create one first.")
    return profile


@router.post("/profile", response_model=UserProfileOut)
async def create_profile(data: UserProfileCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Profile already exists. Use PUT to update.")

    profile = UserProfile(
        id=str(uuid.uuid4()),
        name=data.name,
        email=data.email,
        phone=data.phone,
        linkedin_url=data.linkedin_url,
        portfolio_url=data.portfolio_url,
        current_company=data.current_company,
        current_title=data.current_title,
        years_experience=data.years_experience,
        skills=data.skills,
        cover_letter_template=data.cover_letter_template,
        preferences=data.preferences or {},
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.put("/profile", response_model=UserProfileOut)
async def update_profile(data: UserProfileUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/profile/resume")
async def upload_resume(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")

    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "resume.pdf")[1]
    filename = f"resume_{profile.id}{ext}"
    filepath = os.path.join(upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    profile.resume_path = filepath
    await db.commit()
    return {"filename": filename, "path": filepath}


@router.post("/search-queries", response_model=SearchQueryOut)
async def create_search_query(data: SearchQueryCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Create a profile first")

    query = SearchQuery(
        id=str(uuid.uuid4()),
        user_id=profile.id,
        job_titles=data.job_titles,
        companies=data.companies,
        locations=data.locations,
        experience_level=data.experience_level,
        keywords=data.keywords,
        sources=data.sources,
    )
    db.add(query)
    await db.commit()
    await db.refresh(query)
    return query


@router.get("/search-queries", response_model=list[SearchQueryOut])
async def list_search_queries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SearchQuery))
    return result.scalars().all()


@router.delete("/search-queries/{query_id}")
async def delete_search_query(query_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SearchQuery).where(SearchQuery.id == query_id))
    query = result.scalar_one_or_none()
    if not query:
        raise HTTPException(404, "Search query not found")
    await db.delete(query)
    await db.commit()
    return {"ok": True}
