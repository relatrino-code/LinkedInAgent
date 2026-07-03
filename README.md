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

```mermaid
flowchart TB
    subgraph User["👤 You"]
        UI["React Dashboard<br/>localhost:5173"]
    end

    subgraph Backend["🐍 Backend (FastAPI)"]
        API["REST API<br/>port 8000"]
        DB[("PostgreSQL<br/>Jobs, Applications,<br/>Email Threads")]
    end

    subgraph Workers["⚙️ Celery Workers"]
        Scraper["🕸️ Job Scraper<br/>LinkedIn, Indeed,<br/>Career Pages"]
        EmailFinder["📧 Email Finder<br/>Apollo.io API +<br/>Web Scraping"]
        EmailSender["📨 Email Sender<br/>SMTP (Gmail/Outlook)<br/>+ Tracking Pixels"]
        EmailTracker["📬 Email Tracker<br/>IMAP - Checks for<br/>Replies Every 15min"]
        Beat["⏰ Scheduler<br/>Auto-Scrape Every<br/>10 Hours"]
    end

    subgraph Infra["🗄️ Infrastructure"]
        Redis[("Redis<br/>Task Queue")]
        SMTP[("Gmail/Outlook<br/>SMTP + IMAP")]
        Apollo[("Apollo.io API<br/>(Optional)")]
    end

    UI <--> API
    API <--> DB
    API --> Redis

    Redis --> Scraper
    Redis --> EmailFinder
    Redis --> EmailSender
    Redis --> EmailTracker
    Beat --> Redis

    Scraper -->|"1. Finds jobs"| DB
    EmailFinder -->|"2. Finds recruiter emails"| DB
    EmailSender -->|"3. Sends email + CV"| SMTP
    EmailTracker -->|"4. Checks inbox"| SMTP
    EmailTracker -->|"5. Stores replies"| DB
    Apollo --> EmailFinder

    style User fill:#e8f4f8,stroke:#333
    style Backend fill:#f0f0f0,stroke:#333
    style Workers fill:#fff3e0,stroke:#333
    style Infra fill:#f3e5f5,stroke:#333
```

### Flow Summary

1. **You** set search preferences in the Dashboard
2. **Scraper** finds matching jobs from LinkedIn/Indeed
3. **Email Finder** hunts for recruiter emails (Apollo.io → web scrape)
4. **Email Sender** sends your pitch + CV via Gmail/Outlook
5. **Email Tracker** polls your inbox for replies
6. **You** get notified and can reply directly from the UI

### File Structure
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

## Getting Credentials

### SMTP (Gmail)

1. Enable **2-Step Verification** at https://myaccount.google.com/security
2. Generate an **App Password** at https://myaccount.google.com/apppasswords
3. Select "Mail" and your device → copy the 16-character password (no spaces)

### SMTP (Outlook)

1. Go to https://account.microsoft.com/security → "Advanced security options"
2. Enable two-factor authentication, then create an app password

### Apollo.io API Key (Optional)

1. Sign up at https://apollo.io
2. Go to Settings → API Key → "Create API Key"
3. Without this, email finding falls back to web scraping (lower accuracy)

### SECRET_KEY

Generate one with:

```bash
openssl rand -hex 32
```

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
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://localhost:8000/docs`.

### 4. Start Celery workers (in separate terminals)

```bash
cd backend
source .venv/bin/activate

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
