# AgilePulse - Agile Project Management Tool

A modern, production-minded Agile Project Management web application built for small engineering teams (3–10 members). Designed around a strict 3-tier work hierarchy:
$$\text{Project} \longrightarrow \text{User Story} \longrightarrow \text{Task}$$

Optimize for functional completeness, clean layered code, solid REST API design, persistent SQLite storage with foreign key constraints, an asynchronous DB-backed background worker queue, comprehensive documentation, and security defense-in-depth.

---

## 🌟 Key Features

### 1. Strict 3-Tier Agile Hierarchy
- **Project**: Root container with short unique key code (e.g. `APM`), status (`active`/`archived`), member management (Owner vs Member), and audit trails.
- **User Story**: Persona-based requirements with story points, acceptance criteria, priority (`Low`, `Medium`, `High`, `Critical`), status columns, and **dynamically computed completion percentage** from child tasks.
- **Task**: Actionable sub-tasks with estimated hours, due dates, assignees, and real-time status (`To Do`, `In Progress`, `Blocked`, `Done`).
- **Hierarchy Auto-Promotion Rule**: When all tasks under a story are marked `Done`, the parent story automatically moves to `In Review` (or `Done`), logging an audit event and notifying the team.

### 2. Interactive Agile Views
- **Kanban Board**: Drag-and-drop stories across columns (`Backlog`, `Ready`, `In Progress`, `In Review`, `Done`) with optimistic UI updates and floating-point position persistence.
- **Collapsible Hierarchy Tree**: Full visual breakdown of Project &rarr; Stories &rarr; Tasks with inline task creation, status toggles, and assignee badges.
- **Project Dashboard**: Real-time project metrics, story/task status breakdown charts, overall progress bar, overdue task alerts, and team workload per assignee.
- **My Tasks View**: Unified cross-project personal task dashboard with urgency flags for upcoming and overdue work.
- **Activity Log & Audit Trail**: Immutable history of who created, updated, or reordered any entity.
- **Comments & Discussion**: Contextual conversation threads on both stories and tasks.

### 3. Lightweight Database-Backed Background Job Queue
- **No Celery / Redis Overkill**: Persistent `jobs` table with atomic leasing (`locked_by`, `locked_at`), stale-lock self-healing, exponential backoff with jitter, and dead-letter queueing.
- **3 Native Async Workflows**:
  1. **Due-Date Reminders**: Background scanner detects upcoming (<24h) and overdue tasks, issuing idempotent in-app notifications and logging simulated email dispatches.
  2. **Event Notification Dispatch**: Decouples assignment and completion notifications from the main HTTP request/response cycle.
  3. **Async Project Report Generation**: Requesting a report returns `202 Accepted` + `job_id`. The background worker aggregates metrics and produces downloadable CSV/JSON exports with real-time UI polling.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.13, FastAPI, SQLAlchemy 2.0 ORM, Alembic migrations, Pydantic v2 |
| **Database** | SQLite (persistent file, foreign keys strictly enabled via `PRAGMA foreign_keys=ON;`) |
| **Background Jobs** | Custom DB-backed persistent queue (`jobs` table) with exponential backoff & dead-letter queue |
| **Authentication** | Stateless JWT tokens (HMAC-SHA256) + Salted bcrypt password hashing |
| **Frontend** | React 18, Vite, TypeScript, React Router v6, TanStack Query v5, Tailwind CSS, Lucide icons |
| **Testing** | Pytest (backend), Vitest + React Testing Library (frontend) |
| **Linting & Code Quality** | Ruff + Black (backend), ESLint + Prettier (frontend) |
| **Containerization** | Docker, Multi-stage Dockerfiles, Docker Compose |

---

## 🚀 Quickstart & Setup

### Prerequisites
- Python 3.11+ (tested on Python 3.13)
- Node.js 18+ & npm (tested on Node v22)
- Docker & Docker Compose (optional, for containerized run)

---

### Option A: One-Command Startup with Docker Compose (Recommended)

1. Clone the repository and navigate into the project directory:
   ```bash
   cd "kpit project"
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
3. Build and launch all services:
   ```bash
   docker compose up --build
   ```
4. Access the applications:
   - **Frontend Web App (Local Dev)**: [http://localhost:5173](http://localhost:5173) *(or [http://localhost:3000](http://localhost:3000) when running inside Docker)*
   - **Backend REST API**: [http://localhost:8000](http://localhost:8000)
   - **Interactive OpenAPI/Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)

*Note: The containers automatically run database migrations and seed demo data on first launch.*

---

### Option B: Local Development Setup (Manual)

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment and activate
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed demo users and projects
python scripts/seed.py

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

#### 2. Start the Background Job Worker
In a second terminal window (with `backend/venv` activated):
```bash
cd backend
python scripts/run_worker.py
```

#### 3. Frontend Setup
In a third terminal window:
```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 👥 Demo User Credentials

The database seed script (`backend/scripts/seed.py`) pre-populates the system with 4 realistic demo users and sample agile projects:

| Full Name | Role | Email | Password | Primary Workspace Role |
|---|---|---|---|---|
| **Alice Chen** | `admin` | `alice@example.com` | `Password123!` | Project Owner / Lead |
| **Bob Smith** | `user` | `bob@example.com` | `Password123!` | Senior Developer |
| **Charlie Davis** | `user` | `charlie@example.com` | `Password123!` | Product Designer |
| **Dana Lee** | `user` | `dana@example.com` | `Password123!` | QA Engineer |

*(The login screen also features 1-click demo user quick-fill buttons).*

---

## 🧪 Running Automated Tests & Linters

### Backend Tests (Pytest)
```bash
cd backend
.\venv\Scripts\pytest -v
```
*(Executes 23 comprehensive tests covering Auth, Permissions, CRUD, Cascading Deletes, Job Backoff/Dead-Letter, Stale Lock Recovery, and Reminder logic).*

### Backend Linting & Formatting (Ruff & Black)
```bash
cd backend
.\venv\Scripts\ruff check app tests scripts
.\venv\Scripts\black --check app tests scripts
```

### Frontend Tests (Vitest + React Testing Library)
```bash
cd frontend
npm run test
```

### Frontend Typechecking & Production Bundle Build
```bash
cd frontend
npm run build
```

---

## ⚙️ Environment Variables

Defined in `.env.example`:

| Variable | Default Value | Description |
|---|---|---|
| `PROJECT_NAME` | `Agile Project Management Tool` | Application brand title |
| `DATABASE_URL` | `sqlite:///./app.db` | SQLite connection string |
| `SECRET_KEY` | `super-secret-production-key...` | Cryptographic secret for signing JWTs |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `1440` (24h) | Access token validity window |
| `BACKEND_CORS_ORIGINS` | `["http://localhost:3000", ...]` | Permitted CORS origin origins |
| `WORKER_POLL_INTERVAL_SECONDS`| `2.0` | Queue polling cadence |
| `WORKER_LOCK_TIMEOUT_SECONDS` | `300` | Stale job lock reclaim threshold |
| `AUTH_RATE_LIMIT_MAX_REQUESTS`| `20` | Max auth requests per minute |

---

## 🖼 UI Tour & Screenshot Placeholders

| View | Description | Preview |
|---|---|---|
| **Kanban Board** | Visual status columns with card drag-and-drop and progress bars | `[Screenshot: Kanban Board with columns & cards]` |
| **Hierarchy Tree** | 3-tier collapsible Project &rarr; User Story &rarr; Task tree | `[Screenshot: Collapsible Project Hierarchy Tree]` |
| **Project Dashboard** | Real-time status distributions, progress, and workload metrics | `[Screenshot: Project Dashboard Metrics & Workload Table]` |
| **Story Detail & Tasks** | Acceptance criteria, child task checkboxes, and comments | `[Screenshot: Story Detail View with Task Breakdowns]` |
| **My Tasks View** | Personal task tracker with urgency flags for upcoming/overdue tasks | `[Screenshot: Cross-Project Assigned Tasks View]` |
| **Report Generation** | Background job polling with CSV and JSON exports | `[Screenshot: Background Report Polling and Download]` |

*(Walkthrough Video & Live Demo links available below).*

---

## 🔮 What I Would Build Next with More Time

While AgilePulse provides a complete, production-grade foundation for small teams, here is what I would prioritize next:

1. **WebSockets / Server-Sent Events (SSE)**: Replace smart HTTP polling with bi-directional streaming for live board updates when multiple team members drag cards concurrently.
2. **PostgreSQL Migration**: Swap SQLite for PostgreSQL in cloud production with read-replicas and connection pooling (`pgbouncer`).
3. **Sprint & Milestone Management**: Add time-boxed sprints (e.g. Sprint 1, 2 weeks) with automated velocity tracking and SVG Burndown / Burnup charts.
4. **Rich Text & File Attachments**: Integrate AWS S3 / Cloud Storage presigned URLs for uploading UI mockups and logs directly onto stories and tasks.
5. **Real Email & Slack Notifications**: Integrate SendGrid or AWS SES for transactional reminder emails and Slack/Discord incoming webhook alerts.
6. **Single Sign-On (SSO)**: Add Google/GitHub OAuth2 and SAML 2.0 enterprise identity provider integrations.
7. **Playwright End-to-End Test Suite**: Complete headless browser automation test suite simulating multi-user drag-and-drop interactions.
8. **Observability**: Prometheus metrics exporter and OpenTelemetry distributed tracing spans.

---

## 🔗 Links & Resources
- **Frontend App (Local)**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Walkthrough Video**: *(Upload your video link or GitHub release link here)*
- **Interactive REST Collection**: See [`api_collection.http`](./api_collection.http)
- **Detailed Documentation**:
  - [Architecture Specification](./docs/ARCHITECTURE.md)
  - [Complete API Reference](./docs/API.md)
  - [Database Schema & ER Diagram](./docs/DATABASE.md)
  - [Design Decisions & Tradeoffs](./docs/DESIGN_DECISIONS.md)
  - [Security Considerations](./docs/SECURITY.md)
  - [AI Usage Statement](./docs/AI_USAGE.md)
