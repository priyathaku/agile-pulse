import logging
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.repositories.notification_repo import NotificationRepository
from app.services.report_service import ReportService

logger = logging.getLogger("worker.reports")


def handle_generate_project_report(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Workflow 3: Project Report Generation
    Worker generates a full project summary (JSON/CSV) in the background.
    Notifies the requester when ready.
    """
    project_id = payload.get("project_id")
    requested_by = payload.get("requested_by")
    format_type = payload.get("format", "json")

    if not project_id:
        raise ValueError("project_id is required in report generation payload")

    report_service = ReportService(db)
    report_data = report_service.generate_project_report(
        project_id=project_id, format_type=format_type
    )

    logger.info(
        f"[REPORT WORKER] Generated report for project {project_id} (Format: {format_type}, Stories: {report_data['total_stories']}, Tasks: {report_data['total_tasks']})"
    )

    # If requested by a user, notify them
    if requested_by:
        notification_repo = NotificationRepository(db)
        notification_repo.create(
            user_id=requested_by,
            title="Project Report Ready",
            message=f"Your {format_type.upper()} report for project '{report_data['project_name']}' is ready for download.",
            link=f"/projects/{project_id}/reports",
        )

    return report_data
