from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.models.job import Job
from app.models.user import User
from app.repositories.activity_repo import ActivityRepository
from app.repositories.job_repo import JobRepository
from app.schemas.activity import ActivityLogRead
from app.schemas.common import PaginatedResponse
from app.schemas.job import JobRead, ReportGenerateRequest, ReportJobResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectDashboardRead,
    ProjectMemberCreate,
    ProjectMemberRead,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.story import StoryCreate, StoryRead
from app.services.project_service import ProjectService
from app.services.story_service import StoryService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=PaginatedResponse[ProjectRead])
def list_projects(
    search: Optional[str] = Query(None, description="Search by name, key, or description"),
    status: Optional[str] = Query(None, description="Filter by status: active, archived"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    items, total = service.list_user_projects(
        user_id=current_user.id,
        search=search,
        status=status,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    project = service.create_project(data, current_user)
    p_read = ProjectRead.model_validate(project)
    p_read.members_count = 1
    p_read.stories_count = 0
    return p_read


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    project = service.get_project(project_id, current_user.id)
    p_read = ProjectRead.model_validate(project)
    p_read.members_count = len(project.members)
    p_read.stories_count = len(project.stories)
    return p_read


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    project = service.update_project(project_id, data, current_user)
    p_read = ProjectRead.model_validate(project)
    p_read.members_count = len(project.members)
    p_read.stories_count = len(project.stories)
    return p_read


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.delete_project(project_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/dashboard", response_model=ProjectDashboardRead)
def get_project_dashboard(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    return service.get_dashboard(project_id, current_user)


@router.get("/{project_id}/members", response_model=List[ProjectMemberRead])
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    members = service.list_members(project_id, current_user)
    return [ProjectMemberRead.model_validate(m) for m in members]


@router.post(
    "/{project_id}/members", response_model=ProjectMemberRead, status_code=status.HTTP_201_CREATED
)
def add_project_member(
    project_id: int,
    data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    member = service.add_member(project_id, data.user_email, data.role, current_user)
    return ProjectMemberRead.model_validate(member)


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.remove_member(project_id, user_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{project_id}/activity", response_model=List[ActivityLogRead])
def get_project_activity(
    project_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.check_membership(project_id, current_user.id)
    activity_repo = ActivityRepository(db)
    logs = activity_repo.list_by_project(project_id, limit=limit, offset=offset)
    return [ActivityLogRead.model_validate(log) for log in logs]


# Workflow 3: Background Project Report
@router.post(
    "/{project_id}/reports", response_model=ReportJobResponse, status_code=status.HTTP_202_ACCEPTED
)
def request_project_report(
    project_id: int,
    data: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.check_membership(project_id, current_user.id)

    job_repo = JobRepository(db)
    job = job_repo.enqueue(
        job_type="generate_project_report",
        payload={
            "project_id": project_id,
            "format": data.format,
            "requested_by": current_user.id,
        },
    )

    return ReportJobResponse(
        job_id=job.id,
        status="pending",
        message="Project report generation has been queued in the background.",
    )


@router.get("/{project_id}/reports", response_model=List[JobRead])
def list_project_reports(
    project_id: int,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.check_membership(project_id, current_user.id)

    # Filter jobs of type generate_project_report for this project
    jobs = (
        db.query(Job)
        .filter(
            Job.type == "generate_project_report",
        )
        .order_by(Job.created_at.desc())
        .limit(100)
        .all()
    )
    # Match project_id in JSON payload
    project_jobs = [j for j in jobs if j.payload and j.payload.get("project_id") == project_id][
        :limit
    ]
    return [JobRead.model_validate(j) for j in project_jobs]


@router.get("/{project_id}/reports/{job_id}/download")
def download_project_report(
    project_id: int,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProjectService(db)
    service.check_membership(project_id, current_user.id)

    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job or job.type != "generate_project_report":
        raise NotFoundException("Report job not found")

    if job.payload.get("project_id") != project_id:
        raise NotFoundException("Report job does not belong to this project")

    if job.status != "succeeded" or not job.result:
        return Response(
            content=f'{{"status": "{job.status}", "message": "Report is not ready yet."}}',
            status_code=status.HTTP_200_OK,
            media_type="application/json",
        )

    format_type = job.payload.get("format", "json")
    if format_type == "csv":
        csv_content = job.result.get("csv_content", "")
        return PlainTextResponse(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="report-project-{project_id}.csv"'
            },
        )
    else:
        return job.result


# User Stories under Project
@router.get("/{project_id}/stories", response_model=PaginatedResponse[StoryRead])
def list_project_stories(
    project_id: int,
    status: Optional[str] = Query(None, description="Backlog, Ready, In Progress, In Review, Done"),
    priority: Optional[str] = Query(None, description="Low, Medium, High, Critical"),
    assignee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("position"),
    sort_order: str = Query("asc"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    story_service = StoryService(db)
    items, total = story_service.list_stories(
        project_id=project_id,
        current_user=current_user,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/{project_id}/stories", response_model=StoryRead, status_code=status.HTTP_201_CREATED)
def create_project_story(
    project_id: int,
    data: StoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    story_service = StoryService(db)
    return story_service.create_story(project_id, data, current_user)
