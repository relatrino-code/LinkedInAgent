import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional
from urllib.parse import quote

from app.services.scraper.base import BaseScraper, ScrapedJob


class IndeedScraper(BaseScraper):
    BASE_URL = "https://www.indeed.com/jobs"

    async def scrape(self, query: str, location: str = "", max_results: int = 50) -> list[ScrapedJob]:
        jobs = []
        start = 0

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            while len(jobs) < max_results:
                params = {
                    "q": query,
                    "l": location,
                    "start": start,
                }
                try:
                    response = await client.get(self.BASE_URL, params=params, headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                                      "Chrome/125.0.0.0 Safari/537.36"
                    })
                    if response.status_code != 200:
                        break

                    soup = BeautifulSoup(response.text, "lxml")
                    job_cards = soup.select("[data-testid='job-card'], .job_seen_beacon, .cardOutline")
                    if not job_cards:
                        break

                    for card in job_cards:
                        job = self._parse_card(card)
                        if job:
                            jobs.append(job)
                            if len(jobs) >= max_results:
                                break

                    start += len(job_cards)
                except Exception:
                    break

        return jobs

    def _parse_card(self, card) -> Optional[ScrapedJob]:
        try:
            title_el = card.select_one("h2.jobTitle a, [data-testid='job-title'] a, a.jobtitle")
            company_el = card.select_one("[data-testid='company-name'], .companyName, span.company_name")
            location_el = card.select_one("[data-testid='text-location'], .companyLocation, div.location")
            salary_el = card.select_one("[data-testid='attribute_snippet_testid'], .salary-snippet")
            date_el = card.select_one("[data-testid='job-date']")

            if not title_el:
                return None

            title = title_el.text.strip()
            company = company_el.text.strip() if company_el else ""
            location = location_el.text.strip() if location_el else None
            job_url = title_el.get("href")
            if job_url and not job_url.startswith("http"):
                job_url = "https://www.indeed.com" + job_url

            salary_range = salary_el.text.strip() if salary_el else None
            posted_date = None
            if date_el:
                date_text = date_el.text.strip()
                if "day" in date_text or "hour" in date_text or "minute" in date_text:
                    posted_date = datetime.utcnow()

            return ScrapedJob(
                title=title,
                company=company,
                location=location,
                job_url=job_url,
                salary_range=salary_range,
                posted_date=posted_date,
                source="indeed",
            )
        except Exception:
            return None

    async def scrape_company_career_page(self, career_page_url: str) -> list[ScrapedJob]:
        return []
