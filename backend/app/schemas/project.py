from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserRead


class ProjectMemberBase(BaseModel):
    role: str = Field(default="member", pattern="^(owner|member)$")


class ProjectMemberCreate(ProjectMemberBase):
    user_email: EmailStr


class ProjectMemberUpdate(ProjectMemberBase):
    pass


class ProjectMemberRead(ProjectMemberBase):
    id: int
    project_id: int
    user_id: int
    joined_at: datetime
    user: UserRead

    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    key: str = Field(..., min_length=2, max_length=10, pattern="^[A-Z0-9]+$")
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(active|archived)$")


class ProjectRead(ProjectBase):
    id: int
    status: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
    owner: Optional[UserRead] = None
    members_count: int = 0
    stories_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AssigneeWorkload(BaseModel):
    user_id: Optional[int] = None
    user_name: str
    task_count: int = 0
    story_count: int = 0
    story_points: int = 0
    estimated_hours: float = 0.0


class ProjectDashboardRead(BaseModel):
    project: ProjectRead
    story_status_counts: Dict[str, int]
    task_status_counts: Dict[str, int]
    total_stories: int
    total_tasks: int
    overall_progress_pct: float
    overdue_tasks_count: int
    workload_per_assignee: List[AssigneeWorkload]
