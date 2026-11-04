from datetime import datetime, timedelta, timezone

from app.models.job import Job
from app.repositories.job_repo import JobRepository
from app.worker.runner import Worker


def test_job_enqueue_and_safe_claim(db):
    repo = JobRepository(db)
    job = repo.enqueue(job_type="test_job", payload={"key": "val"})
    assert job.status == "pending"
    assert job.attempts == 0

    # Worker 1 claims job
    claimed = repo.claim_next_job(worker_id="worker-1")
    assert claimed is not None
    assert claimed.id == job.id
    assert claimed.status == "running"
    assert claimed.locked_by == "worker-1"
    assert claimed.attempts == 1

    # Worker 2 attempts to claim -> no eligible jobs
    claimed_again = repo.claim_next_job(worker_id="worker-2")
    assert claimed_again is None


def test_job_backoff_and_dead_letter(db):
    repo = JobRepository(db)
    # Enqueue job with max_attempts=2
    job = repo.enqueue(job_type="failing_job", payload={}, max_attempts=2)

    # First claim & failure -> should backoff (status 'pending', run_at in future)
    claimed = repo.claim_next_job("worker-1")
    failed = repo.mark_failure(claimed.id, "Simulated transient failure")
    assert failed.status == "pending"
    assert failed.attempts == 1
    run_at_aware = (
        failed.run_at if failed.run_at.tzinfo else failed.run_at.replace(tzinfo=timezone.utc)
    )
    assert run_at_aware > datetime.now(timezone.utc)

    # Force run_at to past so it can be reclaimed
    failed.run_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()

    # Second claim & failure -> reaches max_attempts (2) -> transitions to 'dead'
    claimed2 = repo.claim_next_job("worker-1")
    dead = repo.mark_failure(claimed2.id, "Second terminal failure")
    assert dead.status == "dead"
    assert dead.attempts == 2

    # Verify admin can retry dead job
    retried = repo.retry_dead_job(dead.id)
    assert retried.status == "pending"
    assert retried.attempts == 0


def test_stale_lock_recovery(db):
    repo = JobRepository(db)
    now = datetime.now(timezone.utc)
    # Job claimed 10 minutes ago, worker died
    stuck_job = Job(
        type="stuck_job",
        payload={},
        status="running",
        attempts=1,
        max_attempts=3,
        run_at=now - timedelta(minutes=10),
        locked_by="dead-worker",
        locked_at=now - timedelta(minutes=10),
    )
    db.add(stuck_job)
    db.commit()

    # Run stale lock recovery
    recovered_count = repo.recover_stale_locks(timeout_seconds=300)
    assert recovered_count == 1

    db.refresh(stuck_job)
    assert stuck_job.status == "pending"
    assert stuck_job.locked_by is None
    assert "Stale lock detected" in stuck_job.last_error
