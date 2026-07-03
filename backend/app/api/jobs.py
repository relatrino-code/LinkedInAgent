from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload
import uuid

from app.database import get_db
from app.models.job import Job, JobSource, JobStatus
from app.models.application import JobApplication
from app.schemas.job import JobOut, JobDetail, JobFilterParams
from app.services.scraper import scraper_service
from app.tasks.jobs import scrape_jobs_task

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=dict)
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    title: str = None,
    company: str = None,
    location: str = None,
    source: str = None,
    status: str = None,
    search: str = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Job).where(Job.is_active == True)

    if title:
        query = query.where(Job.title.ilike(f"%{title}%"))
    if company:
        query = query.where(Job.company.ilike(f"%{company}%"))
    if location:
        query = query.where(Job.location.ilike(f"%{location}%"))
    if source:
        query = query.where(Job.source == source)
    if status:
        query = query.where(Job.status == status)
    if search:
        query = query.where(
            or_(
                Job.title.ilike(f"%{search}%"),
                Job.company.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%"),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    query = query.order_by(Job.discovered_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return {
        "items": [JobOut.model_validate(j) for j in jobs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{job_id}", response_model=JobDetail)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id)
        .options(joinedload(Job.applications))
    )
    job = result.unique().scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.post("/scrape")
async def trigger_scrape(
    query: str,
    location: str = "",
    sources: str = "linkedin,indeed",
):
    source_list = [s.strip() for s in sources.split(",") if s.strip()]
    task = scrape_jobs_task.delay(query=query, location=location, sources=source_list)
    return {"task_id": task.id, "status": "scraping_started", "query": query}


@router.post("/scrape-career-page")
async def scrape_career_page(url: str, company: str):
    jobs = await scraper_service.scrape_career_page(url)
    return {"scraped": len(jobs), "company": company, "jobs": jobs}


@router.get("/stats")
async def get_job_stats(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(Job.id)).where(Job.is_active == True))
    by_source = await db.execute(
        select(Job.source, func.count(Job.id))
        .where(Job.is_active == True)
        .group_by(Job.source)
    )
    by_status = await db.execute(
        select(Job.status, func.count(Job.id))
        .where(Job.is_active == True)
        .group_by(Job.status)
    )
    return {
        "total": total,
        "by_source": {row[0]: row[1] for row in by_source},
        "by_status": {row[0]: row[1] for row in by_status},
    }
