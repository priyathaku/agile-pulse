def test_story_crud_and_progress(client, sample_project, sample_story, member_token):
    # 1. Verify story initially has 0 tasks and 0% progress
    resp = client.get(
        f"/api/v1/stories/{sample_story.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert resp.status_code == 200
    story_data = resp.json()
    assert story_data["tasks_count"] == 0
    assert story_data["progress_pct"] == 0.0

    # 2. Create Task 1 (To Do)
    t1_resp = client.post(
        f"/api/v1/stories/{sample_story.id}/tasks",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"title": "Task 1", "status": "To Do", "estimate_hours": 4.0},
    )
    assert t1_resp.status_code == 201
    task1_id = t1_resp.json()["id"]

    # 3. Create Task 2 (Done)
    t2_resp = client.post(
        f"/api/v1/stories/{sample_story.id}/tasks",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"title": "Task 2", "status": "Done", "estimate_hours": 2.0},
    )
    assert t2_resp.status_code == 201
    task2_id = t2_resp.json()["id"]

    # 4. Check progress is now 50.0% (1 of 2 tasks done)
    resp = client.get(
        f"/api/v1/stories/{sample_story.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert resp.json()["tasks_count"] == 2
    assert resp.json()["tasks_done_count"] == 1
    assert resp.json()["progress_pct"] == 50.0

    # 5. Core Rule Test: Mark Task 1 as Done -> All tasks are Done!
    # Story was "In Progress" -> should auto-move to "In Review"
    update_t1_resp = client.patch(
        f"/api/v1/tasks/{task1_id}",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"status": "Done"},
    )
    assert update_t1_resp.status_code == 200

    # Verify story auto-promoted to In Review
    resp_after = client.get(
        f"/api/v1/stories/{sample_story.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert resp_after.json()["progress_pct"] == 100.0
    assert resp_after.json()["status"] == "In Review"


def test_reorder_story_and_task(client, sample_story, member_token):
    # Create task
    t_resp = client.post(
        f"/api/v1/stories/{sample_story.id}/tasks",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"title": "Reorder Task", "status": "To Do"},
    )
    task_id = t_resp.json()["id"]

    # Reorder task position
    reorder_resp = client.put(
        f"/api/v1/tasks/{task_id}/reorder",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"position": 500.0, "status": "In Progress"},
    )
    assert reorder_resp.status_code == 200
    assert reorder_resp.json()["position"] == 500.0
    assert reorder_resp.json()["status"] == "In Progress"

    # Reorder story
    story_reorder_resp = client.put(
        f"/api/v1/stories/{sample_story.id}/reorder",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"position": 1500.0, "status": "Ready"},
    )
    assert story_reorder_resp.status_code == 200
    assert story_reorder_resp.json()["position"] == 1500.0
    assert story_reorder_resp.json()["status"] == "Ready"


def test_comments_flow(client, sample_story, member_token, member_user):
    # Add comment to story
    c_resp = client.post(
        f"/api/v1/stories/{sample_story.id}/comments",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"content": "This is a test comment."},
    )
    assert c_resp.status_code == 201
    comment_id = c_resp.json()["id"]

    # List comments
    list_resp = client.get(
        f"/api/v1/stories/{sample_story.id}/comments",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # Delete comment
    del_resp = client.delete(
        f"/api/v1/comments/{comment_id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert del_resp.status_code == 204
