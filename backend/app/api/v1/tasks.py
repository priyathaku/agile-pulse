from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentRead
from app.schemas.common import PaginatedResponse
from app.schemas.task import TaskRead, TaskReorder, TaskUpdate
from app.services.comment_service import CommentService
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/my", response_model=PaginatedResponse[TaskRead])
def get_my_tasks(
    status: Optional[str] = Query(
        None, description="Filter by status: To Do, In Progress, Blocked, Done"
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TaskService(db)
    items, total = service.list_my_tasks(
        current_user=current_user,
        status=status,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TaskService(db)
    return service.get_task(task_id, current_user)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TaskService(db)
    return service.update_task(task_id, data, current_user)


@router.put("/{task_id}/reorder", response_model=TaskRead)
def reorder_task(
    task_id: int,
    data: TaskReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TaskService(db)
    return service.reorder_task(task_id, data, current_user)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = TaskService(db)
    service.delete_task(task_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Comments on Task
@router.get("/{task_id}/comments", response_model=List[CommentRead])
def list_task_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment_service = CommentService(db)
    return comment_service.list_comments_for_task(task_id, current_user)


@router.post("/{task_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_task_comment(
    task_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment_service = CommentService(db)
    data.task_id = task_id
    return comment_service.create_comment(data, current_user)
