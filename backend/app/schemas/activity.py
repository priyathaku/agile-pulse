from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserRead


class ActivityLogRead(BaseModel):
    id: int
    project_id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: int
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    user: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)
