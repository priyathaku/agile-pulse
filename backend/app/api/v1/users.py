from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserRead])
def list_users(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = UserRepository(db)
    users = repo.list_all(limit=limit, offset=offset)
    return [UserRead.model_validate(u) for u in users]
