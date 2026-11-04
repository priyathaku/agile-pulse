from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.comment_service import CommentService

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CommentService(db)
    service.delete_comment(comment_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
