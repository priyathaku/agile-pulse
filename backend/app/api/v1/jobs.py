from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.user import User
from app.repositories.job_repo import JobRepository
from app.schemas.job import JobRead, JobRetryResponse

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


@router.get("/{job_id}", response_model=JobRead)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = JobRepository(db)
    job = repo.get_by_id(job_id)
    if not job:
        raise NotFoundException("Background job not found")
    return JobRead.model_validate(job)


@router.get("", response_model=List[JobRead])
def list_jobs(
    status: Optional[str] = Query(None, description="pending, running, succeeded, failed, dead"),
    job_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = JobRepository(db)
    jobs = repo.list_jobs(status=status, job_type=job_type, limit=limit, offset=offset)
    return [JobRead.model_validate(j) for j in jobs]


@router.post("/{job_id}/retry", response_model=JobRetryResponse)
def retry_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = JobRepository(db)
    job = repo.get_by_id(job_id)
    if not job:
        raise NotFoundException("Background job not found")

    if job.status not in ["dead", "failed"]:
        raise BadRequestException(
            f"Cannot retry a job in '{job.status}' status (must be 'dead' or 'failed')"
        )

    retried = repo.retry_dead_job(job_id)
    return JobRetryResponse(
        job_id=retried.id,
        status=retried.status,
        message=f"Job {job_id} successfully queued for retry.",
    )
