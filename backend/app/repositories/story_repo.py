from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.story import UserStory
from app.models.task import Task


class StoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, story_id: int) -> Optional[UserStory]:
        return (
            self.db.query(UserStory)
            .options(
                joinedload(UserStory.assignee),
                joinedload(UserStory.tasks).joinedload(Task.assignee),
            )
            .filter(UserStory.id == story_id)
            .first()
        )

    def get_max_position(self, project_id: int) -> float:
        max_pos = (
            self.db.query(func.max(UserStory.position))
            .filter(UserStory.project_id == project_id)
            .scalar()
        )
        return float(max_pos) if max_pos is not None else 0.0

    def create(
        self,
        project_id: int,
        title: str,
        description: Optional[str] = None,
        acceptance_criteria: Optional[str] = None,
        status: str = "Backlog",
        priority: str = "Medium",
        story_points: Optional[int] = None,
        assignee_id: Optional[int] = None,
        position: Optional[float] = None,
    ) -> UserStory:
        if position is None:
            position = self.get_max_position(project_id) + 1000.0

        story = UserStory(
            project_id=project_id,
            title=title.strip(),
            description=description.strip() if description else None,
            acceptance_criteria=acceptance_criteria.strip() if acceptance_criteria else None,
            status=status,
            priority=priority,
            story_points=story_points,
            assignee_id=assignee_id,
            position=position,
        )
        self.db.add(story)
        self.db.commit()
        self.db.refresh(story)
        return story

    def update(self, story: UserStory, **kwargs) -> UserStory:
        for key, value in kwargs.items():
            if value is not None:
                setattr(story, key, value)
        self.db.commit()
        self.db.refresh(story)
        return story

    def delete(self, story: UserStory) -> None:
        self.db.delete(story)
        self.db.commit()

    def list_by_project(
        self,
        project_id: int,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "position",
        sort_order: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[UserStory], int]:
        query = (
            self.db.query(UserStory)
            .options(
                joinedload(UserStory.assignee),
                joinedload(UserStory.tasks),
            )
            .filter(UserStory.project_id == project_id)
        )

        if status:
            query = query.filter(UserStory.status == status)
        if priority:
            query = query.filter(UserStory.priority == priority)
        if assignee_id is not None:
            query = query.filter(UserStory.assignee_id == assignee_id)
        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    UserStory.title.ilike(term),
                    UserStory.description.ilike(term),
                    UserStory.acceptance_criteria.ilike(term),
                )
            )

        total = query.count()

        # Sorting
        sort_attr = getattr(UserStory, sort_by, UserStory.position)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_attr.desc(), UserStory.id.desc())
        else:
            query = query.order_by(sort_attr.asc(), UserStory.id.asc())

        stories = query.offset(offset).limit(limit).all()
        return stories, total
