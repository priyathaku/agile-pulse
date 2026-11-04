from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project, ProjectMember
from app.models.user import User


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: int) -> Optional[Project]:
        return (
            self.db.query(Project)
            .options(joinedload(Project.owner))
            .filter(Project.id == project_id)
            .first()
        )

    def get_by_key(self, key: str) -> Optional[Project]:
        return self.db.query(Project).filter(Project.key == key.upper().strip()).first()

    def create(self, name: str, key: str, description: Optional[str], owner_id: int) -> Project:
        project = Project(
            name=name.strip(),
            key=key.upper().strip(),
            description=description.strip() if description else None,
            owner_id=owner_id,
            status="active",
        )
        self.db.add(project)
        self.db.flush()

        # Add creator as owner member
        member = ProjectMember(
            project_id=project.id,
            user_id=owner_id,
            role="owner",
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update(self, project: Project, **kwargs) -> Project:
        for key, value in kwargs.items():
            if value is not None:
                setattr(project, key, value)
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete(self, project: Project) -> None:
        self.db.delete(project)
        self.db.commit()

    def list_for_user(
        self,
        user_id: int,
        search: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Project], int]:
        # Filter projects where user is owner or member
        query = (
            self.db.query(Project)
            .join(ProjectMember, Project.id == ProjectMember.project_id)
            .filter(ProjectMember.user_id == user_id)
            .options(joinedload(Project.owner))
        )

        if status:
            query = query.filter(Project.status == status)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Project.name.ilike(search_term),
                    Project.key.ilike(search_term),
                    Project.description.ilike(search_term),
                )
            )

        total = query.count()
        projects = query.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()
        return projects, total

    def get_member(self, project_id: int, user_id: int) -> Optional[ProjectMember]:
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
            .first()
        )

    def add_member(self, project_id: int, user_id: int, role: str = "member") -> ProjectMember:
        member = ProjectMember(project_id=project_id, user_id=user_id, role=role)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def remove_member(self, member: ProjectMember) -> None:
        self.db.delete(member)
        self.db.commit()

    def list_members(self, project_id: int) -> List[ProjectMember]:
        return (
            self.db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(ProjectMember.project_id == project_id)
            .order_by(ProjectMember.joined_at.asc())
            .all()
        )
