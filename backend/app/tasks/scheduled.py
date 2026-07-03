from app.tasks.celery_app import celery_app
from app.config import settings
from celery.schedules import crontab


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        settings.SCRAPE_INTERVAL_HOURS * 3600,
        run_scheduled_scrape.s(),
        name="run-scheduled-scrape",
    )
    sender.add_periodic_task(
        settings.EMAIL_CHECK_INTERVAL_MINUTES * 60,
        run_email_check.s(),
        name="run-email-check",
    )


@celery_app.task
def run_scheduled_scrape():
    from app.tasks.jobs import scrape_jobs_task
    from app.database import sync_session_factory
    from app.models.user import SearchQuery
    from sqlalchemy import select

    session = sync_session_factory()
    try:
        queries = session.execute(
            select(SearchQuery).where(SearchQuery.is_active == True)
        ).scalars().all()

        for q in queries:
            titles = [t.strip() for t in q.job_titles.split(",") if t.strip()]
            sources = q.sources.split(",") if q.sources else None
            companies = q.companies or ""
            locations = q.locations or ""
            keywords = q.keywords or ""
            experience_level = q.experience_level or ""

            for title in titles:
                scrape_jobs_task.delay(
                    query=title,
                    location=locations,
                    companies=companies,
                    experience_level=experience_level,
                    keywords=keywords,
                    sources=sources,
                )
    finally:
        session.close()


@celery_app.task
def run_email_check():
    from app.tasks.emails import check_email_replies_task
    check_email_replies_task.delay()
