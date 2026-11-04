from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.story import UserStory
from app.models.task import Task


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, task_id: int) -> Optional[Task]:
        return (
            self.db.query(Task)
            .options(
                joinedload(Task.assignee),
                joinedload(Task.story).joinedload(UserStory.project),
            )
            .filter(Task.id == task_id)
            .first()
        )

    def get_max_position(self, story_id: int) -> float:
        max_pos = self.db.query(func.max(Task.position)).filter(Task.story_id == story_id).scalar()
        return float(max_pos) if max_pos is not None else 0.0

    def create(
        self,
        story_id: int,
        title: str,
        description: Optional[str] = None,
        status: str = "To Do",
        priority: str = "Medium",
        assignee_id: Optional[int] = None,
        estimate_hours: Optional[float] = None,
        due_date: Optional[datetime] = None,
        position: Optional[float] = None,
    ) -> Task:
        if position is None:
            position = self.get_max_position(story_id) + 1000.0

        task = Task(
            story_id=story_id,
            title=title.strip(),
            description=description.strip() if description else None,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            estimate_hours=estimate_hours,
            due_date=due_date,
            position=position,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task: Task, **kwargs) -> Task:
        for key, value in kwargs.items():
            if value is not None:
                setattr(task, key, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
        self.db.commit()

    def list_by_story(
        self,
        story_id: int,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "position",
        sort_order: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Task], int]:
        query = (
            self.db.query(Task).options(joinedload(Task.assignee)).filter(Task.story_id == story_id)
        )

        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        if assignee_id is not None:
            query = query.filter(Task.assignee_id == assignee_id)
        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    Task.title.ilike(term),
                    Task.description.ilike(term),
                )
            )

        total = query.count()
        sort_attr = getattr(Task, sort_by, Task.position)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_attr.desc(), Task.id.desc())
        else:
            query = query.order_by(sort_attr.asc(), Task.id.asc())

        tasks = query.offset(offset).limit(limit).all()
        return tasks, total

    def list_for_user(
        self,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Task], int]:
        """Fetch tasks assigned to a specific user across all projects."""
        query = (
            self.db.query(Task)
            .options(
                joinedload(Task.assignee),
                joinedload(Task.story).joinedload(UserStory.project),
            )
            .filter(Task.assignee_id == user_id)
        )
        if status:
            query = query.filter(Task.status == status)

        total = query.count()
        tasks = (
            query.order_by(Task.due_date.asc().nulls_last(), Task.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return tasks, total

    def get_upcoming_or_overdue_tasks(self, cutoff_time: datetime) -> List[Task]:
        """Finds non-done tasks with a due_date <= cutoff_time (e.g. now + 24 hours)."""
        return (
            self.db.query(Task)
            .options(
                joinedload(Task.assignee),
                joinedload(Task.story).joinedload(UserStory.project),
            )
            .filter(
                Task.status != "Done",
                Task.due_date.isnot(None),
                Task.due_date <= cutoff_time,
                Task.assignee_id.isnot(None),
            )
            .all()
        )
