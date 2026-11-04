import time
from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AppException, UnauthorizedException
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user_repo import UserRepository

security_scheme = HTTPBearer(auto_error=False)


# In-memory rate limiter for authentication endpoints
class InMemoryRateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def check_rate_limit(self, client_ip: str):
        now = time.time()
        timestamps = self.requests[client_ip]
        # Keep only timestamps within window
        self.requests[client_ip] = [t for t in timestamps if now - t < self.window_seconds]
        if len(self.requests[client_ip]) >= self.max_requests:
            raise AppException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                code="RATE_LIMIT_EXCEEDED",
                message=f"Too many requests. Please wait {self.window_seconds} seconds before retrying.",
            )
        self.requests[client_ip].append(now)


auth_rate_limiter = InMemoryRateLimiter(
    max_requests=settings.AUTH_RATE_LIMIT_MAX_REQUESTS,
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
)


def rate_limit_auth(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    auth_rate_limiter.check_rate_limit(client_ip)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authentication token is missing")

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired authentication token")

    user_id = int(payload["sub"])
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User no longer exists")

    if not user.is_active:
        raise UnauthorizedException("User account is inactive")

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise AppException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
            message="Admin privileges required",
        )
    return current_user
