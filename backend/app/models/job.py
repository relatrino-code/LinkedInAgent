import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, JSON, Enum as SAEnum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class JobStatus(str, enum.Enum):
    DISCOVERED = "discovered"
    APPLYING = "applying"
    APPLIED = "applied"
    REPLY_RECEIVED = "reply_received"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    OFFER = "offer"
    CLOSED = "closed"


class JobSource(str, enum.Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    COMPANY_CAREER = "company_career"
    MANUAL = "manual"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    company_website: Mapped[str | None] = mapped_column(String(500))
    company_career_page: Mapped[str | None] = mapped_column(String(500))
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    required_experience: Mapped[str | None] = mapped_column(String(100))
    salary_range: Mapped[str | None] = mapped_column(String(100))
    job_url: Mapped[str | None] = mapped_column(String(1000))
    source: Mapped[JobSource] = mapped_column(SAEnum(JobSource), default=JobSource.LINKEDIN)
    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.DISCOVERED)
    search_query_used: Mapped[str | None] = mapped_column(String(500))
    posted_date: Mapped[datetime | None] = mapped_column(DateTime)
    discovered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)

    applications: Mapped[list["JobApplication"]] = relationship(back_populates="job", cascade="all, delete-orphan")
