import logging
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger("worker.notifications")


def handle_send_notification(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handles asynchronous notification dispatch.
    Creates an in-app Notification record and logs a simulated external delivery (e.g. email/webhook).
    """
    user_id = payload.get("user_id")
    title = payload.get("title", "")
    message = payload.get("message", "")
    link = payload.get("link")

    if not user_id or not title:
        raise ValueError("user_id and title are required for notification dispatch")

    repo = NotificationRepository(db)
    notification = repo.create(
        user_id=user_id,
        title=title,
        message=message,
        link=link,
    )

    # Simulated email / push delivery
    logger.info(
        f"[EMAIL DISPATCH SIMULATOR] To User ID {user_id} | Subject: '{title}' | Body: '{message}' | Link: '{link}'"
    )

    return {
        "notification_id": notification.id,
        "delivered": True,
        "simulated_channel": "email",
    }
