from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserCreate, UserLogin


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def register(self, data: UserCreate) -> Tuple[User, str]:
        existing = self.user_repo.get_by_email(data.email)
        if existing:
            raise ConflictException("A user with this email address already exists")

        hashed_pw = hash_password(data.password)
        user = self.user_repo.create(
            email=data.email,
            hashed_password=hashed_pw,
            full_name=data.full_name,
            role="user",
        )
        token = create_access_token(
            subject=user.id, extra_claims={"email": user.email, "role": user.role}
        )
        return user, token

    def login(self, data: UserLogin) -> Tuple[User, str]:
        user = self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("User account is inactive")

        token = create_access_token(
            subject=user.id, extra_claims={"email": user.email, "role": user.role}
        )
        return user, token

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.user_repo.get_by_id(user_id)
