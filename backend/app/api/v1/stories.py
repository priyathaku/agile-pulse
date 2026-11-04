from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.common import PaginatedResponse
from app.schemas.story import StoryDetailRead, StoryRead, StoryReorder, StoryUpdate
from app.schemas.task import TaskCreate, TaskRead
from app.services.comment_service import CommentService
from app.services.story_service import StoryService
from app.services.task_service import TaskService

router = APIRouter(prefix="/stories", tags=["User Stories"])


@router.get("/{story_id}", response_model=StoryDetailRead)
def get_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StoryService(db)
    return service.get_story(story_id, current_user)


@router.patch("/{story_id}", response_model=StoryRead)
def update_story(
    story_id: int,
    data: StoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StoryService(db)
    return service.update_story(story_id, data, current_user)


@router.put("/{story_id}/reorder", response_model=StoryRead)
def reorder_story(
    story_id: int,
    data: StoryReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StoryService(db)
    return service.reorder_story(story_id, data, current_user)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StoryService(db)
    service.delete_story(story_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Nested Tasks under Story
@router.get("/{story_id}/tasks", response_model=PaginatedResponse[TaskRead])
def list_story_tasks(
    story_id: int,
    status: Optional[str] = Query(None, description="To Do, In Progress, Blocked, Done"),
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
    task_service = TaskService(db)
    items, total = task_service.list_tasks_for_story(
        story_id=story_id,
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


@router.post("/{story_id}/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_story_task(
    story_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task_service = TaskService(db)
    return task_service.create_task(story_id, data, current_user)


# Comments on Story
@router.get("/{story_id}/comments", response_model=List[CommentRead])
def list_story_comments(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment_service = CommentService(db)
    return comment_service.list_comments_for_story(story_id, current_user)


@router.post(
    "/{story_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED
)
def add_story_comment(
    story_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment_service = CommentService(db)
    data.story_id = story_id
    return comment_service.create_comment(data, current_user)
