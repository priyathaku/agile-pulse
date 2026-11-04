from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserStory(Base):
    __tablename__ = "user_stories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    status = Column(
        String(50), default="Backlog", nullable=False, index=True
    )  # Backlog, Ready, In Progress, In Review, Done
    priority = Column(
        String(50), default="Medium", nullable=False, index=True
    )  # Low, Medium, High, Critical
    story_points = Column(Integer, nullable=True)
    assignee_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    position = Column(Float, default=0.0, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project = relationship("Project", back_populates="stories")
    assignee = relationship("User", back_populates="assigned_stories", foreign_keys=[assignee_id])
    tasks = relationship(
        "Task", back_populates="story", cascade="all, delete-orphan", order_by="Task.position"
    )
    comments = relationship(
        "Comment",
        back_populates="story",
        cascade="all, delete-orphan",
        order_by="desc(Comment.created_at)",
    )
