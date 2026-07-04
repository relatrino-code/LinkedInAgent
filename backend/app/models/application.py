import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, JSON, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class EmailStatus(str, enum.Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    REPLIED = "replied"
    BOUNCED = "bounced"
    FAILED = "failed"


class ApplicationStatus(str, enum.Enum):
    DISCOVERED = "discovered"
    EMAIL_FOUND = "email_found"
    EMAIL_SENT = "email_sent"
    FOLLOWED_UP = "followed_up"
    REPLIED = "replied"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    REJECTED = "rejected"
    OFFER = "offer"
    CLOSED = "closed"


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("jobs.id"), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_title: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_linkedin: Mapped[str | None] = mapped_column(String(500))
    email_subject: Mapped[str | None] = mapped_column(String(500))
    email_body: Mapped[str | None] = mapped_column(Text)
    email_status: Mapped[EmailStatus] = mapped_column(SAEnum(EmailStatus), default=EmailStatus.DRAFT)
    application_status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus), default=ApplicationStatus.DISCOVERED)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    first_reply_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_contact_at: Mapped[datetime | None] = mapped_column(DateTime)
    follow_up_count: Mapped[int] = mapped_column(default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job: Mapped["Job"] = relationship(back_populates="applications")
    email_threads: Mapped[list["EmailThread"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    contacts: Mapped[list["Contact"]] = relationship(back_populates="application", cascade="all, delete-orphan")


class EmailThread(Base):
    __tablename__ = "email_threads"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("job_applications.id"), nullable=False)
    message_id: Mapped[str | None] = mapped_column(String(500))
    from_email: Mapped[str] = mapped_column(String(255), nullable=False)
    to_email: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text)
    is_incoming: Mapped[bool] = mapped_column(Boolean, default=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    application: Mapped["JobApplication"] = relationship(back_populates="email_threads")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("job_applications.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255))
    title: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str | None] = mapped_column(String(50))
    confidence: Mapped[float | None] = mapped_column(default=0.0)
    selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    application: Mapped["JobApplication"] = relationship(back_populates="contacts")
