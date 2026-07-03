import httpx
import re
from typing import Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import tldextract

from app.config import settings


class EmailFinderService:
    def __init__(self):
        self.apollo_api_key = settings.APOLLO_API_KEY

    async def find_emails(
        self,
        company_name: str,
        company_domain: str | None = None,
        job_title: str | None = None,
        seniority: str | None = None,
    ) -> list[dict]:
        emails = []

        if self.apollo_api_key:
            apollo_results = await self._search_apollo(company_name, company_domain, job_title, seniority)
            emails.extend(apollo_results)

        if not emails:
            scraped = await self._scrape_emails(company_name, company_domain)
            emails.extend(scraped)

        return emails

    async def _search_apollo(
        self,
        company_name: str,
        company_domain: str | None,
        job_title: str | None,
        seniority: str | None,
    ) -> list[dict]:
        if not self.apollo_api_key:
            return []

        try:
            domain = company_domain or await self._get_domain_from_name(company_name)
            if not domain:
                return []

            headers = {
                "Content-Type": "application/json",
                "x-api-key": self.apollo_api_key,
            }

            payload = {
                "page": 1,
                "per_page": 25,
                "q_organization_domains": [domain],
                "person_titles": [f"{job_title}"],
            }

            if seniority:
                payload["q_seniorities"] = [seniority]

            if job_title:
                hiring_titles = [
                    f"Recruiter at {company_name}",
                    f"Talent Acquisition {company_name}",
                    f"Hiring Manager {company_name}",
                    f"HR {company_name}",
                ]
                payload["q_keywords"] = hiring_titles

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.apollo.io/api/v1/mixed_people/search",
                    headers=headers,
                    json=payload,
                )
                if response.status_code == 200:
                    data = response.json()
                    people = data.get("people", [])[:5]
                    results = []
                    for person in people:
                        email = person.get("email")
                        if email:
                            results.append({
                                "name": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
                                "email": email,
                                "title": person.get("title"),
                                "linkedin_url": person.get("linkedin_url"),
                                "source": "apollo",
                                "confidence": person.get("email_confidence", 0),
                            })
                    return results
        except Exception:
            pass

        return []

    async def _scrape_emails(
        self,
        company_name: str,
        company_domain: str | None,
    ) -> list[dict]:
        results = []
        domain = company_domain or await self._get_domain_from_name(company_name)
        if not domain:
            return results

        urls_to_check = [
            f"https://{domain}",
            f"https://{domain}/team",
            f"https://{domain}/about",
            f"https://{domain}/careers",
            f"https://{domain}/contact",
        ]

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            for url in urls_to_check:
                try:
                    response = await client.get(url, headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                                      "AppleWebKit/537.36"
                    })
                    if response.status_code == 200:
                        found = self._extract_emails_from_html(response.text, url)
                        for email, name, title in found:
                            results.append({
                                "name": name or f"Team at {company_name}",
                                "email": email,
                                "title": title or f"Team at {company_name}",
                                "source": f"scraped:{url}",
                                "confidence": 0.3,
                            })
                except Exception:
                    continue

        return results

    def _extract_emails_from_html(self, html: str, url: str) -> list[tuple[str, str | None, str | None]]:
        soup = BeautifulSoup(html, "lxml")
        found = []
        email_pattern = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

        for tag in soup.find_all(["a", "p", "span", "div", "li"]):
            text = tag.get_text()
            emails = email_pattern.findall(text)
            for email in emails:
                if email.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".svg")):
                    continue
                parent = tag.find_parent(["div", "section", "li"])
                context = parent.get_text(strip=True) if parent else ""
                name = None
                title = None
                if "@" in email and "." in email.split("@")[1]:
                    lines = [line.strip() for line in context.split("\n") if line.strip()]
                    for line in lines:
                        if email not in line and len(line) > 3:
                            if not name:
                                name = line
                            elif not title:
                                title = line
                found.append((email, name, title))

        return found

    async def _get_domain_from_name(self, company_name: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://autocomplete.clearbit.com/v1/companies/suggest?query={company_name}",
                )
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        domain = data[0].get("domain")
                        if domain:
                            return domain
        except Exception:
            pass

        name_clean = re.sub(r"[^a-zA-Z0-9\s]", "", company_name).strip().lower()
        name_clean = re.sub(r"\s+", "", name_clean)
        return f"{name_clean}.com" if name_clean else None


email_finder_service = EmailFinderService()
