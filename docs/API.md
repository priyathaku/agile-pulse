# API Documentation

All API endpoints are versioned under `/api/v1`. Auto-generated OpenAPI JSON and Swagger UI are accessible at `/docs` and `/api/v1/openapi.json`.

---

## Standard JSON Error Format
All errors return consistent JSON responses:
```json
{
  "code": "NOT_FOUND",
  "message": "User Story not found",
  "details": null
}
```

Common status codes:
- `200 OK`: Successful retrieval or update.
- `201 Created`: Resource successfully created.
- `202 Accepted`: Asynchronous background task queued.
- `204 No Content`: Resource deleted.
- `400 Bad Request`: Invalid payload parameters.
- `401 Unauthorized`: Missing or expired JWT token.
- `403 Forbidden`: Insufficient role or non-member accessing project data.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Unique constraint violation (e.g. duplicate project key or email).
- `422 Unprocessable Entity`: Schema validation error.
- `429 Too Many Requests`: Rate limit threshold exceeded.

---

## 1. Authentication & Users

### `POST /api/v1/auth/register`
- **Auth**: None (Rate limited: 20 req/min)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "full_name": "John Doe"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user",
      "is_active": true,
      "created_at": "2026-11-04T12:00:00Z",
      "updated_at": "2026-11-04T12:00:00Z"
    }
  }
  ```
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:8000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"Password123!","full_name":"John Doe"}'
  ```

---

### `POST /api/v1/auth/login`
- **Auth**: None (Rate limited: 20 req/min)
- **Request Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": { ... }
  }
  ```
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"alice@example.com","password":"Password123!"}'
  ```

---

### `GET /api/v1/auth/me`
- **Auth**: Bearer JWT
- **Response**: `200 OK` (User object)
- **Example cURL**:
  ```bash
  curl -X GET http://localhost:8000/api/v1/auth/me \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

### `POST /api/v1/auth/logout`
- **Auth**: Bearer JWT
- **Response**: `200 OK`
  ```json
  { "message": "Successfully logged out" }
  ```
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:8000/api/v1/auth/logout \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

### `GET /api/v1/users`
- **Auth**: Bearer JWT
- **Query Params**: `limit=100`, `offset=0`
- **Response**: `200 OK` (Array of Users)
- **Example cURL**:
  ```bash
  curl -X GET http://localhost:8000/api/v1/users \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

## 2. Projects

### `GET /api/v1/projects`
- **Auth**: Bearer JWT
- **Query Params**: `search`, `status` (`active` | `archived`), `limit=50`, `offset=0`
- **Response**: `200 OK`
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "Agile Pulse Core",
        "key": "APM",
        "description": "Production agile workspace",
        "status": "active",
        "owner_id": 1,
        "created_at": "...",
        "updated_at": "...",
        "members_count": 4,
        "stories_count": 5
      }
    ],
    "total": 1,
    "offset": 0,
    "limit": 50
  }
  ```
- **Example cURL**:
  ```bash
  curl -X GET "http://localhost:8000/api/v1/projects?status=active" \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

### `POST /api/v1/projects`
- **Auth**: Bearer JWT
- **Request Body**:
  ```json
  {
    "name": "Mobile Payment Gateway",
    "key": "PAY",
    "description": "Stripe & PayPal integrations"
  }
  ```
- **Response**: `201 Created`
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:8000/api/v1/projects \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"name":"Mobile Payment Gateway","key":"PAY","description":"Stripe & PayPal"}'
  ```

---

### `GET /api/v1/projects/{id}`
- **Auth**: Bearer JWT (Must be project member)
- **Response**: `200 OK` (Project object)
- **Example cURL**:
  ```bash
  curl -X GET http://localhost:8000/api/v1/projects/1 \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

### `PATCH /api/v1/projects/{id}`
- **Auth**: Bearer JWT (Project Owner only)
- **Request Body**: `{ "name": "New Name", "description": "...", "status": "archived" }`
- **Response**: `200 OK`
- **Example cURL**:
  ```bash
  curl -X PATCH http://localhost:8000/api/v1/projects/1 \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"status":"archived"}'
  ```

---

### `DELETE /api/v1/projects/{id}`
- **Auth**: Bearer JWT (Project Owner only)
- **Response**: `204 No Content`
- **Example cURL**:
  ```bash
  curl -X DELETE http://localhost:8000/api/v1/projects/1 \
    -H "Authorization: Bearer <TOKEN>"
  ```

---

### `GET /api/v1/projects/{id}/dashboard`
- **Auth**: Bearer JWT (Member)
- **Response**: `200 OK`
  ```json
  {
    "project": { ... },
    "story_status_counts": { "Backlog": 1, "Ready": 1, "In Progress": 1, "In Review": 1, "Done": 1 },
    "task_status_counts": { "To Do": 4, "In Progress": 2, "Blocked": 0, "Done": 5 },
    "total_stories": 5,
    "total_tasks": 11,
    "overall_progress_pct": 45.5,
    "overdue_tasks_count": 1,
    "workload_per_assignee": [
      {
        "user_id": 2,
        "user_name": "Bob Smith",
        "task_count": 5,
        "story_count": 2,
        "story_points": 13,
        "estimated_hours": 17.0
      }
    ]
  }
  ```

---

### `GET /api/v1/projects/{id}/members` & `POST /api/v1/projects/{id}/members`
- **Auth**: Bearer JWT (Owner to add, Member to view)
- **POST Body**: `{ "user_email": "bob@example.com", "role": "member" }`
- **Response**: `201 Created`
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:8000/api/v1/projects/1/members \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"user_email":"bob@example.com","role":"member"}'
  ```

---

### `DELETE /api/v1/projects/{id}/members/{user_id}`
- **Auth**: Bearer JWT (Owner only)
- **Response**: `204 No Content`

---

### `GET /api/v1/projects/{id}/activity`
- **Auth**: Bearer JWT (Member)
- **Response**: `200 OK` (Array of Activity Logs)

---

## 3. User Stories

### `GET /api/v1/projects/{id}/stories`
- **Auth**: Bearer JWT
- **Query Params**: `status`, `priority`, `assignee_id`, `search`, `limit`, `offset`
- **Response**: `200 OK` (Paginated stories with computed `progress_pct`, `tasks_count`, `tasks_done_count`)

---

### `POST /api/v1/projects/{id}/stories`
- **Auth**: Bearer JWT (Member)
- **Request Body**:
  ```json
  {
    "title": "Stripe Webhook Signature Verification",
    "description": "Verify HMAC SHA-256 signatures",
    "acceptance_criteria": "- Header exists\n- Verified secret",
    "status": "In Progress",
    "priority": "Critical",
    "story_points": 5,
    "assignee_id": 2
  }
  ```
- **Response**: `201 Created`

---

### `GET /api/v1/stories/{id}`
- **Auth**: Bearer JWT (Member)
- **Response**: `200 OK` (Story details with nested child tasks & comments)

---

### `PATCH /api/v1/stories/{id}`
- **Auth**: Bearer JWT (Member)
- **Request Body**: Any partial fields (`title`, `description`, `status`, `priority`, `story_points`, `assignee_id`)
- **Response**: `200 OK`

---

### `PUT /api/v1/stories/{id}/reorder`
- **Auth**: Bearer JWT (Member)
- **Request Body**:
  ```json
  {
    "position": 1500.0,
    "status": "In Progress"
  }
  ```
- **Response**: `200 OK`

---

### `DELETE /api/v1/stories/{id}`
- **Auth**: Bearer JWT (Member)
- **Response**: `204 No Content` (Cascades to child tasks & comments)

---

## 4. Tasks

### `GET /api/v1/stories/{id}/tasks`
- **Auth**: Bearer JWT (Member)
- **Response**: `200 OK` (Paginated list of tasks)

---

### `POST /api/v1/stories/{id}/tasks`
- **Auth**: Bearer JWT (Member)
- **Request Body**:
  ```json
  {
    "title": "Implement webhook cryptographic validator",
    "description": "Compute and compare HMAC sha256 digest",
    "status": "To Do",
    "priority": "High",
    "estimate_hours": 4.5,
    "due_date": "2026-11-10T18:00:00Z",
    "assignee_id": 2
  }
  ```
- **Response**: `201 Created`

---

### `PATCH /api/v1/tasks/{id}`
- **Auth**: Bearer JWT (Member)
- **Request Body**: `{ "status": "Done" }`
- **Response**: `200 OK`
- *Note*: If all sibling tasks become "Done", the parent User Story automatically transitions to "In Review" or "Done" and an activity log & notification are dispatched!

---

### `PUT /api/v1/tasks/{id}/reorder`
- **Auth**: Bearer JWT (Member)
- **Request Body**: `{ "position": 2500.0, "status": "In Progress" }`
- **Response**: `200 OK`

---

### `DELETE /api/v1/tasks/{id}`
- **Auth**: Bearer JWT (Member)
- **Response**: `204 No Content`

---

### `GET /api/v1/tasks/my`
- **Auth**: Bearer JWT
- **Query Params**: `status`, `limit`, `offset`
- **Response**: `200 OK` (List of tasks assigned to logged-in user across all projects)

---

## 5. Comments

### `POST /api/v1/stories/{id}/comments` & `POST /api/v1/tasks/{id}/comments`
- **Auth**: Bearer JWT (Member)
- **Request Body**: `{ "content": "Acceptance criteria verified with QA." }`
- **Response**: `201 Created`

---

### `DELETE /api/v1/comments/{id}`
- **Auth**: Bearer JWT (Author or Admin only)
- **Response**: `204 No Content`

---

## 6. Notifications

### `GET /api/v1/notifications`
- **Auth**: Bearer JWT
- **Query Params**: `unread_only=true|false`, `limit=50`, `offset=0`
- **Response**: `200 OK`

---

### `PATCH /api/v1/notifications/{id}/read`
- **Auth**: Bearer JWT
- **Response**: `200 OK`

---

### `POST /api/v1/notifications/mark-all-read`
- **Auth**: Bearer JWT
- **Response**: `200 OK` `{ "message": "Marked 3 notifications as read", "count": 3 }`

---

## 7. Background Jobs & Reporting

### `POST /api/v1/projects/{id}/reports`
- **Auth**: Bearer JWT (Member)
- **Request Body**: `{ "format": "csv" }` or `{ "format": "json" }`
- **Response**: `202 Accepted`
  ```json
  {
    "job_id": "8fa21b79-3d12-4c6e-8025-a1c2234bc981",
    "status": "pending",
    "message": "Project report generation has been queued in the background."
  }
  ```

---

### `GET /api/v1/jobs/{id}`
- **Auth**: Bearer JWT
- **Response**: `200 OK`
  ```json
  {
    "id": "8fa21b79-3d12-4c6e-8025-a1c2234bc981",
    "type": "generate_project_report",
    "status": "succeeded",
    "attempts": 1,
    "max_attempts": 3,
    "result": { ... },
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

### `POST /api/v1/jobs/{id}/retry`
- **Auth**: Bearer JWT
- **Response**: `200 OK` `{ "job_id": "...", "status": "pending", "message": "..." }`

---

### `GET /api/v1/projects/{id}/reports/{job_id}/download`
- **Auth**: Bearer JWT
- **Response**: `200 OK` with `Content-Type: text/csv` (or JSON payload) and `Content-Disposition: attachment; filename="report-project-1.csv"`.
