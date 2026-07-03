import httpx
from bs4 import BeautifulSoup
import re
from datetime import datetime
from typing import Optional
import json
from urllib.parse import quote

from app.services.scraper.base import BaseScraper, ScrapedJob


class LinkedInScraper(BaseScraper):
    BASE_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

    async def scrape(self, query: str, location: str = "", max_results: int = 50) -> list[ScrapedJob]:
        jobs = []
        params = {
            "keywords": query,
            "location": location,
            "start": 0,
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            while len(jobs) < max_results:
                params["start"] = len(jobs)
                try:
                    response = await client.get(self.BASE_URL, params=params, headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                                      "Chrome/125.0.0.0 Safari/537.36"
                    })
                    if response.status_code != 200:
                        break

                    soup = BeautifulSoup(response.text, "lxml")
                    job_cards = soup.select("li:not(.hidden)")
                    if not job_cards:
                        break

                    for card in job_cards:
                        job = self._parse_card(card)
                        if job:
                            jobs.append(job)
                            if len(jobs) >= max_results:
                                break
                except Exception:
                    break

        return jobs

    def _parse_card(self, card) -> Optional[ScrapedJob]:
        try:
            title_el = card.select_one("h3.base-search-card__title")
            company_el = card.select_one("h4.base-search-card__subtitle a")
            location_el = card.select_one("span.job-search-card__location")
            link_el = card.select_one("a.base-card__full-link")
            date_el = card.select_one("time.job-search-card__listdate")
            salary_el = card.select_one("span.job-search-card__salary-info")

            if not title_el or not company_el:
                return None

            title = title_el.text.strip()
            company = company_el.text.strip()
            location = location_el.text.strip() if location_el else None
            job_url = link_el.get("href") if link_el else None

            posted_date = None
            if date_el and date_el.get("datetime"):
                try:
                    posted_date = datetime.fromisoformat(date_el["datetime"])
                except (ValueError, TypeError):
                    posted_date = datetime.utcnow()

            salary_range = None
            if salary_el:
                salary_range = salary_el.text.strip()

            return ScrapedJob(
                title=title,
                company=company,
                location=location,
                job_url=job_url,
                salary_range=salary_range,
                posted_date=posted_date,
                source="linkedin",
            )
        except Exception:
            return None

    async def scrape_company_career_page(self, career_page_url: str) -> list[ScrapedJob]:
        jobs = []
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(career_page_url, headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                                  "Chrome/125.0.0.0 Safari/537.36"
                })
                if response.status_code != 200:
                    return jobs

                soup = BeautifulSoup(response.text, "lxml")
                for link in soup.select("a[href*='job'], a[href*='career'], a[href*='careers'], "
                                        "a[href*='position'], a[href*='opening']"):
                    href = link.get("href")
                    if href and href not in [j.job_url for j in jobs if j.job_url]:
                        full_url = href if href.startswith("http") else career_page_url.rstrip("/") + "/" + href.lstrip("/")
                        jobs.append(ScrapedJob(
                            title=link.text.strip() or "Unknown Position",
                            company="",
                            job_url=full_url,
                            source="company_career",
                        ))
            except Exception:
                pass

        return jobs
