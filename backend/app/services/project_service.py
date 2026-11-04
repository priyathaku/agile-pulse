from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.models.project import Project, ProjectMember
from app.models.story import UserStory
from app.models.task import Task
from app.models.user import User
from app.repositories.activity_repo import ActivityRepository
from app.repositories.job_repo import JobRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.user_repo import UserRepository
from app.schemas.project import (
    AssigneeWorkload,
    ProjectCreate,
    ProjectDashboardRead,
    ProjectRead,
    ProjectUpdate,
)


class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.user_repo = UserRepository(db)
        self.activity_repo = ActivityRepository(db)
        self.job_repo = JobRepository(db)

    def check_membership(self, project_id: int, user_id: int) -> ProjectMember:
        member = self.project_repo.get_member(project_id, user_id)
        if not member:
            raise ForbiddenException("You are not a member of this project")
        return member

    def check_owner(self, project_id: int, user_id: int) -> ProjectMember:
        member = self.check_membership(project_id, user_id)
        if member.role != "owner":
            raise ForbiddenException("Only the project owner can perform this action")
        return member

    def create_project(self, data: ProjectCreate, current_user: User) -> Project:
        existing = self.project_repo.get_by_key(data.key)
        if existing:
            raise ConflictException(f"Project key '{data.key.upper()}' is already taken")

        project = self.project_repo.create(
            name=data.name,
            key=data.key,
            description=data.description,
            owner_id=current_user.id,
        )

        self.activity_repo.log_activity(
            project_id=project.id,
            user_id=current_user.id,
            action="project_created",
            entity_type="project",
            entity_id=project.id,
            details={"name": project.name, "key": project.key},
        )
        return project

    def get_project(self, project_id: int, user_id: int) -> Project:
        self.check_membership(project_id, user_id)
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")
        return project

    def update_project(self, project_id: int, data: ProjectUpdate, current_user: User) -> Project:
        self.check_owner(project_id, current_user.id)
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        updated = self.project_repo.update(
            project,
            name=data.name,
            description=data.description,
            status=data.status,
        )

        self.activity_repo.log_activity(
            project_id=project.id,
            user_id=current_user.id,
            action="project_updated",
            entity_type="project",
            entity_id=project.id,
            details={
                "updated_fields": {k: v for k, v in data.model_dump().items() if v is not None}
            },
        )
        return updated

    def delete_project(self, project_id: int, current_user: User) -> None:
        self.check_owner(project_id, current_user.id)
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        self.project_repo.delete(project)

    def list_user_projects(
        self,
        user_id: int,
        search: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProjectRead], int]:
        projects, total = self.project_repo.list_for_user(
            user_id=user_id,
            search=search,
            status=status,
            limit=limit,
            offset=offset,
        )

        result: List[ProjectRead] = []
        for p in projects:
            p_read = ProjectRead.model_validate(p)
            p_read.members_count = len(p.members)
            p_read.stories_count = len(p.stories)
            result.append(p_read)

        return result, total

    def add_member(
        self, project_id: int, user_email: str, role: str, current_user: User
    ) -> ProjectMember:
        self.check_owner(project_id, current_user.id)
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        target_user = self.user_repo.get_by_email(user_email)
        if not target_user:
            raise NotFoundException(f"User with email '{user_email}' not found")

        existing_member = self.project_repo.get_member(project_id, target_user.id)
        if existing_member:
            raise ConflictException("User is already a member of this project")

        member = self.project_repo.add_member(project_id, target_user.id, role)

        self.activity_repo.log_activity(
            project_id=project.id,
            user_id=current_user.id,
            action="member_added",
            entity_type="member",
            entity_id=member.id,
            details={"user_id": target_user.id, "email": target_user.email, "role": role},
        )

        # Enqueue background notification
        self.job_repo.enqueue(
            job_type="send_notification",
            payload={
                "user_id": target_user.id,
                "title": f"Added to project {project.name}",
                "message": f"You were added as a {role} to project '{project.name}' ({project.key}) by {current_user.full_name}.",
                "link": f"/projects/{project.id}",
            },
        )

        return member

    def remove_member(self, project_id: int, user_id: int, current_user: User) -> None:
        self.check_owner(project_id, current_user.id)
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        member = self.project_repo.get_member(project_id, user_id)
        if not member:
            raise NotFoundException("Project member not found")

        if member.user_id == project.owner_id:
            raise ForbiddenException("Cannot remove the primary project owner")

        self.project_repo.remove_member(member)

        self.activity_repo.log_activity(
            project_id=project.id,
            user_id=current_user.id,
            action="member_removed",
            entity_type="member",
            entity_id=member.id,
            details={"removed_user_id": user_id},
        )

    def list_members(self, project_id: int, current_user: User) -> List[ProjectMember]:
        self.check_membership(project_id, current_user.id)
        return self.project_repo.list_members(project_id)

    def get_dashboard(self, project_id: int, current_user: User) -> ProjectDashboardRead:
        project = self.get_project(project_id, current_user.id)

        # Query all stories and child tasks for this project
        stories = self.db.query(UserStory).filter(UserStory.project_id == project_id).all()
        tasks = (
            self.db.query(Task)
            .join(UserStory, Task.story_id == UserStory.id)
            .filter(UserStory.project_id == project_id)
            .all()
        )

        story_status_counts = {
            "Backlog": 0,
            "Ready": 0,
            "In Progress": 0,
            "In Review": 0,
            "Done": 0,
        }
        for s in stories:
            if s.status in story_status_counts:
                story_status_counts[s.status] += 1

        task_status_counts = {
            "To Do": 0,
            "In Progress": 0,
            "Blocked": 0,
            "Done": 0,
        }
        for t in tasks:
            if t.status in task_status_counts:
                task_status_counts[t.status] += 1

        total_tasks = len(tasks)
        done_tasks = task_status_counts["Done"]
        overall_progress = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        now = datetime.now(timezone.utc)
        overdue_count = 0
        for t in tasks:
            if t.due_date and t.status != "Done":
                # handle timezone naive or aware comparison
                t_due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
                if t_due < now:
                    overdue_count += 1

        # Workload per assignee
        workload_map: Dict[Optional[int], AssigneeWorkload] = {}
        # Prepopulate with all project members
        members = self.project_repo.list_members(project_id)
        for m in members:
            workload_map[m.user_id] = AssigneeWorkload(
                user_id=m.user_id,
                user_name=m.user.full_name,
                task_count=0,
                story_count=0,
                story_points=0,
                estimated_hours=0.0,
            )
        workload_map[None] = AssigneeWorkload(
            user_id=None,
            user_name="Unassigned",
            task_count=0,
            story_count=0,
            story_points=0,
            estimated_hours=0.0,
        )

        for s in stories:
            if s.assignee_id in workload_map:
                workload_map[s.assignee_id].story_count += 1
                workload_map[s.assignee_id].story_points += s.story_points or 0
            else:
                workload_map[None].story_count += 1
                workload_map[None].story_points += s.story_points or 0

        for t in tasks:
            if t.assignee_id in workload_map:
                workload_map[t.assignee_id].task_count += 1
                workload_map[t.assignee_id].estimated_hours += t.estimate_hours or 0.0
            else:
                workload_map[None].task_count += 1
                workload_map[None].estimated_hours += t.estimate_hours or 0.0

        p_read = ProjectRead.model_validate(project)
        p_read.members_count = len(project.members)
        p_read.stories_count = len(stories)

        return ProjectDashboardRead(
            project=p_read,
            story_status_counts=story_status_counts,
            task_status_counts=task_status_counts,
            total_stories=len(stories),
            total_tasks=total_tasks,
            overall_progress_pct=overall_progress,
            overdue_tasks_count=overdue_count,
            workload_per_assignee=list(workload_map.values()),
        )
