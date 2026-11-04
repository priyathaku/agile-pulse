from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, rate_limit_auth
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserLogin, UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
)
def register(data: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user, token = auth_service.register(data)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit_auth)])
def login(data: UserLogin, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user, token = auth_service.login(data)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
