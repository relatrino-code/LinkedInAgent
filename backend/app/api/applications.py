from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload
import uuid

from app.database import get_db
from app.models.job import Job
from app.models.user import UserProfile
from app.models.application import JobApplication, EmailThread, EmailStatus, ApplicationStatus, Contact
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationOut, ApplicationDetail,
    EmailSendRequest, EmailReplyRequest, EmailThreadOut, ContactOut, ContactSelect,
)
from app.tasks.emails import send_application_email_task
from app.services.email_sender.service import email_sender_service
from app.services.email_finder.service import email_finder_service

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("", response_model=dict)
async def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    company: str = None,
    status: str = None,
    email_status: str = None,
    search: str = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    query = select(JobApplication).join(Job, JobApplication.job_id == Job.id, isouter=True)

    if company:
        query = query.where(Job.company.ilike(f"%{company}%"))
    if status:
        query = query.where(JobApplication.application_status == status)
    if email_status:
        query = query.where(JobApplication.email_status == email_status)
    if search:
        query = query.where(
            or_(
                Job.company.ilike(f"%{search}%"),
                Job.title.ilike(f"%{search}%"),
                JobApplication.contact_name.ilike(f"%{search}%"),
                JobApplication.contact_email.ilike(f"%{search}%"),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    sort_col = getattr(JobApplication, sort_by, JobApplication.updated_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    apps = result.unique().scalars().all()

    items = []
    for app in apps:
        out = ApplicationOut.model_validate(app)
        job = await db.get(Job, app.job_id)
        items.append({**out.model_dump(), "job": {"title": job.title, "company": job.company} if job else None})

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{app_id}", response_model=ApplicationDetail)
async def get_application(app_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobApplication)
        .where(JobApplication.id == app_id)
        .options(joinedload(JobApplication.job), joinedload(JobApplication.email_threads))
    )
    app = result.unique().scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    out = ApplicationOut.model_validate(app).model_dump()
    out["job"] = {"title": app.job.title, "company": app.job.company} if app.job else None
    out["email_threads"] = [EmailThreadOut.model_validate(t).model_dump() for t in (app.email_threads or [])]
    return out


@router.post("", response_model=ApplicationOut)
async def create_application(data: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, data.job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    app = JobApplication(
        id=str(uuid.uuid4()),
        job_id=data.job_id,
        contact_name=data.contact_name,
        contact_title=data.contact_title,
        contact_email=data.contact_email,
        contact_linkedin=data.contact_linkedin,
        email_subject=data.email_subject,
        email_body=data.email_body,
        notes=data.notes,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.put("/{app_id}", response_model=ApplicationOut)
async def update_application(app_id: str, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    app = await db.get(JobApplication, app_id)
    if not app:
        raise HTTPException(404, "Application not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(app, field, value)

    await db.commit()
    await db.refresh(app)
    return app


@router.post("/{app_id}/find-emails")
async def find_emails_for_application(app_id: str, db: AsyncSession = Depends(get_db)):
    app = await db.get(JobApplication, app_id)
    if not app:
        raise HTTPException(404, "Application not found")

    job = await db.get(Job, app.job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    contacts = await email_finder_service.find_emails(
        company_name=job.company,
        company_domain=job.company_website,
        job_title=job.title,
        job_url=job.job_url,
    )

    saved_contacts = []
    for c in contacts:
        existing = await db.execute(
            select(Contact).where(
                Contact.application_id == app_id,
                Contact.email == c.get("email", ""),
                Contact.linkedin_url == c.get("linkedin_url"),
            )
        )
        if existing.scalar_one_or_none():
            continue
        contact = Contact(
            id=str(uuid.uuid4()),
            application_id=app_id,
            name=c["name"],
            title=c.get("title"),
            email=c.get("email") or None,
            linkedin_url=c.get("linkedin_url"),
            source=c.get("source"),
            confidence=c.get("confidence", 0),
        )
        db.add(contact)
        saved_contacts.append(contact)

    if saved_contacts:
        app.application_status = ApplicationStatus.EMAIL_FOUND
    if contacts and not app.contact_email:
        best = contacts[0]
        app.contact_email = best.get("email") or None
        app.contact_name = best["name"]
        app.contact_title = best.get("title")
        app.contact_linkedin = best.get("linkedin_url")

    await db.commit()

    result = [ContactOut.model_validate(c) for c in saved_contacts]
    return {"found": len(saved_contacts), "contacts": result}


@router.get("/{app_id}/contacts", response_model=list[ContactOut])
async def list_contacts(app_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Contact).where(Contact.application_id == app_id).order_by(Contact.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{app_id}/select-contacts")
async def select_contacts(app_id: str, data: ContactSelect, db: AsyncSession = Depends(get_db)):
    await db.execute(
        select(Contact).where(Contact.application_id == app_id).update({Contact.selected: False})
    )
    if data.contact_ids:
        await db.execute(
            select(Contact).where(Contact.id.in_(data.contact_ids)).update({Contact.selected: True})
        )
    await db.commit()
    return {"selected": len(data.contact_ids)}


@router.post("/{app_id}/send-email")
async def send_application_email(app_id: str, data: EmailSendRequest, db: AsyncSession = Depends(get_db)):
    app = await db.get(JobApplication, app_id)
    if not app:
        raise HTTPException(404, "Application not found")

    job = await db.get(Job, app.job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    profile_result = await db.execute(select(UserProfile).limit(1))
    profile = profile_result.scalar_one_or_none()

    subject = data.subject
    body = data.body

    if not subject or not body:
        if profile:
            if not subject and profile.email_subject_template:
                subject = profile.email_subject_template.replace("{{company}}", job.company).replace("{{role}}", job.title)
            if not body and profile.email_body_template:
                body = profile.email_body_template.replace("{{company}}", job.company).replace("{{role}}", job.title)
            if not subject and profile.cover_letter_template:
                subject = f"Application for {job.title} at {job.company}"

    if not subject:
        subject = f"Application for {job.title} at {job.company}"
    if not body:
        body = f"Hi, I'm interested in the {job.title} position at {job.company}. Please find my CV attached."

    contacts_result = await db.execute(
        select(Contact).where(Contact.application_id == app_id, Contact.selected == True)
    )
    selected_contacts = contacts_result.scalars().all()

    if not selected_contacts:
        if app.contact_email:
            selected_contacts = [{"id": None, "email": app.contact_email}]

    tasks = []
    for contact in selected_contacts:
        to_email = contact.get("email") if isinstance(contact, dict) else contact.email
        if not to_email:
            continue
        task = send_application_email_task.delay(
            application_id=app_id,
            to_email=to_email,
            subject=subject,
            body=body,
            attachment_path=profile.resume_path if profile else None,
        )
        cid = contact.get("id") if isinstance(contact, dict) else contact.id
        tasks.append({"contact_id": cid, "task_id": task.id, "email": to_email})

    if not tasks:
        raise HTTPException(400, "No contacts with email selected")

    return {"tasks": tasks, "status": "queued"}


@router.get("/{app_id}/threads", response_model=list[EmailThreadOut])
async def get_email_thread(app_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmailThread)
        .where(EmailThread.application_id == app_id)
        .order_by(EmailThread.sent_at.asc())
    )
    return result.scalars().all()


@router.post("/{app_id}/reply")
async def reply_to_email(app_id: str, data: EmailReplyRequest, db: AsyncSession = Depends(get_db)):
    app = await db.get(JobApplication, app_id)
    if not app or not app.contact_email:
        raise HTTPException(404, "Application or contact email not found")

    result = await email_sender_service.send_email(
        to_email=app.contact_email,
        subject=f"Re: {app.email_subject or 'Job Application'}",
        body=data.body,
    )

    if result["success"]:
        thread = EmailThread(
            application_id=app_id,
            message_id=result.get("message_id"),
            from_email=app.contact_email or "",
            to_email=app.contact_email or "",
            subject=f"Re: {app.email_subject}",
            body=data.body,
            is_incoming=False,
            sent_at=datetime.utcnow(),
        )
        db.add(thread)
        app.last_contact_at = datetime.utcnow()
        app.follow_up_count += 1
        await db.commit()

    return result


@router.get("/stats")
async def get_application_stats(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(JobApplication.id)))
    by_status = await db.execute(
        select(JobApplication.application_status, func.count(JobApplication.id))
        .group_by(JobApplication.application_status)
    )
    by_email_status = await db.execute(
        select(JobApplication.email_status, func.count(JobApplication.id))
        .group_by(JobApplication.email_status)
    )
    replied = await db.scalar(
        select(func.count(JobApplication.id))
        .where(JobApplication.email_status == EmailStatus.REPLIED)
    )

    return {
        "total": total,
        "replied": replied,
        "by_status": {row[0]: row[1] for row in by_status},
        "by_email_status": {row[0]: row[1] for row in by_email_status},
    }
