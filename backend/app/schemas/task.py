from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.comment import CommentRead
from app.schemas.user import UserRead


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field(default="To Do", pattern="^(To Do|In Progress|Blocked|Done)$")
    priority: str = Field(default="Medium", pattern="^(Low|Medium|High|Critical)$")
    assignee_id: Optional[int] = None
    estimate_hours: Optional[float] = Field(default=None, ge=0)
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    position: Optional[float] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(To Do|In Progress|Blocked|Done)$")
    priority: Optional[str] = Field(default=None, pattern="^(Low|Medium|High|Critical)$")
    assignee_id: Optional[int] = None
    estimate_hours: Optional[float] = Field(default=None, ge=0)
    due_date: Optional[datetime] = None
    position: Optional[float] = None


class TaskReorder(BaseModel):
    position: float
    status: Optional[str] = Field(default=None, pattern="^(To Do|In Progress|Blocked|Done)$")


class TaskRead(TaskBase):
    id: int
    story_id: int
    position: float
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserRead] = None
    comments: Optional[List[CommentRead]] = None

    model_config = ConfigDict(from_attributes=True)
