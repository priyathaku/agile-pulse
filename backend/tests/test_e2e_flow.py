from app.worker.runner import Worker


def test_full_main_user_flow_end_to_end(client, db):
    """
    Main user flow end-to-end test:
    register -> create project -> add story -> add tasks -> change status -> trigger report job -> see notification
    """
    # 1. Register a new user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "sarah.connor@test.com",
            "password": "Password123!",
            "full_name": "Sarah Connor",
        },
    )
    assert reg_resp.status_code == 201, reg_resp.text
    token = reg_resp.json()["access_token"]
    user_id = reg_resp.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a new project
    proj_resp = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "E2E Skynet Defense",
            "key": "SKY",
            "description": "End to end automated verification project.",
        },
    )
    assert proj_resp.status_code == 201, proj_resp.text
    project_id = proj_resp.json()["id"]

    # 3. Add a user story
    story_resp = client.post(
        "/api/v1/projects/{project_id}/stories".format(project_id=project_id),
        headers=headers,
        json={
            "title": "Build Neural Net Firewall",
            "description": "Deploy deep packet inspection neural network.",
            "acceptance_criteria": "- Block malicious payloads\n- 99.99% uptime",
            "status": "In Progress",
            "priority": "Critical",
            "story_points": 5,
            "assignee_id": user_id,
        },
    )
    assert story_resp.status_code == 201, story_resp.text
    story_id = story_resp.json()["id"]
    assert story_resp.json()["progress_pct"] == 0.0

    # 4. Add Task 1 under story
    t1_resp = client.post(
        "/api/v1/stories/{story_id}/tasks".format(story_id=story_id),
        headers=headers,
        json={
            "title": "Train packet filter model",
            "status": "To Do",
            "priority": "High",
            "estimate_hours": 6.0,
            "assignee_id": user_id,
        },
    )
    assert t1_resp.status_code == 201, t1_resp.text
    task1_id = t1_resp.json()["id"]

    # 5. Add Task 2 under story
    t2_resp = client.post(
        "/api/v1/stories/{story_id}/tasks".format(story_id=story_id),
        headers=headers,
        json={
            "title": "Write latency benchmark tests",
            "status": "To Do",
            "priority": "Medium",
            "estimate_hours": 3.0,
            "assignee_id": user_id,
        },
    )
    assert t2_resp.status_code == 201, t2_resp.text
    task2_id = t2_resp.json()["id"]

    # 6. Change Task 1 status to Done -> Story progress should become 50%
    client.patch(
        "/api/v1/tasks/{task_id}".format(task_id=task1_id),
        headers=headers,
        json={"status": "Done"},
    )
    story_check1 = client.get(
        "/api/v1/stories/{story_id}".format(story_id=story_id),
        headers=headers,
    )
    assert story_check1.json()["progress_pct"] == 50.0

    # 7. Change Task 2 status to Done -> All tasks are Done!
    # Story should automatically promote from 'In Progress' to 'In Review'
    client.patch(
        "/api/v1/tasks/{task_id}".format(task_id=task2_id),
        headers=headers,
        json={"status": "Done"},
    )
    story_check2 = client.get(
        "/api/v1/stories/{story_id}".format(story_id=story_id),
        headers=headers,
    )
    assert story_check2.json()["progress_pct"] == 100.0
    assert story_check2.json()["status"] == "In Review"

    # 8. Trigger background report generation job -> 202 Accepted + job_id
    report_resp = client.post(
        "/api/v1/projects/{project_id}/reports".format(project_id=project_id),
        headers=headers,
        json={"format": "csv"},
    )
    assert report_resp.status_code == 202, report_resp.text
    job_id = report_resp.json()["job_id"]

    # 9. Process all pending jobs in the queue via worker
    worker = Worker()
    processed_count = 0
    while worker.process_one_job(db):
        processed_count += 1
    assert processed_count >= 1

    # 10. Check job status is succeeded and download CSV
    job_resp = client.get(
        "/api/v1/jobs/{job_id}".format(job_id=job_id),
        headers=headers,
    )
    assert job_resp.status_code == 200
    assert job_resp.json()["status"] == "succeeded"

    dl_resp = client.get(
        "/api/v1/projects/{project_id}/reports/{job_id}/download".format(
            project_id=project_id, job_id=job_id
        ),
        headers=headers,
    )
    assert dl_resp.status_code == 200
    assert "E2E Skynet Defense" in dl_resp.text
    assert "Build Neural Net Firewall" in dl_resp.text

    # 11. See notifications: worker and story promotion notified the user!
    notifs_resp = client.get(
        "/api/v1/notifications",
        headers=headers,
    )
    assert notifs_resp.status_code == 200
    notifs = notifs_resp.json()["items"]
    assert len(notifs) >= 1
    # Verify report ready notification
    titles = [n["title"] for n in notifs]
    assert any("Report" in t or "Story" in t for t in titles)
