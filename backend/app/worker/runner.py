import logging
import signal
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Callable, Dict

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.job import Job
from app.repositories.job_repo import JobRepository
from app.worker.handlers.notifications import handle_send_notification
from app.worker.handlers.reminders import handle_due_date_reminders
from app.worker.handlers.reports import handle_generate_project_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("worker.runner")


class Worker:
    def __init__(self, worker_id: str = None):
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        self.running = False
        self.handlers: Dict[str, Callable[[Session, dict], dict]] = {
            "send_notification": handle_send_notification,
            "due_date_reminders": handle_due_date_reminders,
            "generate_project_report": handle_generate_project_report,
        }
        self.last_stale_lock_check = 0.0
        self.last_reminder_enqueue = 0.0

    def register_handler(self, job_type: str, handler: Callable[[Session, dict], dict]):
        self.handlers[job_type] = handler

    def process_one_job(self, db: Session) -> bool:
        """
        Attempts to claim and execute a single job.
        Returns True if a job was found and processed, False otherwise.
        """
        repo = JobRepository(db)
        job = repo.claim_next_job(self.worker_id)
        if not job:
            return False

        job_id = job.id
        job_type = job.type
        payload = job.payload or {}

        logger.info(
            f"[{self.worker_id}] Claimed job {job_id} (type: '{job_type}', attempt: {job.attempts}/{job.max_attempts})"
        )

        handler = self.handlers.get(job_type)
        if not handler:
            error_msg = f"No handler registered for job type '{job_type}'"
            logger.error(error_msg)
            repo.mark_failure(job_id, error_msg)
            return True

        try:
            result = handler(db, payload)
            repo.mark_success(job_id, result)
            logger.info(f"[{self.worker_id}] Successfully processed job {job_id} ({job_type})")
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.exception(f"[{self.worker_id}] Failed to process job {job_id}: {error_msg}")
            repo.mark_failure(job_id, error_msg)

        return True

    def maintain_scheduler(self, db: Session):
        """Periodically recovers stale locks and schedules recurring tasks."""
        now = time.time()
        repo = JobRepository(db)

        # Stale lock recovery every 60s
        if now - self.last_stale_lock_check > 60:
            stale_recovered = repo.recover_stale_locks(
                timeout_seconds=settings.WORKER_LOCK_TIMEOUT_SECONDS
            )
            if stale_recovered > 0:
                logger.warning(f"[{self.worker_id}] Recovered {stale_recovered} stale locked jobs.")
            self.last_stale_lock_check = now

        # Recurring due date reminder scan every 120s
        if now - self.last_reminder_enqueue > 120:
            existing_active = (
                db.query(Job)
                .filter(
                    Job.type == "due_date_reminders",
                    Job.status.in_(["pending", "running"]),
                )
                .first()
            )
            if not existing_active:
                repo.enqueue("due_date_reminders", {})
                logger.info(f"[{self.worker_id}] Enqueued scheduled 'due_date_reminders' job.")
            self.last_reminder_enqueue = now

    def run(self):
        """Main worker polling loop with graceful shutdown."""
        self.running = True
        logger.info(f"Starting Background Job Worker [{self.worker_id}]...")

        def _handle_shutdown(signum, frame):
            logger.info(
                f"[{self.worker_id}] Received shutdown signal ({signum}). Finishing up current tasks..."
            )
            self.running = False

        # Register signal handlers for clean exit
        signal.signal(signal.SIGINT, _handle_shutdown)
        signal.signal(signal.SIGTERM, _handle_shutdown)

        while self.running:
            db = SessionLocal()
            try:
                self.maintain_scheduler(db)
                had_job = self.process_one_job(db)
                if not had_job:
                    time.sleep(settings.WORKER_POLL_INTERVAL_SECONDS)
            except Exception as e:
                logger.error(
                    f"[{self.worker_id}] Unexpected error in worker loop: {e}", exc_info=True
                )
                time.sleep(settings.WORKER_POLL_INTERVAL_SECONDS)
            finally:
                db.close()

        logger.info(f"Worker [{self.worker_id}] exited cleanly.")


if __name__ == "__main__":
    worker = Worker()
    worker.run()
