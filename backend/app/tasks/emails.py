from app.tasks.celery_app import celery_app
from app.services.email_sender.service import email_sender_service
from app.services.email_tracker.service import email_tracker_service
from app.database import sync_session_factory
from app.models.user import UserProfile
from app.models.application import JobApplication, EmailThread, EmailStatus, ApplicationStatus
from datetime import datetime
import uuid
from sqlalchemy import select


@celery_app.task(bind=True, max_retries=3)
def send_application_email_task(
    self,
    application_id: str,
    to_email: str | None = None,
    subject: str = "",
    body: str = "",
    attachment_path: str | None = None,
):
    return _send_email(application_id, to_email, subject, body, attachment_path)


@celery_app.task(bind=True)
def check_email_replies_task(self):
    return {"new_replies": _check_replies()}


def _send_email(
    application_id: str,
    to_email: str | None = None,
    subject: str = "",
    body: str = "",
    attachment_path: str | None = None,
) -> dict:
    session = sync_session_factory()
    try:
        app = session.get(JobApplication, application_id)
        if not app:
            return {"success": False, "error": "Application not found"}

        email = to_email or app.contact_email
        if not email:
            return {"success": False, "error": "No contact email"}

        result = email_sender_service.send_email_sync(
            to_email=email,
            subject=subject,
            body=body,
            attachment_path=attachment_path,
        )

        if result["success"]:
            app.email_status = EmailStatus.SENT
            app.application_status = ApplicationStatus.EMAIL_SENT
            app.email_subject = subject
            app.email_body = body
            app.sent_at = datetime.utcnow()
            app.last_contact_at = datetime.utcnow()

            thread = EmailThread(
                id=str(uuid.uuid4()),
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
            session.commit()

        return result
    finally:
        session.close()


def _check_replies() -> int:
    session = sync_session_factory()
    try:
        apps = session.execute(
            select(JobApplication).where(
                JobApplication.email_status.in_([EmailStatus.SENT, EmailStatus.DELIVERED, EmailStatus.OPENED])
            )
        ).scalars().all()
        if not apps:
            return 0

        replies = email_tracker_service.check_for_replies_sync()

        new_count = 0
        for reply in replies:
            for app in apps:
                if reply.get("in_reply_to") and app.email_subject:
                    if reply["in_reply_to"] in (app.email_subject or ""):
                        _save_reply(session, app.id, reply)
                        new_count += 1
                        break
                else:
                    from_addr = email_tracker_service.extract_email_address(reply.get("from_email", ""))
                    if from_addr and from_addr == app.contact_email:
                        _save_reply(session, app.id, reply)
                        new_count += 1
                        break

        session.commit()
        return new_count
    finally:
        session.close()


def _save_reply(session, application_id: str, reply_data: dict):
    app = session.get(JobApplication, application_id)
    if not app:
        return

    thread = EmailThread(
        id=str(uuid.uuid4()),
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
