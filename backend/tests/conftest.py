import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.project import Project, ProjectMember
from app.models.story import UserStory
from app.models.task import Task
from app.models.user import User

# In-memory SQLite database specifically for tests
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def owner_user(db):
    user = User(
        email="owner@test.com",
        hashed_password=hash_password("Password123!"),
        full_name="Project Owner",
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def member_user(db):
    user = User(
        email="member@test.com",
        hashed_password=hash_password("Password123!"),
        full_name="Team Member",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def outsider_user(db):
    user = User(
        email="outsider@test.com",
        hashed_password=hash_password("Password123!"),
        full_name="Outsider User",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def owner_token(owner_user):
    return create_access_token(subject=owner_user.id, extra_claims={"email": owner_user.email})


@pytest.fixture
def member_token(member_user):
    return create_access_token(subject=member_user.id, extra_claims={"email": member_user.email})


@pytest.fixture
def outsider_token(outsider_user):
    return create_access_token(
        subject=outsider_user.id, extra_claims={"email": outsider_user.email}
    )


@pytest.fixture
def sample_project(db, owner_user, member_user):
    project = Project(
        name="Test Project",
        key="TEST",
        description="A project for testing",
        status="active",
        owner_id=owner_user.id,
    )
    db.add(project)
    db.flush()

    # Add owner and member
    db.add(ProjectMember(project_id=project.id, user_id=owner_user.id, role="owner"))
    db.add(ProjectMember(project_id=project.id, user_id=member_user.id, role="member"))
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def sample_story(db, sample_project, member_user):
    story = UserStory(
        project_id=sample_project.id,
        title="Test Story",
        description="A story for testing",
        acceptance_criteria="Should pass tests",
        status="In Progress",
        priority="High",
        story_points=5,
        assignee_id=member_user.id,
        position=1000.0,
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story
