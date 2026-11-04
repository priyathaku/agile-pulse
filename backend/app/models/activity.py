from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action = Column(
        String(100), nullable=False
    )  # e.g. "story_created", "task_status_changed", "member_added"
    entity_type = Column(
        String(50), nullable=False
    )  # "project", "story", "task", "comment", "member"
    entity_id = Column(Integer, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    # Relationships
    project = relationship("Project", back_populates="activity_logs")
    user = relationship("User")
