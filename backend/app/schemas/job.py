from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class JobRead(BaseModel):
    id: str
    type: str
    payload: Dict[str, Any]
    status: str
    attempts: int
    max_attempts: int
    run_at: datetime
    last_error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobRetryResponse(BaseModel):
    job_id: str
    status: str
    message: str


class ReportGenerateRequest(BaseModel):
    format: str = Field(default="json", pattern="^(json|csv)$")


class ReportJobResponse(BaseModel):
    job_id: str
    status: str
    message: str
