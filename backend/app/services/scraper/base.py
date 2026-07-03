from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class ScrapedJob:
    title: str
    company: str
    company_website: Optional[str] = None
    company_career_page: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    required_experience: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    source: str = "linkedin"
    posted_date: Optional[datetime] = None
    metadata: Optional[dict] = None


class BaseScraper(ABC):
    @abstractmethod
    async def scrape(self, query: str, location: str = "", max_results: int = 50) -> list[ScrapedJob]:
        pass

    @abstractmethod
    async def scrape_company_career_page(self, career_page_url: str) -> list[ScrapedJob]:
        pass
