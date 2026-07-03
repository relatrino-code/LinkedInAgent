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
SCRAPE_INTERVAL_HOURS=10
EMAIL_CHECK_INTERVAL_MINUTES=60
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

### 4. Start Celery (background workers — two parts)

Celery has **two components** that run together in separate terminals:

**Worker** — processes actual tasks (scraping, sending emails, checking inbox). Required for everything to work.

```bash
cd backend
source .venv/bin/activate
celery -A app.tasks.celery_app worker --loglevel=info --pool solo
```

**Beat** — the scheduler that triggers tasks automatically on a timer (e.g., re-scrape every 10 hours, check email replies every hour). Optional — without it, you must trigger scrapes manually from the UI.

```bash
cd backend
source .venv/bin/activate
celery -A app.tasks.celery_app beat --loglevel=info
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## End-to-End Workflow

Here's the complete flow from setup to getting replies:

### Phase 1: Setup (Settings page)

1. Fill in **your profile** — name, email, skills, LinkedIn URL
2. Upload your **resume/CV** (PDF)
3. Write a **cover letter template** (use `{{company}}` and `{{role}}` as placeholders)
4. Add **search queries** — job titles, locations, companies you're targeting

### Phase 2: Discover Jobs (Jobs page)

1. Click **"Scrape Jobs"** — enter a title (e.g., "Software Engineer") and location ("Bangalore")
2. The scraper searches LinkedIn and Indeed, saves matching jobs to the database
3. Beat will **auto-scrape** these queries every 10 hours if running
4. Browse the list — filter by source, status, or search keywords

### Phase 3: Apply (Jobs → Applications page)

1. On any job card, click **"Apply"** — creates an application record
2. Go to **Applications** tab to see all your applications
3. Click **"View"** on an application to open it

### Phase 4: Find Recruiter Emails (Application Detail page)

1. Click **"Find Emails"** — searches Apollo.io API (or scrapes the company website) for recruiter/hiring manager emails
2. The best match is saved as the contact for this application

### Phase 5: Send Outreach (Application Detail page)

1. Write a **subject line** and **email body** (paste your cover letter)
2. Your resume is automatically attached
3. Click **"Send Email"** — it goes out via your Gmail/Outlook SMTP
4. The email includes a **tracking pixel** (knows when it's opened) and **tracked links**

### Phase 6: Track & Reply

1. Celery checks your inbox **every hour** for replies
2. When someone replies, the status changes to **"Replied"**
3. Open the application — the reply appears in the **Email Thread** section
4. Click **"Reply"** on any incoming message to respond directly from the UI
5. Follow-ups are tracked — you can see how many times you've contacted them

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
