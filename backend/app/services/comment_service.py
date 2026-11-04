from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.comment import Comment
from app.models.user import User
from app.repositories.activity_repo import ActivityRepository
from app.repositories.comment_repo import CommentRepository
from app.repositories.job_repo import JobRepository
from app.repositories.story_repo import StoryRepository
from app.repositories.task_repo import TaskRepository
from app.schemas.comment import CommentCreate, CommentRead
from app.services.project_service import ProjectService


class CommentService:
    def __init__(self, db: Session):
        self.db = db
        self.comment_repo = CommentRepository(db)
        self.story_repo = StoryRepository(db)
        self.task_repo = TaskRepository(db)
        self.project_service = ProjectService(db)
        self.activity_repo = ActivityRepository(db)
        self.job_repo = JobRepository(db)

    def create_comment(self, data: CommentCreate, current_user: User) -> CommentRead:
        if not data.story_id and not data.task_id:
            raise BadRequestException("Either story_id or task_id must be provided")

        project_id = None
        target_title = ""
        notify_user_id = None
        link = ""

        if data.story_id:
            story = self.story_repo.get_by_id(data.story_id)
            if not story:
                raise NotFoundException("User Story not found")
            self.project_service.check_membership(story.project_id, current_user.id)
            project_id = story.project_id
            target_title = f"Story: {story.title}"
            notify_user_id = story.assignee_id
            link = f"/projects/{story.project_id}/stories/{story.id}"

        elif data.task_id:
            task = self.task_repo.get_by_id(data.task_id)
            if not task:
                raise NotFoundException("Task not found")
            self.project_service.check_membership(task.story.project_id, current_user.id)
            project_id = task.story.project_id
            target_title = f"Task: {task.title}"
            notify_user_id = task.assignee_id
            link = f"/projects/{task.story.project_id}/stories/{task.story_id}"

        comment = self.comment_repo.create(
            user_id=current_user.id,
            content=data.content,
            story_id=data.story_id,
            task_id=data.task_id,
        )

        if project_id:
            self.activity_repo.log_activity(
                project_id=project_id,
                user_id=current_user.id,
                action="comment_added",
                entity_type="comment",
                entity_id=comment.id,
                details={"target": target_title, "content_snippet": data.content[:60]},
            )

        # Notify assignee if someone else commented
        if notify_user_id and notify_user_id != current_user.id:
            self.job_repo.enqueue(
                job_type="send_notification",
                payload={
                    "user_id": notify_user_id,
                    "title": f"New Comment on {target_title}",
                    "message": f'{current_user.full_name}: "{data.content[:100]}"',
                    "link": link,
                },
            )

        return CommentRead.model_validate(comment)

    def list_comments_for_story(self, story_id: int, current_user: User) -> List[CommentRead]:
        story = self.story_repo.get_by_id(story_id)
        if not story:
            raise NotFoundException("User Story not found")
        self.project_service.check_membership(story.project_id, current_user.id)
        comments = self.comment_repo.list_for_story(story_id)
        return [CommentRead.model_validate(c) for c in comments]

    def list_comments_for_task(self, task_id: int, current_user: User) -> List[CommentRead]:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found")
        self.project_service.check_membership(task.story.project_id, current_user.id)
        comments = self.comment_repo.list_for_task(task_id)
        return [CommentRead.model_validate(c) for c in comments]

    def delete_comment(self, comment_id: int, current_user: User) -> None:
        comment = self.comment_repo.get_by_id(comment_id)
        if not comment:
            raise NotFoundException("Comment not found")

        # Only comment author or admin can delete
        if comment.user_id != current_user.id and current_user.role != "admin":
            raise ForbiddenException("Cannot delete another user's comment")

        self.comment_repo.delete(comment)
