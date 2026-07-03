from app.tasks.celery_app import celery_app
from app.services.scraper import scraper_service
from app.database import sync_session_factory
from app.models.job import Job, JobSource, JobStatus
from app.models.application import JobApplication, ApplicationStatus
from datetime import datetime
import uuid
from sqlalchemy import select


@celery_app.task(bind=True, max_retries=3)
def scrape_jobs_task(self, query: str, location: str = "", sources: list[str] | None = None):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        results = loop.run_until_complete(scraper_service.search_jobs(query, location, sources))
        saved = _save_jobs(results, query)
        return {"scraped": len(results), "new": saved, "duplicates": len(results) - saved, "query": query}
    finally:
        loop.close()


def _save_jobs(scraped_jobs: list, query: str) -> int:
    saved = 0
    session = sync_session_factory()
    try:
        for scraped in scraped_jobs:
            existing = session.execute(
                select(Job).where(
                    Job.title == scraped.title,
                    Job.company == scraped.company,
                    Job.job_url == scraped.job_url,
                )
            ).scalar_one_or_none()
            if existing:
                continue

            job = Job(
                id=str(uuid.uuid4()),
                title=scraped.title,
                company=scraped.company,
                company_website=scraped.company_website,
                company_career_page=scraped.company_career_page,
                location=scraped.location,
                description=scraped.description,
                required_experience=scraped.required_experience,
                salary_range=scraped.salary_range,
                job_url=scraped.job_url,
                source=JobSource(scraped.source),
                status=JobStatus.DISCOVERED,
                search_query_used=query,
                posted_date=scraped.posted_date,
                metadata_json=scraped.metadata,
            )
            session.add(job)
            saved += 1

        session.commit()
        return saved
    finally:
        session.close()
