def test_register_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@test.com", "password": "Password123!", "full_name": "New User"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newuser@test.com"


def test_register_duplicate_email(client, owner_user):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": owner_user.email, "password": "Password123!", "full_name": "Duplicate"},
    )
    assert response.status_code == 409
    data = response.json()
    assert data["code"] == "CONFLICT"


def test_login_success(client, owner_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": owner_user.email, "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == owner_user.email


def test_login_invalid_password(client, owner_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": owner_user.email, "password": "WrongPassword"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == "UNAUTHORIZED"


def test_get_me_success(client, owner_token, owner_user):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == owner_user.id
    assert data["email"] == owner_user.email


def test_get_me_missing_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
