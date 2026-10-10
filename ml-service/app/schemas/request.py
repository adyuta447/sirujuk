from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    referral_id: str = Field(max_length=64)
    diagnosis_code: str = Field(min_length=1, max_length=16)  # "D12" = PPK list index, or an ICD-10 code
    reason: Literal["clinical", "equipment", "staff"]
    clinical_narrative: str = Field(max_length=4000)
    issued_at: datetime
    # Point-in-time doctor history, computed by the backend from data before issued_at. Defaults = cold start.
    stratum: str = Field("urban|puskesmas", pattern=r"^[a-z]{1,16}\|[a-z]{1,16}$")
    n90: int = Field(0, ge=0, le=1_000_000)
    ns90: float | None = Field(None, ge=0, le=1)
    n180: int = Field(0, ge=0, le=1_000_000)
    hhi180: float | None = Field(None, ge=0, le=10000)
    to_dominant_dest: bool = False
    dest_is_nearest: bool = True
    sisrute_available: bool = False
    sisrute_age_days: float = Field(0.0, ge=0, le=3650)
