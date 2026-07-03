# LinkedIn Job Agent

Automated job discovery, recruiter outreach, and application tracking system.

## Features

- **Job Scraping** — Scrapes jobs from LinkedIn, Indeed, and company career pages based on your search queries
- **Recruiter Email Discovery** — Finds recruiter/hiring manager emails via Apollo.io API (with web scraping fallback)
- **Automated Outreach** — Sends personalized emails with your CV attached via SMTP (Gmail/Outlook)
- **Email Tracking** — Tracks opens, clicks, and replies using tracking pixels + IMAP polling
- **Reply Management** — View email threads and send replies directly from the dashboard
- **Dashboard UI** — Full application lifecycle management with filters, search, status tracking, and timeline

## Architecture

```
LinkedInAgent/
├── backend/                     # FastAPI + Celery
│   ├── app/
│   │   ├── api/                 # REST endpoints
│   │   ├── models/              # SQLAlchemy models (Job, Application, EmailThread, etc.)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── scraper/         # LinkedIn + Indeed scrapers
│   │   │   ├── email_finder/    # Apollo.io + web scraping
│   │   │   ├── email_sender/    # SMTP with tracking
│   │   │   └── email_tracker/   # IMAP reply detection
│   │   └── tasks/               # Celery background jobs
│   └── requirements.txt
├── frontend/                    # React + Vite + Tailwind
│   └── src/
│       ├── components/          # Layout, StatusBadge, FilterBar, StatsCard
│       ├── pages/               # Dashboard, Jobs, Applications, Settings
│       └── services/            # API client
└── docker-compose.yml           # PostgreSQL, Redis, Backend, Celery
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for PostgreSQL + Redis) or run them locally
- A Gmail/Outlook account with an [app password](https://support.google.com/accounts/answer/185833) (for SMTP)
- (Optional) [Apollo.io API key](https://apollo.io/api) for recruiter email discovery

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url> && cd LinkedInAgent
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/linkedin_agent
SECRET_KEY=generate-a-random-secret-key
REDIS_URL=redis://localhost:6379/0

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youraccount@gmail.com
SMTP_PASSWORD=your-app-password

APOLLO_API_KEY=your-api-key           # optional

BASE_URL=http://localhost:8000
SCRAPE_INTERVAL_HOURS=6
EMAIL_CHECK_INTERVAL_MINUTES=15
```

### 2. Start infrastructure

```bash
docker-compose up -d db redis
```

Or if you have PostgreSQL/Redis running locally, just make sure the URLs in `.env` are correct.

### 3. Start the backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://localhost:8000/docs`.

### 4. Start Celery workers (in separate terminals)

```bash
cd backend && source .venv/bin/activate

# Worker (processes tasks)
celery -A app.tasks.celery_app worker --loglevel=info

# Beat (scheduled tasks — optional)
celery -A app.tasks.celery_app beat --loglevel=info
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Usage

1. **Settings page** — Fill in your profile (name, email, skills, cover letter template) and upload your CV
2. **Add search queries** — Enter job titles, locations, companies you're interested in
3. **Scrape jobs** — Click "Scrape Jobs" to find listings from LinkedIn and Indeed
4. **Create applications** — From scraped jobs, create applications to start the outreach process
5. **Find emails** — The system will attempt to find recruiter emails via Apollo.io or web scraping
6. **Send emails** — Write personalized emails and send them with your CV attached
7. **Track replies** — Incoming replies are detected automatically; respond directly from the UI

## Deploying with Docker

```bash
# Set environment variables
export SMTP_USER=...
export SMTP_PASSWORD=...
export APOLLO_API_KEY=...
export SECRET_KEY=...

# Start everything
docker-compose up -d

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy, PostgreSQL |
| Background Jobs | Celery, Redis |
| Scraping | httpx, BeautifulSoup, lxml |
| Email | smtplib, imaplib (SMTP + IMAP) |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Data Fetching | TanStack React Query, Axios |
