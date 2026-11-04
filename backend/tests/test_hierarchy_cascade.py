from app.models.comment import Comment
from app.models.project import Project
from app.models.story import UserStory
from app.models.task import Task


def test_story_deletion_cascades_tasks_and_comments(
    db, client, sample_story, member_token, member_user
):
    # Add a task to the story
    task = Task(story_id=sample_story.id, title="Child Task", status="To Do")
    db.add(task)
    db.commit()
    db.refresh(task)

    # Add a comment to the story and to the task
    comment_s = Comment(user_id=member_user.id, story_id=sample_story.id, content="Story comment")
    comment_t = Comment(user_id=member_user.id, task_id=task.id, content="Task comment")
    db.add_all([comment_s, comment_t])
    db.commit()

    task_id = task.id
    comment_s_id = comment_s.id
    comment_t_id = comment_t.id

    # Delete story via API
    resp = client.delete(
        f"/api/v1/stories/{sample_story.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert resp.status_code == 204

    # Verify story is gone
    assert db.query(UserStory).filter(UserStory.id == sample_story.id).first() is None
    # Verify child task was cascaded
    assert db.query(Task).filter(Task.id == task_id).first() is None
    # Verify comments were cascaded
    assert db.query(Comment).filter(Comment.id.in_([comment_s_id, comment_t_id])).first() is None


def test_project_deletion_cascades_stories_and_tasks(
    db, client, sample_project, sample_story, owner_token
):
    # Add a task to the story
    task = Task(story_id=sample_story.id, title="Sub-task", status="To Do")
    db.add(task)
    db.commit()
    db.refresh(task)

    project_id = sample_project.id
    story_id = sample_story.id
    task_id = task.id

    # Delete project via API
    resp = client.delete(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert resp.status_code == 204

    # Verify project is gone
    assert db.query(Project).filter(Project.id == project_id).first() is None
    # Verify story was cascaded
    assert db.query(UserStory).filter(UserStory.id == story_id).first() is None
    # Verify task was cascaded
    assert db.query(Task).filter(Task.id == task_id).first() is None
