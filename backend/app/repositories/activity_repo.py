from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.activity import ActivityLog


class ActivityRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_activity(
        self,
        project_id: int,
        user_id: Optional[int],
        action: str,
        entity_type: str,
        entity_id: int,
        details: Optional[Dict[str, Any]] = None,
    ) -> ActivityLog:
        log = ActivityLog(
            project_id=project_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list_by_project(
        self,
        project_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ActivityLog]:
        return (
            self.db.query(ActivityLog)
            .options(joinedload(ActivityLog.user))
            .filter(ActivityLog.project_id == project_id)
            .order_by(ActivityLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
