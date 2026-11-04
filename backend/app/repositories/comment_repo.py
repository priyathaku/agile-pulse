from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment


class CommentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, comment_id: int) -> Optional[Comment]:
        return (
            self.db.query(Comment)
            .options(joinedload(Comment.user))
            .filter(Comment.id == comment_id)
            .first()
        )

    def create(
        self,
        user_id: int,
        content: str,
        story_id: Optional[int] = None,
        task_id: Optional[int] = None,
    ) -> Comment:
        comment = Comment(
            user_id=user_id,
            content=content.strip(),
            story_id=story_id,
            task_id=task_id,
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def delete(self, comment: Comment) -> None:
        self.db.delete(comment)
        self.db.commit()

    def list_for_story(self, story_id: int) -> List[Comment]:
        return (
            self.db.query(Comment)
            .options(joinedload(Comment.user))
            .filter(Comment.story_id == story_id)
            .order_by(Comment.created_at.asc())
            .all()
        )

    def list_for_task(self, task_id: int) -> List[Comment]:
        return (
            self.db.query(Comment)
            .options(joinedload(Comment.user))
            .filter(Comment.task_id == task_id)
            .order_by(Comment.created_at.asc())
            .all()
        )
