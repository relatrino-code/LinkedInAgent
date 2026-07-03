from app.tasks.celery_app import celery_app
from app.services.scraper import scraper_service
from app.services.email_finder.service import email_finder_service
from app.database import async_session_factory
from app.models.job import Job, JobSource, JobStatus
from app.models.application import JobApplication, ApplicationStatus, EmailStatus
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
        loop.run_until_complete(_save_jobs(results, query))
        return {"scraped": len(results), "query": query}
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=2)
def find_emails_for_applications_task(self):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        results = loop.run_until_complete(_find_and_update_emails())
        return {"updated": results}
    finally:
        loop.close()


async def _save_jobs(scraped_jobs: list, query: str):
    async with async_session_factory() as session:
        for scraped in scraped_jobs:
            existing = await session.execute(
                select(Job).where(
                    Job.title == scraped.title,
                    Job.company == scraped.company,
                    Job.job_url == scraped.job_url,
                )
            )
            if existing.scalar_one_or_none():
                continue

            job = Job(
                id=uuid.uuid4(),
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

        await session.commit()


async def _find_and_update_emails() -> int:
    async with async_session_factory() as session:
        result = await session.execute(
            select(JobApplication).where(
                JobApplication.contact_email.is_(None),
                JobApplication.application_status == ApplicationStatus.DISCOVERED,
            )
        )
        apps = result.scalars().all()
        updated = 0

        for app in apps:
            job = await session.get(Job, app.job_id)
            if not job:
                continue

            emails = await email_finder_service.find_emails(
                company_name=job.company,
                company_domain=job.company_website,
                job_title=job.job.title if hasattr(job, 'job') else None,
            )

            if emails:
                best = emails[0]
                app.contact_email = best["email"]
                app.contact_name = best["name"]
                app.contact_title = best.get("title")
                app.contact_linkedin = best.get("linkedin_url")
                app.application_status = ApplicationStatus.EMAIL_FOUND
                updated += 1

        await session.commit()
        return updated
