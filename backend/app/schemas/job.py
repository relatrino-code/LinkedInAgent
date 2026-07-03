from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobOut(BaseModel):
    id: str
    title: str
    company: str
    company_website: Optional[str] = None
    company_career_page: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    required_experience: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    source: str
    status: str
    posted_date: Optional[datetime] = None
    discovered_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class JobDetail(JobOut):
    applications: list = []


class JobFilterParams(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20
