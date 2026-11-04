from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.comment import CommentRead
from app.schemas.task import TaskRead
from app.schemas.user import UserRead


class StoryBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    status: str = Field(default="Backlog", pattern="^(Backlog|Ready|In Progress|In Review|Done)$")
    priority: str = Field(default="Medium", pattern="^(Low|Medium|High|Critical)$")
    story_points: Optional[int] = Field(default=None, ge=0)
    assignee_id: Optional[int] = None


class StoryCreate(StoryBase):
    position: Optional[float] = None


class StoryUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    status: Optional[str] = Field(
        default=None, pattern="^(Backlog|Ready|In Progress|In Review|Done)$"
    )
    priority: Optional[str] = Field(default=None, pattern="^(Low|Medium|High|Critical)$")
    story_points: Optional[int] = Field(default=None, ge=0)
    assignee_id: Optional[int] = None
    position: Optional[float] = None


class StoryReorder(BaseModel):
    position: float
    status: Optional[str] = Field(
        default=None, pattern="^(Backlog|Ready|In Progress|In Review|Done)$"
    )


class StoryRead(StoryBase):
    id: int
    project_id: int
    position: float
    progress_pct: float = 0.0
    tasks_count: int = 0
    tasks_done_count: int = 0
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)


class StoryDetailRead(StoryRead):
    tasks: List[TaskRead] = []
    comments: List[CommentRead] = []
