from app.services.scraper.linkedin import LinkedInScraper
from app.services.scraper.indeed import IndeedScraper
from app.services.scraper.base import ScrapedJob


class ScraperService:
    def __init__(self):
        self.scrapers = {
            "linkedin": LinkedInScraper(),
            "indeed": IndeedScraper(),
        }

    async def search_jobs(
        self,
        query: str,
        location: str = "",
        sources: list[str] | None = None,
        max_results: int = 50,
    ) -> list[ScrapedJob]:
        all_jobs = []
        sources = sources or ["linkedin", "indeed"]

        for source in sources:
            scraper = self.scrapers.get(source)
            if scraper:
                try:
                    jobs = await scraper.scrape(query, location, max_results // len(sources))
                    all_jobs.extend(jobs)
                except Exception:
                    continue

        return all_jobs

    async def scrape_career_page(
        self,
        career_page_url: str,
        source: str = "company_career",
    ) -> list[ScrapedJob]:
        for scraper in self.scrapers.values():
            try:
                jobs = await scraper.scrape_company_career_page(career_page_url)
                if jobs:
                    return jobs
            except Exception:
                continue
        return []


scraper_service = ScraperService()
