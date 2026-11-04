# Design Decisions & Architectural Tradeoffs

This document outlines the core engineering decisions, alternatives considered, and tradeoffs made during the development of AgilePulse.

---

## 1. Backend Framework: FastAPI vs Django / Flask

### Decision: FastAPI + SQLAlchemy 2.0 + Pydantic v2
- **Rationale**:
  - **Type Safety & Schema Validation**: Pydantic v2 compiles validations in Rust, providing unmatched serialization speed and rock-solid request validation.
  - **Automatic OpenAPI Documentation**: Interactive Swagger docs at `/docs` and OpenAPI JSON at `/openapi.json` are generated directly from type hints and Pydantic models.
  - **Modern Asynchronous Core**: FastAPI builds natively on Starlette and Uvicorn ASGI, supporting concurrent I/O alongside synchronous database operations.
  - **SQLAlchemy 2.0**: Clear separation between domain models, repositories, and business services using modern Python typing and declarative mappings.
- **Alternatives Considered**:
  - *Django*: Provides a heavy batteries-included admin and ORM, but introduces bloated abstractions, non-standard async support, and tight coupling.
  - *Flask*: Extremely minimal, but lacks native request validation, schema generation, and async ASGI throughput without numerous third-party plugins.

---

## 2. Database: SQLite vs PostgreSQL

### Decision: SQLite with Persistent Volume & PRAGMA Foreign Keys
- **Rationale**:
  - **Zero External Operational Overhead**: Perfect for small teams (3–10 users). No dedicated database cluster, network latency, or credential management is needed.
  - **Reliable Persistence**: Uses a single WAL (Write-Ahead Logging) database file that persists reliably across container restarts via Docker volumes.
  - **Strict Relational Integrity**: By registering an engine connect hook that executes `PRAGMA foreign_keys=ON;`, SQLite enforces strict foreign key constraints, cascading deletes, and unique checks identical to PostgreSQL.
- **Tradeoffs**:
  - *Concurrency Limit*: SQLite serializes writes. For 3–10 users, write throughput (< 50 transactions/sec) is well within SQLite's capacity (> 1,000 writes/sec in WAL mode). If the organization scales to hundreds of concurrent users, the SQLAlchemy 2.0 abstraction allows switching `DATABASE_URL` to PostgreSQL with zero business logic changes.

---

## 3. Background Processing: DB-Backed Queue vs Celery + Redis

### Decision: Persistent Database-Backed Queue (`jobs` table) with Polling Worker
- **Rationale**:
  - **Operational Simplicity**: Celery requires running a separate Redis or RabbitMQ broker, plus Celery beat for scheduling, plus Flower for monitoring. This creates 3 additional processes to monitor and maintain.
  - **Atomic Transactions**: An enqueued job is inserted in the *exact same database transaction* as the entity that triggered it (e.g. creating a report request and creating its job record). This guarantees no orphan jobs or lost messages.
  - **Full Auditability**: The team can inspect job history, payloads, execution attempts, and last errors using standard SQL queries or the `/api/v1/jobs` endpoint.
  - **Dead-Letter State & Safe Retries**: Failed jobs automatically retry with exponential backoff and jitter up to `max_attempts`. Dead jobs can be retried directly via `POST /jobs/{id}/retry`.
- **Tradeoffs**:
  - *Latency*: The polling interval (2 seconds) introduces up to a 2-second delay before execution starts. For background notifications, due-date reminders, and report generation, 2 seconds is negligible and completely acceptable.

---

## 4. Authentication: Stateless JWT Access Tokens vs Server-Side Sessions

### Decision: Signed HMAC-SHA256 JWT Access Tokens
- **Rationale**:
  - **Stateless Verification**: The API server validates incoming requests using cryptographic signature verification (`SECRET_KEY`) without issuing a database query on every micro-request.
  - **Security Controls**: Tokens have a strict 24-hour expiration window (`ACCESS_TOKEN_EXPIRE_MINUTES`). Passwords are salted and hashed using `bcrypt`. Auth endpoints (`/login` and `/register`) are protected by an in-memory sliding window rate limiter (20 requests/minute) to defeat brute-force attempts.
- **Tradeoffs**:
  - *Token Revocation*: Immediate token blacklisting requires a token revocation list in memory or DB. For small teams, a 24-hour expiration coupled with user account deactivation checks (`user.is_active`) provides the right balance of security and speed.

---

## 5. Client Updates: Smart Polling vs WebSockets / Server-Sent Events

### Decision: TanStack Query Smart Polling with Window Focus Revalidation
- **Rationale**:
  - **Resilience**: WebSockets require stateful connection tracking, heartbeat ping/pong handlers, reconnect loops, and proxy connection upgrades. If an Nginx proxy or network drops, socket states become inconsistent.
  - **TanStack Query (React Query)**: Automatically manages cache invalidation, background refetching on window focus, and optimistic updates.
  - **Job Polling**: When a user triggers an async project report, the frontend polls `/jobs/{id}` at 2-second intervals only while the job is in `pending` or `running` status, stopping as soon as `succeeded` or `failed` is reached.

---

## 6. Strict Hierarchy & Auto-Promotion Rule

### Decision: Strict Project $\rightarrow$ User Story $\rightarrow$ Task Hierarchy with Automatic Story Promotion
- **Chosen Behavior for Story Progression**:
  1. A Project contains User Stories; User Stories contain Tasks.
  2. Each story tracks its progress percentage dynamically:
     $$\text{Progress \%} = \frac{\text{Completed Child Tasks}}{\text{Total Child Tasks}} \times 100$$
  3. **Auto-Promotion Rule**: When an engineer marks the final remaining task in a story as "Done" (so 100% of tasks are completed):
     - If the story is in `Backlog`, `Ready`, or `In Progress`, it **automatically moves to `In Review`** to signal that engineering deliverables are ready for verification or QA.
     - If the story is already in `In Review`, it **automatically moves to `Done`**.
     - An audit log entry (`story_auto_promoted`) is written to `activity_logs`, and an asynchronous notification is dispatched to the story assignee and project owner.

---

## 7. Reordering Strategy: Float Position Ranks vs Linked Lists

### Decision: Floating-Point Position Ranks
- **Rationale**:
  - When reordering cards via drag-and-drop on the Kanban board or Hierarchy tree, recalculating index columns for all subsequent rows requires an $O(N)$ bulk update query across the entire table.
  - By using a floating-point `position` column (e.g. initial items spaced by $1000.0, 2000.0, 3000.0$), moving an item between two items requires only updating that single row to the midpoint:
    $$\text{New Position} = \frac{\text{Pos}_{\text{before}} + \text{Pos}_{\text{after}}}{2}$$
  - This turns card reordering into an instantaneous $O(1)$ single-row update query.
