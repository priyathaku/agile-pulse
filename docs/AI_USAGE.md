# AI Usage Statement

In accordance with transparent engineering practices, this document outlines how AI assistance (Google DeepMind Antigravity / Gemini) was leveraged during the development of the Agile Project Management Tool, and how all artifacts were validated by the engineer.

---

## 1. Where AI Assistance Was Leveraged

1. **Architecture & Schema Planning**:
   - Assisting in modeling the strict 3-tier hierarchy (`Project` $\rightarrow$ `UserStory` $\rightarrow$ `Task`) and mapping appropriate relational database foreign key actions (`CASCADE`, `SET NULL`, `RESTRICT`).
   - Designing the lightweight database-backed job queue schema (`jobs` table) with leasing (`locked_by`, `locked_at`) and exponential backoff retry formulas.

2. **Scaffolding & Boilerplate Generation**:
   - Generating initial SQLAlchemy 2.0 ORM models, Pydantic v2 schemas, and FastAPI route signatures.
   - Scaffolding the React 18 + Vite + TypeScript frontend structure and configuring Tailwind CSS utility classes.

3. **Test Suite Generation**:
   - Scaffolding unit and integration tests across pytest (auth, cascading deletes, job queue backoff, due-date reminder scans) and Vitest (React components).

4. **Documentation Drafting**:
   - Producing Mermaid diagram syntax for architecture flows and database entity relationships.

---

## 2. Engineering Verification & Quality Assurance

All AI-generated code and configuration were systematically inspected, tested, and refined:
- **Python 3.13 Compatibility**: Resolved deprecation differences with Pydantic v2 `ConfigDict` and `email-validator` dependencies.
- **SQLite Relational Integrity**: Audited SQLite's default lack of foreign key constraint checking and explicitly implemented the `PRAGMA foreign_keys=ON;` connection event listener.
- **Async Concurrency & Idempotency**: Verified that job claiming uses transactional row selection and that background reminder jobs enforce a 20-hour window to prevent duplicate notification spam.
- **Automated Verification**:
  - Backend: 23 pytest tests executed and verified passing.
  - Backend Linting: Ruff and Black code formatters executed with zero lint errors.
  - Frontend: 9 Vitest component tests executed and passing.
  - Frontend Compilation: TypeScript compiler (`tsc -b`) and Vite production bundle executed with zero errors.
