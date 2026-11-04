from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.task import Task
from app.models.user import User
from app.repositories.activity_repo import ActivityRepository
from app.repositories.job_repo import JobRepository
from app.repositories.story_repo import StoryRepository
from app.repositories.task_repo import TaskRepository
from app.schemas.task import TaskCreate, TaskRead, TaskReorder, TaskUpdate
from app.services.project_service import ProjectService


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.task_repo = TaskRepository(db)
        self.story_repo = StoryRepository(db)
        self.project_service = ProjectService(db)
        self.activity_repo = ActivityRepository(db)
        self.job_repo = JobRepository(db)

    def _check_story_access(self, story_id: int, user_id: int):
        story = self.story_repo.get_by_id(story_id)
        if not story:
            raise NotFoundException("User Story not found")
        self.project_service.check_membership(story.project_id, user_id)
        return story

    def create_task(self, story_id: int, data: TaskCreate, current_user: User) -> TaskRead:
        story = self._check_story_access(story_id, current_user.id)

        task = self.task_repo.create(
            story_id=story_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            assignee_id=data.assignee_id,
            estimate_hours=data.estimate_hours,
            due_date=data.due_date,
            position=data.position,
        )

        self.activity_repo.log_activity(
            project_id=story.project_id,
            user_id=current_user.id,
            action="task_created",
            entity_type="task",
            entity_id=task.id,
            details={"title": task.title, "story_id": story_id, "status": task.status},
        )

        if task.assignee_id and task.assignee_id != current_user.id:
            self.job_repo.enqueue(
                job_type="send_notification",
                payload={
                    "user_id": task.assignee_id,
                    "title": f"New Task Assigned: {task.title}",
                    "message": f"{current_user.full_name} assigned you to task '{task.title}' under story '{story.title}'.",
                    "link": f"/projects/{story.project_id}/stories/{story.id}",
                },
            )

        return TaskRead.model_validate(task)

    def get_task(self, task_id: int, current_user: User) -> TaskRead:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found")
        self.project_service.check_membership(task.story.project_id, current_user.id)
        return TaskRead.model_validate(task)

    def update_task(self, task_id: int, data: TaskUpdate, current_user: User) -> TaskRead:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found")
        story = task.story
        self.project_service.check_membership(story.project_id, current_user.id)

        old_status = task.status
        old_assignee = task.assignee_id

        updated = self.task_repo.update(
            task,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            assignee_id=data.assignee_id,
            estimate_hours=data.estimate_hours,
            due_date=data.due_date,
            position=data.position,
        )

        self.activity_repo.log_activity(
            project_id=story.project_id,
            user_id=current_user.id,
            action="task_updated",
            entity_type="task",
            entity_id=updated.id,
            details={
                "updated_fields": {k: v for k, v in data.model_dump().items() if v is not None}
            },
        )

        # Notify if assigned to a new user
        if (
            updated.assignee_id
            and updated.assignee_id != old_assignee
            and updated.assignee_id != current_user.id
        ):
            self.job_repo.enqueue(
                job_type="send_notification",
                payload={
                    "user_id": updated.assignee_id,
                    "title": f"Assigned to Task: {updated.title}",
                    "message": f"{current_user.full_name} assigned you to task '{updated.title}'.",
                    "link": f"/projects/{story.project_id}/stories/{story.id}",
                },
            )

        # Core Hierarchy Rule:
        # Check if all sibling tasks are Done
        self._check_and_auto_transition_story(story, current_user)

        return TaskRead.model_validate(updated)

    def _check_and_auto_transition_story(self, story, current_user: User):
        """
        Rule: When all child tasks in a story are Done, auto-promote the story:
        - If story is in Backlog, Ready, or In Progress -> auto-move to 'In Review'
        - If story is already in 'In Review' -> auto-move to 'Done'
        Logs activity and dispatches event notification.
        """
        all_tasks = story.tasks
        if not all_tasks:
            return

        all_done = all(t.status == "Done" for t in all_tasks)
        if all_done:
            new_status = None
            if story.status in ["Backlog", "Ready", "In Progress"]:
                new_status = "In Review"
            elif story.status == "In Review":
                new_status = "Done"

            if new_status and new_status != story.status:
                old_story_status = story.status
                story.status = new_status
                self.db.commit()
                self.db.refresh(story)

                self.activity_repo.log_activity(
                    project_id=story.project_id,
                    user_id=current_user.id,
                    action="story_auto_promoted",
                    entity_type="story",
                    entity_id=story.id,
                    details={
                        "reason": "All child tasks completed",
                        "old_status": old_story_status,
                        "new_status": new_status,
                    },
                )

                # Send notification to story assignee or project owner
                target_user_id = story.assignee_id or story.project.owner_id
                if target_user_id:
                    self.job_repo.enqueue(
                        job_type="send_notification",
                        payload={
                            "user_id": target_user_id,
                            "title": f"Story Auto-Moved to {new_status}",
                            "message": f"All tasks in '{story.title}' are Done. Story moved from {old_story_status} to {new_status}.",
                            "link": f"/projects/{story.project_id}/stories/{story.id}",
                        },
                    )

    def reorder_task(self, task_id: int, data: TaskReorder, current_user: User) -> TaskRead:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found")
        story = task.story
        self.project_service.check_membership(story.project_id, current_user.id)

        old_status = task.status
        updated = self.task_repo.update(
            task,
            position=data.position,
            status=data.status,
        )

        if data.status and data.status != old_status:
            self._check_and_auto_transition_story(story, current_user)

        return TaskRead.model_validate(updated)

    def delete_task(self, task_id: int, current_user: User) -> None:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found")
        story = task.story
        self.project_service.check_membership(story.project_id, current_user.id)

        project_id = story.project_id
        title = task.title
        self.task_repo.delete(task)

        self.activity_repo.log_activity(
            project_id=project_id,
            user_id=current_user.id,
            action="task_deleted",
            entity_type="task",
            entity_id=task_id,
            details={"title": title},
        )

    def list_tasks_for_story(
        self,
        story_id: int,
        current_user: User,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "position",
        sort_order: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[TaskRead], int]:
        self._check_story_access(story_id, current_user.id)

        tasks, total = self.task_repo.list_by_story(
            story_id=story_id,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset,
        )
        return [TaskRead.model_validate(t) for t in tasks], total

    def list_my_tasks(
        self,
        current_user: User,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[TaskRead], int]:
        tasks, total = self.task_repo.list_for_user(
            user_id=current_user.id,
            status=status,
            limit=limit,
            offset=offset,
        )
        return [TaskRead.model_validate(t) for t in tasks], total
