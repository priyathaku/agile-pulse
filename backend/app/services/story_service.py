from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.story import UserStory
from app.models.user import User
from app.repositories.activity_repo import ActivityRepository
from app.repositories.job_repo import JobRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.story_repo import StoryRepository
from app.schemas.story import StoryCreate, StoryDetailRead, StoryRead, StoryReorder, StoryUpdate
from app.services.project_service import ProjectService


class StoryService:
    def __init__(self, db: Session):
        self.db = db
        self.story_repo = StoryRepository(db)
        self.project_repo = ProjectRepository(db)
        self.project_service = ProjectService(db)
        self.activity_repo = ActivityRepository(db)
        self.job_repo = JobRepository(db)

    def _compute_story_stats(self, story: UserStory) -> Tuple[float, int, int]:
        tasks = story.tasks
        total = len(tasks)
        if total == 0:
            pct = 100.0 if story.status == "Done" else 0.0
            return pct, 0, 0
        done_count = sum(1 for t in tasks if t.status == "Done")
        pct = round((done_count / total) * 100.0, 1)
        return pct, total, done_count

    def to_story_read(self, story: UserStory) -> StoryRead:
        pct, total, done = self._compute_story_stats(story)
        read = StoryRead.model_validate(story)
        read.progress_pct = pct
        read.tasks_count = total
        read.tasks_done_count = done
        return read

    def to_story_detail_read(self, story: UserStory) -> StoryDetailRead:
        pct, total, done = self._compute_story_stats(story)
        read = StoryDetailRead.model_validate(story)
        read.progress_pct = pct
        read.tasks_count = total
        read.tasks_done_count = done
        return read

    def create_story(self, project_id: int, data: StoryCreate, current_user: User) -> StoryRead:
        self.project_service.check_membership(project_id, current_user.id)

        story = self.story_repo.create(
            project_id=project_id,
            title=data.title,
            description=data.description,
            acceptance_criteria=data.acceptance_criteria,
            status=data.status,
            priority=data.priority,
            story_points=data.story_points,
            assignee_id=data.assignee_id,
            position=data.position,
        )

        self.activity_repo.log_activity(
            project_id=project_id,
            user_id=current_user.id,
            action="story_created",
            entity_type="story",
            entity_id=story.id,
            details={"title": story.title, "status": story.status, "priority": story.priority},
        )

        if story.assignee_id and story.assignee_id != current_user.id:
            self.job_repo.enqueue(
                job_type="send_notification",
                payload={
                    "user_id": story.assignee_id,
                    "title": f"Assigned to Story: {story.title}",
                    "message": f"{current_user.full_name} assigned you to story '{story.title}'.",
                    "link": f"/projects/{project_id}/stories/{story.id}",
                },
            )

        return self.to_story_read(story)

    def get_story(self, story_id: int, current_user: User) -> StoryDetailRead:
        story = self.story_repo.get_by_id(story_id)
        if not story:
            raise NotFoundException("User Story not found")
        self.project_service.check_membership(story.project_id, current_user.id)
        return self.to_story_detail_read(story)

    def update_story(self, story_id: int, data: StoryUpdate, current_user: User) -> StoryRead:
        story = self.story_repo.get_by_id(story_id)
        if not story:
            raise NotFoundException("User Story not found")
        self.project_service.check_membership(story.project_id, current_user.id)

        old_status = story.status
        old_assignee = story.assignee_id

        updated = self.story_repo.update(
            story,
            title=data.title,
            description=data.description,
            acceptance_criteria=data.acceptance_criteria,
            status=data.status,
            priority=data.priority,
            story_points=data.story_points,
            assignee_id=data.assignee_id,
            position=data.position,
        )

        self.activity_repo.log_activity(
            project_id=updated.project_id,
            user_id=current_user.id,
            action="story_updated",
            entity_type="story",
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
                    "title": f"Assigned to Story: {updated.title}",
                    "message": f"{current_user.full_name} assigned you to story '{updated.title}'.",
                    "link": f"/projects/{updated.project_id}/stories/{updated.id}",
                },
            )

        # Notify on status change to Done
        if updated.status == "Done" and old_status != "Done":
            self.activity_repo.log_activity(
                project_id=updated.project_id,
                user_id=current_user.id,
                action="story_completed",
                entity_type="story",
                entity_id=updated.id,
                details={"title": updated.title},
            )

        return self.to_story_read(updated)

    def reorder_story(self, story_id: int, data: StoryReorder, current_user: User) -> StoryRead:
        story = self.story_repo.get_by_id(story_id)
        if not story:
            raise NotFoundException("User Story not found")
        self.project_service.check_membership(story.project_id, current_user.id)

        updated = self.story_repo.update(
            story,
            position=data.position,
            status=data.status,
        )
        return self.to_story_read(updated)

    def delete_story(self, story_id: int, current_user: User) -> None:
        story = self.story_repo.get_by_id(story_id)
        if not story:
            raise NotFoundException("User Story not found")
        self.project_service.check_membership(story.project_id, current_user.id)

        project_id = story.project_id
        title = story.title
        self.story_repo.delete(story)

        self.activity_repo.log_activity(
            project_id=project_id,
            user_id=current_user.id,
            action="story_deleted",
            entity_type="story",
            entity_id=story_id,
            details={"title": title},
        )

    def list_stories(
        self,
        project_id: int,
        current_user: User,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "position",
        sort_order: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[StoryRead], int]:
        self.project_service.check_membership(project_id, current_user.id)

        stories, total = self.story_repo.list_by_project(
            project_id=project_id,
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset,
        )
        return [self.to_story_read(s) for s in stories], total
