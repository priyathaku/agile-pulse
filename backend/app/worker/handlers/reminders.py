import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.repositories.notification_repo import NotificationRepository
from app.repositories.task_repo import TaskRepository

logger = logging.getLogger("worker.reminders")


def handle_due_date_reminders(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Workflow 1: Due-date reminders
    Scans for tasks due within 24h or already overdue.
    Creates notifications and logs simulated email alerts.
    Idempotent: skips if a reminder for this task was already issued in the last 20 hours.
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=24)

    task_repo = TaskRepository(db)
    notification_repo = NotificationRepository(db)

    tasks_due = task_repo.get_upcoming_or_overdue_tasks(cutoff)
    reminders_sent = 0
    skipped_duplicates = 0

    recent_window = now - timedelta(hours=20)

    for task in tasks_due:
        # Check idempotency: did we notify this user about this task recently?
        task_link = f"/projects/{task.story.project_id}/stories/{task.story_id}?task={task.id}"

        existing_recent = (
            db.query(Notification)
            .filter(
                Notification.user_id == task.assignee_id,
                Notification.link == task_link,
                Notification.created_at >= recent_window,
            )
            .first()
        )

        if existing_recent:
            skipped_duplicates += 1
            continue

        # Check if overdue or upcoming
        t_due = (
            task.due_date if task.due_date.tzinfo else task.due_date.replace(tzinfo=timezone.utc)
        )
        is_overdue = t_due < now

        if is_overdue:
            title = f"OVERDUE: Task '{task.title}'"
            msg = f"Task '{task.title}' in project '{task.story.project.name}' was due on {task.due_date.strftime('%Y-%m-%d %H:%M UTC')}."
        else:
            title = f"Due Soon: Task '{task.title}'"
            msg = f"Task '{task.title}' in project '{task.story.project.name}' is due within 24 hours ({task.due_date.strftime('%Y-%m-%d %H:%M UTC')})."

        notification_repo.create(
            user_id=task.assignee_id,
            title=title,
            message=msg,
            link=task_link,
        )

        logger.info(
            f"[SIMULATED EMAIL REMINDER] To: {task.assignee.email} | Subject: '{title}' | Content: '{msg}'"
        )
        reminders_sent += 1

    return {
        "scanned_tasks_count": len(tasks_due),
        "reminders_sent": reminders_sent,
        "skipped_duplicates": skipped_duplicates,
        "timestamp": now.isoformat(),
    }
