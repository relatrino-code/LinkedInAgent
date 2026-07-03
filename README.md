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
flowchart LR
    %% darker, thicker strokes for visibility
    classDef box fill:#fff,stroke:#1e293b,stroke-width:2.5px,color:#0f172a,font-weight:bold

    subgraph Setup["PHASE 1: SETUP"]
        direction TB
        U(["👤 You (Dashboard)"]):::box
        Q(["🔍 Saved Search Queries<br/>Title · Location · Company · etc"]):::box
        U --> Q
    end

    subgraph ScrapePhase["PHASE 2: SCRAPE"]
        direction TB
        S(["🕸️ Celery: Job Scraper<br/>LinkedIn + Indeed"]):::box
        JS(["🌐 LinkedIn / Indeed"]):::box
        DB1[("💾 PostgreSQL")]:::box
        S <--> JS
        S -->|"stores"| DB1
    end

    subgraph ApplyPhase["PHASE 3: APPLY"]
        direction TB
        A(["📝 Celery: Email Finder<br/>Apollo.io + Web Scrape"]):::box
        AP(["🔌 Apollo.io API"]):::box
        DB2[("💾 PostgreSQL")]:::box
        A <--> AP
        A -->|"saves contacts"| DB2
    end

    subgraph OutreachPhase["PHASE 4: OUTREACH"]
        direction TB
        E(["📨 Celery: Email Sender<br/>SMTP + Tracking Pixels"]):::box
        GM(["📧 Gmail / Outlook"]):::box
        DB3[("💾 PostgreSQL")]:::box
        E -->|"sends CV"| GM
        E -->|"logs sent"| DB3
    end

    subgraph TrackPhase["PHASE 5: TRACK & REPLY"]
        direction TB
        T(["📬 Celery: Email Tracker<br/>IMAP - Checks Replies"]):::box
        GM2(["📧 Gmail / Outlook"]):::box
        DB4[("💾 PostgreSQL")]:::box
        R(["👤 You Reply from UI"]):::box
        T <-->|"polls inbox"| GM2
        T -->|"stores replies"| DB4
        DB4 --> R
    end

    Q -->|"auto-scrape"| S
    DB1 --> A
    DB2 --> E
    GM2 -.->|"hourly check"| T

    %% edge styling: thicker, darker arrows
    linkStyle default stroke:#000,stroke-width:3px
```

### Flow Summary

| Step | What Happens |
|------|-------------|
| **1. Setup** | You fill your profile, upload CV, add search queries in the Dashboard |
| **2. Scrape** | Celery scrapes LinkedIn/Indeed for matching jobs → saved to PostgreSQL |
| **3. Apply** | You click "Apply" on a job → creates an application record |
| **4. Find Emails** | Celery searches Apollo.io / company websites for recruiter emails |
| **5. Send Email** | You write your pitch → Celery sends it via Gmail with tracking pixels |
| **6. Track** | Celery polls your Gmail inbox every hour for replies → stores them |
| **7. Reply** | You read the reply in the UI and respond directly |

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

## What Each Service Does (Layman Terms)

The system runs **5 things** at the same time. Here's what each one does:

| Service | It's like... | What it actually does |
|---------|-------------|----------------------|
| **Uvicorn** (backend) | 🧑‍💼 **The Receptionist** | Sits at `localhost:8000`, waits for your clicks in the browser, talks to the database, and gives instructions to Celery. You always need this running. |
| **Celery Worker** | 🧑‍🔧 **The Handyman** | Does the heavy lifting — scraping LinkedIn, sending emails, checking your inbox for replies. Without it, nothing happens in the background. |
| **Celery Beat** | ⏰ **The Alarm Clock** | Tells the Handyman *when* to work. "Hey, it's been 10 hours — scrape again!" Optional — without it, you click "Scrape" manually. |
| **PostgreSQL** (db) | 📁 **The Filing Cabinet** | Stores everything — jobs, applications, emails, your profile. Keeps data even if you restart. |
| **Redis** | 📋 **The To-Do List** | A temporary scratchpad where the Receptionist writes tasks for the Handyman. "Scrape this job", "Send this email", etc. |

**In short:** You need Uvicorn + PostgreSQL + Redis + Celery Worker for full functionality. Celery Beat is optional (auto-scheduling).

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
