from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    story_id: Optional[int] = None
    task_id: Optional[int] = None


class CommentRead(BaseModel):
    id: int
    user_id: int
    story_id: Optional[int] = None
    task_id: Optional[int] = None
    content: str
    created_at: datetime
    updated_at: datetime
    user: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)
