from app.services.scraper.linkedin import LinkedInScraper
from app.services.scraper.indeed import IndeedScraper
from app.services.scraper.base import ScrapedJob


class ScraperService:
    def __init__(self):
        self.scrapers = {
            "linkedin": LinkedInScraper(),
            "indeed": IndeedScraper(),
        }

    def build_query(self, title: str, companies: str = "", keywords: str = "", experience_level: str = "") -> str:
        parts = [title]
        if keywords:
            parts.append(keywords)
        if experience_level:
            parts.append(experience_level)
        return " ".join(parts)

    async def search_jobs(
        self,
        query: str,
        location: str = "",
        sources: list[str] | None = None,
        companies: str = "",
        experience_level: str = "",
        keywords: str = "",
        max_results: int = 50,
    ) -> list[ScrapedJob]:
        search_query = self.build_query(query, companies, keywords, experience_level)
        all_jobs = []
        sources = sources or ["linkedin", "indeed"]

        for source in sources:
            scraper = self.scrapers.get(source)
            if scraper:
                try:
                    jobs = await scraper.scrape(search_query, location, max_results // len(sources))
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
