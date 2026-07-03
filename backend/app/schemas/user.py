from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserProfileCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[int] = 0
    skills: Optional[str] = None
    cover_letter_template: Optional[str] = None
    preferences: Optional[dict] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[str] = None
    cover_letter_template: Optional[str] = None
    preferences: Optional[dict] = None


class UserProfileOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[str] = None
    resume_path: Optional[str] = None
    cover_letter_template: Optional[str] = None
    preferences: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SearchQueryCreate(BaseModel):
    job_titles: str
    companies: Optional[str] = None
    locations: Optional[str] = None
    experience_level: Optional[str] = None
    keywords: Optional[str] = None
    sources: Optional[str] = None


class SearchQueryOut(BaseModel):
    id: str
    user_id: str
    job_titles: str
    companies: Optional[str] = None
    locations: Optional[str] = None
    experience_level: Optional[str] = None
    keywords: Optional[str] = None
    sources: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_run_at: Optional[datetime] = None

    class Config:
        from_attributes = True
