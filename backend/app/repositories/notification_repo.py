from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        title: str,
        message: str,
        link: Optional[str] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            read=False,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def list_for_user(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Notification], int]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.read.is_(False))

        total = query.count()
        notifications = (
            query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        )
        return notifications, total

    def mark_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        notification = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if notification:
            notification.read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_read(self, user_id: int) -> int:
        count = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.read.is_(False))
            .update({"read": True}, synchronize_session=False)
        )
        self.db.commit()
        return count
