from datetime import datetime, timedelta, timezone

from app.models.notification import Notification
from app.models.task import Task
from app.worker.handlers.notifications import handle_send_notification
from app.worker.handlers.reminders import handle_due_date_reminders
from app.worker.runner import Worker


def test_due_date_reminder_workflow_and_idempotency(db, sample_project, sample_story, member_user):
    now = datetime.now(timezone.utc)

    # 1. Create a task due in 5 hours
    upcoming_task = Task(
        story_id=sample_story.id,
        title="Upcoming Task",
        status="In Progress",
        assignee_id=member_user.id,
        due_date=now + timedelta(hours=5),
    )
    # 2. Create a task already overdue
    overdue_task = Task(
        story_id=sample_story.id,
        title="Overdue Task",
        status="To Do",
        assignee_id=member_user.id,
        due_date=now - timedelta(hours=2),
    )
    # 3. Create a task already Done (should not trigger reminder)
    done_task = Task(
        story_id=sample_story.id,
        title="Completed Task",
        status="Done",
        assignee_id=member_user.id,
        due_date=now + timedelta(hours=2),
    )
    db.add_all([upcoming_task, overdue_task, done_task])
    db.commit()

    # Run reminder handler first time
    result = handle_due_date_reminders(db, {})
    assert result["scanned_tasks_count"] == 2
    assert result["reminders_sent"] == 2
    assert result["skipped_duplicates"] == 0

    # Verify notifications were created
    notifications = db.query(Notification).filter(Notification.user_id == member_user.id).all()
    assert len(notifications) == 2

    # Run reminder handler second time -> IDEMPOTENCY check (should skip duplicates)
    result2 = handle_due_date_reminders(db, {})
    assert result2["reminders_sent"] == 0
    assert result2["skipped_duplicates"] == 2


def test_notification_dispatch_handler(db, member_user):
    payload = {
        "user_id": member_user.id,
        "title": "Async Alert",
        "message": "Testing async notification dispatch",
        "link": "/dashboard",
    }
    result = handle_send_notification(db, payload)
    assert result["delivered"] is True

    notif = db.query(Notification).filter(Notification.id == result["notification_id"]).first()
    assert notif is not None
    assert notif.title == "Async Alert"


def test_project_report_background_job(client, sample_project, sample_story, owner_token, db):
    # 1. Request report generation via POST -> 202 Accepted
    resp = client.post(
        f"/api/v1/projects/{sample_project.id}/reports",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"format": "csv"},
    )
    assert resp.status_code == 202
    data = resp.json()
    job_id = data["job_id"]
    assert data["status"] == "pending"

    # 2. Worker executes job
    worker = Worker()
    processed = worker.process_one_job(db)
    assert processed is True

    # 3. Poll job status -> succeeded
    status_resp = client.get(
        f"/api/v1/jobs/{job_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert status_resp.status_code == 200
    job_data = status_resp.json()
    assert job_data["status"] == "succeeded"
    assert "result" in job_data
    assert "csv_content" in job_data["result"]

    # 4. Download report CSV via project endpoint
    dl_resp = client.get(
        f"/api/v1/projects/{sample_project.id}/reports/{job_id}/download",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert dl_resp.status_code == 200
    assert "Project Report" in dl_resp.text
    assert "USER STORIES" in dl_resp.text
