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
    from app.database import async_session_factory
    from app.models.user import SearchQuery
    from sqlalchemy import select
    import asyncio

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        async def get_queries():
            async with async_session_factory() as session:
                result = await session.execute(
                    select(SearchQuery).where(SearchQuery.is_active == True)
                )
                return result.scalars().all()

        queries = loop.run_until_complete(get_queries())
        for q in queries:
            titles = [t.strip() for t in q.job_titles.split(",") if t.strip()]
            sources = q.sources.split(",") if q.sources else None
            for title in titles:
                scrape_jobs_task.delay(
                    query=title,
                    location=q.locations or "",
                    sources=sources,
                )
    finally:
        loop.close()


@celery_app.task
def run_email_check():
    from app.tasks.emails import check_email_replies_task
    check_email_replies_task.delay()
