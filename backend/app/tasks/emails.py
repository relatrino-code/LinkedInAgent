from app.tasks.celery_app import celery_app
from app.services.email_sender.service import email_sender_service
from app.services.email_tracker.service import email_tracker_service
from app.database import async_session_factory
from app.models.application import JobApplication, EmailThread, EmailStatus, ApplicationStatus
from datetime import datetime
from sqlalchemy import select, or_


@celery_app.task(bind=True, max_retries=3)
def send_application_email_task(
    self,
    application_id: str,
    subject: str,
    body: str,
    attachment_path: str | None = None,
):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_send_email(application_id, subject, body, attachment_path))
        return result
    finally:
        loop.close()


@celery_app.task(bind=True)
def check_email_replies_task(self):
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_check_replies())
        return {"new_replies": result}
    finally:
        loop.close()


async def _send_email(
    application_id: str,
    subject: str,
    body: str,
    attachment_path: str | None = None,
) -> dict:
    async with async_session_factory() as session:
        app = await session.get(JobApplication, application_id)
        if not app or not app.contact_email:
            return {"success": False, "error": "Application or email not found"}

        result = await email_sender_service.send_email_with_tracking(
            to_email=app.contact_email,
            subject=subject,
            body=body,
            application_id=application_id,
            attachment_path=attachment_path,
            from_name=app.contact_name or None,
        )

        if result["success"]:
            app.email_status = EmailStatus.SENT
            app.application_status = ApplicationStatus.EMAIL_SENT
            app.email_subject = subject
            app.email_body = body
            app.sent_at = datetime.utcnow()
            app.last_contact_at = datetime.utcnow()

            thread = EmailThread(
                application_id=application_id,
                message_id=result.get("message_id"),
                from_email=app.contact_email or "",
                to_email=app.contact_email or "",
                subject=subject,
                body=body,
                is_incoming=False,
                sent_at=datetime.utcnow(),
            )
            session.add(thread)
            await session.commit()

        return result


async def _check_replies() -> int:
    async with async_session_factory() as session:
        result = await session.execute(
            select(JobApplication).where(
                JobApplication.email_status.in_([EmailStatus.SENT, EmailStatus.DELIVERED, EmailStatus.OPENED])
            )
        )
        active_apps = result.scalars().all()
        if not active_apps:
            return 0

        replies = await email_tracker_service.check_for_replies()

        new_count = 0
        for reply in replies:
            for app in active_apps:
                if reply.get("in_reply_to") and app.email_subject:
                    if reply["in_reply_to"] in (app.email_subject or ""):
                        await _save_reply(session, app.id, reply)
                        new_count += 1
                        break
                else:
                    from_addr = email_tracker_service.extract_email_address(reply.get("from_email", ""))
                    if from_addr and from_addr == app.contact_email:
                        await _save_reply(session, app.id, reply)
                        new_count += 1
                        break

        await session.commit()
        return new_count


async def _save_reply(session, application_id: str, reply_data: dict):
    app = await session.get(JobApplication, application_id)
    if not app:
        return

    thread = EmailThread(
        application_id=application_id,
        message_id=reply_data.get("message_id"),
        from_email=reply_data.get("from_email", ""),
        to_email=reply_data.get("to_email", ""),
        subject=reply_data.get("subject", ""),
        body=reply_data.get("body", ""),
        is_incoming=True,
        sent_at=reply_data.get("sent_at") or datetime.utcnow(),
    )
    session.add(thread)

    app.email_status = EmailStatus.REPLIED
    app.application_status = ApplicationStatus.REPLIED
    app.last_contact_at = datetime.utcnow()
    if not app.first_reply_at:
        app.first_reply_at = datetime.utcnow()
