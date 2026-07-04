import httpx
import re
from typing import Optional
from bs4 import BeautifulSoup

from app.config import settings


class EmailFinderService:
    def __init__(self):
        self.apollo_api_key = settings.APOLLO_API_KEY

    async def find_emails(
        self,
        company_name: str,
        company_domain: str | None = None,
        job_title: str | None = None,
        job_url: str | None = None,
    ) -> list[dict]:
        contacts = []

        if self.apollo_api_key:
            apollo_results = await self._search_apollo_hr(company_name, company_domain)
            contacts.extend(apollo_results)

        if not contacts:
            linkedin_results = await self._scrape_linkedin_people(company_name, job_url)
            contacts.extend(linkedin_results)

        if not contacts:
            scraped = await self._scrape_emails(company_name, company_domain)
            contacts.extend(scraped)

        return contacts

    async def _search_apollo_hr(
        self,
        company_name: str,
        company_domain: str | None,
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
                "q_keywords": "recruiter talent acquisition HR hiring manager",
                "person_titles": [
                    "Recruiter",
                    "Talent Acquisition",
                    "HR Manager",
                    "Hiring Manager",
                    "HR Business Partner",
                    "Talent Partner",
                    "Recruiting Manager",
                    "Human Resources",
                ],
                "q_seniorities": ["manager", "senior", "director", "lead"],
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.apollo.io/api/v1/mixed_people/search",
                    headers=headers,
                    json=payload,
                )
                if response.status_code == 200:
                    data = response.json()
                    people = data.get("people", [])
                    results = []
                    for person in people:
                        email = person.get("email")
                        results.append({
                            "name": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
                            "email": email or "",
                            "title": person.get("title"),
                            "linkedin_url": person.get("linkedin_url"),
                            "source": "apollo",
                            "confidence": person.get("email_confidence", 0) if email else 0,
                        })
                    return results
        except Exception:
            pass

        return []

    async def _scrape_linkedin_people(
        self,
        company_name: str,
        job_url: str | None,
    ) -> list[dict]:
        linkedin_url = await self._extract_company_linkedin_url(job_url)
        if not linkedin_url:
            return []

        people_url = linkedin_url.rstrip("/") + "/people/"
        results = []
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(people_url, headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    )
                })
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "lxml")
                    people_cards = soup.select("div.org-people-profile-card__profile-info")
                    hr_keywords = [
                        "recruit", "talent", "hr", "human resource", "hiring",
                        "people", "acquisition", "staffing", "workforce",
                    ]
                    for card in people_cards:
                        name_el = card.select_one("div.org-people-profile-card__profile-name")
                        title_el = card.select_one("div.org-people-profile-card__profile-title")
                        link_el = card.select_one("a")
                        if not name_el:
                            continue
                        name = name_el.text.strip()
                        title = title_el.text.strip() if title_el else ""
                        linkedin_url = link_el.get("href") if link_el else None
                        if title and any(kw in title.lower() for kw in hr_keywords):
                            results.append({
                                "name": name,
                                "email": "",
                                "title": title,
                                "linkedin_url": linkedin_url,
                                "source": "linkedin",
                                "confidence": 0.5,
                            })
                    if results:
                        return results
            except Exception:
                pass

            try:
                search_url = (
                    f"https://www.linkedin.com/search/results/people/"
                    f"?keywords={'HR recruiter talent acquisition'}"
                    f"+{company_name.replace(' ', '+')}"
                )
                response = await client.get(search_url, headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    )
                })
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "lxml")
                    for card in soup.select("li.reusable-search__result-container"):
                        name_el = card.select_one("span.entity-result__title-text a")
                        title_el = card.select_one("div.entity-result__primary-subtitle")
                        link_el = card.select_one("a")
                        if name_el:
                            name = name_el.text.strip()
                            title = title_el.text.strip() if title_el else ""
                            linkedin_url = link_el.get("href") if link_el else None
                            if title and any(kw in title.lower() for kw in hr_keywords):
                                results.append({
                                    "name": name,
                                    "email": "",
                                    "title": title,
                                    "linkedin_url": linkedin_url,
                                    "source": "linkedin_search",
                                    "confidence": 0.4,
                                })
            except Exception:
                pass

        return results

    async def _extract_company_linkedin_url(self, job_url: str | None) -> Optional[str]:
        if not job_url or "linkedin.com/jobs" not in job_url:
            return None
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            try:
                response = await client.get(job_url, headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    )
                })
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "lxml")
                    company_link = soup.select_one("a.topcard__org-name-link")
                    if company_link:
                        href = company_link.get("href")
                        if href:
                            return href.split("?")[0]
                    org_img = soup.select_one("img.org-name-link__img")
                    if org_img:
                        alt = org_img.get("alt")
                        if alt:
                            company_name_clean = alt.strip().lower().replace(" ", "-")
                            return f"https://www.linkedin.com/company/{company_name_clean}"
            except Exception:
                pass
        return None

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
                        "User-Agent": "Mozilla/5.0"
                    })
                    if response.status_code == 200:
                        found = self._extract_emails_from_html(response.text)
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

    def _extract_emails_from_html(self, html: str) -> list[tuple[str, str | None, str | None]]:
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
