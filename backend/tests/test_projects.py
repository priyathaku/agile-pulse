def test_create_project_success(client, owner_token):
    response = client.post(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"name": "Alpha Project", "key": "ALPHA", "description": "First project"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Alpha Project"
    assert data["key"] == "ALPHA"
    assert data["status"] == "active"


def test_create_project_duplicate_key(client, owner_token, sample_project):
    response = client.post(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"name": "Another Project", "key": sample_project.key, "description": "Duplicate"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "CONFLICT"


def test_get_project_member_access(client, sample_project, member_token):
    response = client.get(
        f"/api/v1/projects/{sample_project.id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == sample_project.id


def test_get_project_outsider_forbidden(client, sample_project, outsider_token):
    response = client.get(
        f"/api/v1/projects/{sample_project.id}",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_add_member_owner_only(client, sample_project, owner_token, member_token, outsider_user):
    # Member tries to add member -> 403
    forbidden_resp = client.post(
        f"/api/v1/projects/{sample_project.id}/members",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"user_email": outsider_user.email, "role": "member"},
    )
    assert forbidden_resp.status_code == 403

    # Owner adds member -> 201
    success_resp = client.post(
        f"/api/v1/projects/{sample_project.id}/members",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"user_email": outsider_user.email, "role": "member"},
    )
    assert success_resp.status_code == 201
    assert success_resp.json()["user_id"] == outsider_user.id


def test_project_dashboard_metrics(client, sample_project, sample_story, owner_token):
    response = client.get(
        f"/api/v1/projects/{sample_project.id}/dashboard",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "story_status_counts" in data
    assert "task_status_counts" in data
    assert "overall_progress_pct" in data
    assert "workload_per_assignee" in data
