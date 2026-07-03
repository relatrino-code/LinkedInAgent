from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[str] = None
    contact_linkedin: Optional[str] = None
    email_subject: Optional[str] = None
    email_status: str
    application_status: str
    sent_at: Optional[datetime] = None
    first_reply_at: Optional[datetime] = None
    last_contact_at: Optional[datetime] = None
    follow_up_count: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationDetail(ApplicationOut):
    job: Optional[dict] = None
    email_threads: list = []


class ApplicationCreate(BaseModel):
    job_id: str
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[str] = None
    contact_linkedin: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[str] = None
    contact_linkedin: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    application_status: Optional[str] = None
    notes: Optional[str] = None


class EmailSendRequest(BaseModel):
    application_id: str
    subject: str
    body: str
    cc: Optional[str] = None


class EmailReplyRequest(BaseModel):
    thread_id: str
    body: str


class EmailThreadOut(BaseModel):
    id: str
    application_id: str
    from_email: str
    to_email: str
    subject: str
    body: str
    is_incoming: bool
    is_read: bool
    sent_at: datetime

    class Config:
        from_attributes = True


class ApplicationFilterParams(BaseModel):
    company: Optional[str] = None
    status: Optional[str] = None
    email_status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    has_replied: Optional[bool] = None
    search: Optional[str] = None
    sort_by: Optional[str] = "updated_at"
    sort_order: Optional[str] = "desc"
    page: int = 1
    page_size: int = 20
