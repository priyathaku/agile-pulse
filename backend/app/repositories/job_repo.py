import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import Job


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def enqueue(
        self,
        job_type: str,
        payload: Dict[str, Any],
        run_at: Optional[datetime] = None,
        max_attempts: int = 3,
    ) -> Job:
        """Enqueues a new background job."""
        if run_at is None:
            run_at = datetime.now(timezone.utc)

        job = Job(
            type=job_type,
            payload=payload,
            status="pending",
            attempts=0,
            max_attempts=max_attempts,
            run_at=run_at,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def claim_next_job(self, worker_id: str) -> Optional[Job]:
        """
        Safely claims the next eligible job for processing.
        Selects the oldest pending job whose run_at <= now,
        updates locked_by, locked_at, increments attempts, and marks status as running.
        """
        now = datetime.now(timezone.utc)

        # In SQLite, transactions are serialized per connection.
        # We select the candidate job within a transaction:
        candidate = (
            self.db.query(Job)
            .filter(
                Job.status == "pending",
                Job.run_at <= now,
            )
            .order_by(Job.run_at.asc(), Job.created_at.asc())
            .first()
        )

        if not candidate:
            return None

        candidate.status = "running"
        candidate.locked_by = worker_id
        candidate.locked_at = now
        candidate.attempts += 1
        candidate.updated_at = now

        self.db.commit()
        self.db.refresh(candidate)
        return candidate

    def mark_success(self, job_id: str, result: Optional[Dict[str, Any]] = None) -> Optional[Job]:
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None

        now = datetime.now(timezone.utc)
        job.status = "succeeded"
        job.result = result
        job.locked_by = None
        job.locked_at = None
        job.updated_at = now

        self.db.commit()
        self.db.refresh(job)
        return job

    def mark_failure(self, job_id: str, error_message: str) -> Optional[Job]:
        """
        Applies exponential backoff with jitter if attempts < max_attempts,
        otherwise transitions job to 'dead' (dead-letter queue).
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None

        now = datetime.now(timezone.utc)
        job.last_error = error_message
        job.locked_by = None
        job.locked_at = None
        job.updated_at = now

        if job.attempts >= job.max_attempts:
            job.status = "dead"
        else:
            job.status = "pending"
            # Exponential backoff formula with jitter:
            # delay = base_backoff * (2 ** (attempts - 1)) + jitter
            base = settings.WORKER_BASE_BACKOFF_SECONDS
            exponent = max(0, job.attempts - 1)
            backoff_seconds = (base * (2**exponent)) + random.uniform(0.1, 1.0)
            job.run_at = now + timedelta(seconds=backoff_seconds)

        self.db.commit()
        self.db.refresh(job)
        return job

    def recover_stale_locks(self, timeout_seconds: int = 300) -> int:
        """
        Detects jobs stuck in 'running' whose locked_at is older than timeout_seconds.
        Resets them to pending or dead if max attempts exceeded.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=timeout_seconds)

        stale_jobs = (
            self.db.query(Job)
            .filter(
                Job.status == "running",
                Job.locked_at <= cutoff,
            )
            .all()
        )

        count = len(stale_jobs)
        for job in stale_jobs:
            job.locked_by = None
            job.locked_at = None
            job.last_error = (
                f"Stale lock detected (no heartbeat since {job.locked_at}). Auto-recovered."
            )
            job.updated_at = now
            if job.attempts >= job.max_attempts:
                job.status = "dead"
            else:
                job.status = "pending"
                job.run_at = now

        if count > 0:
            self.db.commit()
        return count

    def retry_dead_job(self, job_id: str) -> Optional[Job]:
        """Allows an owner/admin to retry a dead job."""
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None

        now = datetime.now(timezone.utc)
        job.status = "pending"
        job.attempts = 0
        job.run_at = now
        job.last_error = f"Manual retry initiated at {now.isoformat()}"
        job.locked_by = None
        job.locked_at = None
        job.updated_at = now

        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, job_id: str) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == job_id).first()

    def list_jobs(
        self,
        status: Optional[str] = None,
        job_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Job]:
        query = self.db.query(Job)
        if status:
            query = query.filter(Job.status == status)
        if job_type:
            query = query.filter(Job.type == job_type)

        return query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()
