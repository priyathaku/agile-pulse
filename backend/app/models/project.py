from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    key = Column(String(10), unique=True, index=True, nullable=False)  # e.g. "APM"
    description = Column(Text, nullable=True)
    status = Column(
        String(50), default="active", nullable=False, index=True
    )  # "active", "archived"
    owner_id = Column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    stories = relationship(
        "UserStory",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="UserStory.position",
    )
    activity_logs = relationship(
        "ActivityLog",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ActivityLog.created_at)",
    )


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(50), default="member", nullable=False)  # "owner", "member"
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_member"),)

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")
