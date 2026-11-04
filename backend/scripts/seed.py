import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.activity import ActivityLog
from app.models.comment import Comment
from app.models.job import Job
from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.models.story import UserStory
from app.models.task import Task
from app.models.user import User


def seed():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_user = db.query(User).filter(User.email == "alice@example.com").first()
        if existing_user:
            print("Database already contains seed data. Skipping seed.")
            return

        print("Seeding demo users...")
        users = [
            User(
                email="alice@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Alice Chen",
                role="admin",
                is_active=True,
            ),
            User(
                email="bob@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Bob Smith",
                role="user",
                is_active=True,
            ),
            User(
                email="charlie@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Charlie Davis",
                role="user",
                is_active=True,
            ),
            User(
                email="dana@example.com",
                hashed_password=hash_password("Password123!"),
                full_name="Dana Lee",
                role="user",
                is_active=True,
            ),
        ]
        db.add_all(users)
        db.commit()
        for u in users:
            db.refresh(u)

        alice, bob, charlie, dana = users

        print("Seeding demo projects...")
        now = datetime.now(timezone.utc)

        p1 = Project(
            name="Agile Pulse Core",
            key="APM",
            description="Production-grade agile workspace for high-velocity engineering teams.",
            status="active",
            owner_id=alice.id,
            created_at=now - timedelta(days=14),
        )
        p2 = Project(
            name="Cloud Infrastructure Upgrade",
            key="INFRA",
            description="Containerization, load balancing, and production readiness roadmap.",
            status="active",
            owner_id=bob.id,
            created_at=now - timedelta(days=7),
        )
        db.add_all([p1, p2])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)

        print("Seeding project members...")
        members = [
            ProjectMember(
                project_id=p1.id, user_id=alice.id, role="owner", joined_at=now - timedelta(days=14)
            ),
            ProjectMember(
                project_id=p1.id, user_id=bob.id, role="member", joined_at=now - timedelta(days=13)
            ),
            ProjectMember(
                project_id=p1.id,
                user_id=charlie.id,
                role="member",
                joined_at=now - timedelta(days=12),
            ),
            ProjectMember(
                project_id=p1.id, user_id=dana.id, role="member", joined_at=now - timedelta(days=10)
            ),
            ProjectMember(
                project_id=p2.id, user_id=bob.id, role="owner", joined_at=now - timedelta(days=7)
            ),
            ProjectMember(
                project_id=p2.id, user_id=alice.id, role="member", joined_at=now - timedelta(days=6)
            ),
        ]
        db.add_all(members)
        db.commit()

        print("Seeding user stories...")
        s1 = UserStory(
            project_id=p1.id,
            title="User Authentication & RBAC Engine",
            description="Implement secure JWT session tokens, bcrypt password hashing, and role checks.",
            acceptance_criteria="- User can register, login, and fetch /auth/me.\n- Tokens expire after 24h.\n- Password requirements enforced.",
            status="Done",
            priority="Critical",
            story_points=5,
            assignee_id=bob.id,
            position=1000.0,
            created_at=now - timedelta(days=12),
        )
        s2 = UserStory(
            project_id=p1.id,
            title="Hierarchical Kanban Board & Story Reordering",
            description="Interactive board with column swimlanes and drag-and-drop position sorting.",
            acceptance_criteria="- Cards can be dragged across status columns.\n- Reordering persists float positions.\n- Optimistic updates with error rollback.",
            status="In Progress",
            priority="High",
            story_points=8,
            assignee_id=charlie.id,
            position=2000.0,
            created_at=now - timedelta(days=10),
        )
        s3 = UserStory(
            project_id=p1.id,
            title="Database-Backed Background Job Queue",
            description="Lightweight asynchronous worker with exponential backoff and dead-letter state.",
            acceptance_criteria="- Polling worker claims jobs safely.\n- Failed jobs retry with backoff jitter.\n- Admin can retry dead jobs.",
            status="In Review",
            priority="Critical",
            story_points=8,
            assignee_id=bob.id,
            position=3000.0,
            created_at=now - timedelta(days=8),
        )
        s4 = UserStory(
            project_id=p1.id,
            title="Automated Project Reporting & Export",
            description="Asynchronous report generation job delivering CSV and JSON downloadable metrics.",
            acceptance_criteria="- POST returns 202 with job_id.\n- Worker compiles metrics.\n- User downloads CSV/JSON.",
            status="Ready",
            priority="Medium",
            story_points=3,
            assignee_id=dana.id,
            position=4000.0,
            created_at=now - timedelta(days=5),
        )
        s5 = UserStory(
            project_id=p1.id,
            title="Mobile Responsive Navigation & Dark Mode Accents",
            description="Ensure responsive layouts for tablet and mobile form factors.",
            acceptance_criteria="- Drawer collapses on mobile screens.\n- Touch targets meet WCAG contrast and tap size.",
            status="Backlog",
            priority="Low",
            story_points=2,
            assignee_id=None,
            position=5000.0,
            created_at=now - timedelta(days=2),
        )

        db.add_all([s1, s2, s3, s4, s5])
        db.commit()
        for s in [s1, s2, s3, s4, s5]:
            db.refresh(s)

        print("Seeding tasks under stories...")
        tasks = [
            # Under Story 1 (All Done -> Story was auto-promoted to Done)
            Task(
                story_id=s1.id,
                title="Design JWT token payload and signing algorithm",
                description="Use HS256 with 24h expiry and subject claim.",
                status="Done",
                priority="High",
                assignee_id=bob.id,
                estimate_hours=3.5,
                due_date=now - timedelta(days=11),
                position=1000.0,
            ),
            Task(
                story_id=s1.id,
                title="Write login & register REST endpoints with validation",
                description="Validate email format and enforce minimum 6 char passwords.",
                status="Done",
                priority="Critical",
                assignee_id=bob.id,
                estimate_hours=5.0,
                due_date=now - timedelta(days=10),
                position=2000.0,
            ),
            Task(
                story_id=s1.id,
                title="Implement auth rate limiting middleware",
                description="Prevent brute-force login attempts with sliding window rate limiter.",
                status="Done",
                priority="Medium",
                assignee_id=bob.id,
                estimate_hours=2.5,
                due_date=now - timedelta(days=9),
                position=3000.0,
            ),
            # Under Story 2 (In Progress)
            Task(
                story_id=s2.id,
                title="Implement Kanban column layout component",
                description="Columns for Backlog, Ready, In Progress, In Review, Done.",
                status="Done",
                priority="High",
                assignee_id=charlie.id,
                estimate_hours=6.0,
                due_date=now - timedelta(days=4),
                position=1000.0,
            ),
            Task(
                story_id=s2.id,
                title="Wire drag-and-drop event handlers and position calculation",
                description="Calculate midpoints between cards for smooth reordering.",
                status="In Progress",
                priority="High",
                assignee_id=charlie.id,
                estimate_hours=8.0,
                due_date=now + timedelta(hours=18),  # Due within 24h -> reminder trigger!
                position=2000.0,
            ),
            Task(
                story_id=s2.id,
                title="Add optimistic state mutation with toast rollback on error",
                description="Immediate UI responsiveness during network latency.",
                status="To Do",
                priority="Medium",
                assignee_id=charlie.id,
                estimate_hours=4.0,
                due_date=now + timedelta(days=3),
                position=3000.0,
            ),
            # Under Story 3 (In Review - 2 of 3 Done)
            Task(
                story_id=s3.id,
                title="Create jobs table with locked_by and locked_at columns",
                description="Support atomic row claims and dead-letter queue transition.",
                status="Done",
                priority="Critical",
                assignee_id=bob.id,
                estimate_hours=4.0,
                due_date=now - timedelta(days=6),
                position=1000.0,
            ),
            Task(
                story_id=s3.id,
                title="Build exponential backoff retry handler with jitter",
                description="Formula: delay = base * 2^(attempt-1) + jitter.",
                status="Done",
                priority="High",
                assignee_id=bob.id,
                estimate_hours=4.5,
                due_date=now - timedelta(days=5),
                position=2000.0,
            ),
            Task(
                story_id=s3.id,
                title="Write test suite for worker crash recovery and stale locks",
                description="Verify unrecovered jobs are reclaimed after timeout.",
                status="In Progress",
                priority="Medium",
                assignee_id=dana.id,
                estimate_hours=3.5,
                due_date=now + timedelta(days=1),
                position=3000.0,
            ),
            # Under Story 4 (Ready)
            Task(
                story_id=s4.id,
                title="Serialize project metrics into CSV and JSON format",
                description="Include story breakdown, task status counts, and assignee hours.",
                status="To Do",
                priority="Medium",
                assignee_id=dana.id,
                estimate_hours=4.0,
                due_date=now + timedelta(days=4),
                position=1000.0,
            ),
            Task(
                story_id=s4.id,
                title="Add report download button with background polling modal",
                description="Poll job status until succeeded and trigger file download.",
                status="To Do",
                priority="Low",
                assignee_id=charlie.id,
                estimate_hours=3.0,
                due_date=now + timedelta(days=5),
                position=2000.0,
            ),
        ]
        db.add_all(tasks)
        db.commit()

        print("Seeding comments and activity logs...")
        c1 = Comment(
            user_id=alice.id,
            story_id=s1.id,
            content="Great progress on the JWT auth system! Security test suite looks solid.",
            created_at=now - timedelta(days=9),
        )
        c2 = Comment(
            user_id=bob.id,
            story_id=s3.id,
            content="The worker handles graceful SIGINT termination properly now.",
            created_at=now - timedelta(days=4),
        )
        db.add_all([c1, c2])

        act1 = ActivityLog(
            project_id=p1.id,
            user_id=alice.id,
            action="project_created",
            entity_type="project",
            entity_id=p1.id,
            details={"name": p1.name, "key": p1.key},
            created_at=now - timedelta(days=14),
        )
        act2 = ActivityLog(
            project_id=p1.id,
            user_id=bob.id,
            action="story_completed",
            entity_type="story",
            entity_id=s1.id,
            details={"title": s1.title},
            created_at=now - timedelta(days=9),
        )
        db.add_all([act1, act2])

        print("Seeding sample notifications...")
        n1 = Notification(
            user_id=alice.id,
            title="Welcome to Agile Pulse",
            message="Your demo workspace has been initialized with sample projects, stories, and tasks.",
            link=f"/projects/{p1.id}",
            read=False,
            created_at=now - timedelta(hours=2),
        )
        n2 = Notification(
            user_id=bob.id,
            title="Assigned to Story: Background Job Queue",
            message="Alice Chen assigned you to story 'Database-Backed Background Job Queue'.",
            link=f"/projects/{p1.id}/stories/{s3.id}",
            read=True,
            created_at=now - timedelta(days=8),
        )
        db.add_all([n1, n2])

        print("Seeding sample jobs...")
        j1 = Job(
            type="due_date_reminders",
            payload={},
            status="succeeded",
            attempts=1,
            max_attempts=3,
            run_at=now - timedelta(hours=1),
            result={"scanned_tasks_count": 11, "reminders_sent": 2, "skipped_duplicates": 0},
            created_at=now - timedelta(hours=1),
        )
        db.add(j1)
        db.commit()

        print("Database seeded successfully with realistic agile demo data!")
        print("\nDemo Credentials:")
        print("  Owner/Admin : alice@example.com   / Password123!")
        print("  Developer   : bob@example.com     / Password123!")
        print("  Designer    : charlie@example.com / Password123!")
        print("  QA Engineer : dana@example.com    / Password123!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
