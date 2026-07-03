from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response, RedirectResponse
from datetime import datetime
from app.database import async_session_factory
from app.models.application import JobApplication, EmailStatus, ApplicationStatus
from sqlalchemy import select

router = APIRouter(prefix="/api/track", tags=["tracking"])


@router.get("/open/{application_id}")
async def track_email_open(application_id: str):
    async with async_session_factory() as session:
        result = await session.execute(
            select(JobApplication).where(JobApplication.id == application_id)
        )
        app = result.scalar_one_or_none()
        if app and app.email_status == EmailStatus.SENT:
            app.email_status = EmailStatus.OPENED
            app.last_contact_at = datetime.utcnow()
            await session.commit()

    return Response(
        content="GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;",
        media_type="image/gif",
    )


@router.get("/click/{application_id}")
async def track_email_click(application_id: str, url: str, request: Request):
    async with async_session_factory() as session:
        result = await session.execute(
            select(JobApplication).where(JobApplication.id == application_id)
        )
        app = result.scalar_one_or_none()
        if app:
            if app.email_status in (EmailStatus.SENT, EmailStatus.DELIVERED):
                app.email_status = EmailStatus.CLICKED
            app.last_contact_at = datetime.utcnow()
            await session.commit()

    return RedirectResponse(url=url)
