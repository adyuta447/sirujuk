from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    referral_id: str = Field(max_length=64)
    diagnosis_code: str = Field(min_length=1, max_length=16, description="ICD-10, e.g. I10 or J06.9; codes outside the table are scored without the narrative term")
    reason: Literal["clinical", "equipment", "staff"]
    clinical_narrative: str = Field(max_length=4000)
    issued_at: datetime
    # Point-in-time doctor history, computed by the backend from data before issued_at. Defaults = cold start.
    stratum: str | None = Field(None, pattern=r"^[a-z]{1,16}\|[a-z]{1,16}$")  # "<urban|rural>|<puskesmas|klinik|mandiri>"; None or unknown = pooled peers
    n90: int = Field(0, ge=0, le=1_000_000)
    ns90: float | None = Field(None, ge=0, le=1)
    n180: int = Field(0, ge=0, le=1_000_000)
    hhi180: float | None = Field(None, ge=0, le=10000)
    to_dominant_dest: bool = False
    dest_is_nearest: bool | None = None  # None = unknown: send null, NOT true, when there is no distance data
    sisrute_available: bool | None = None  # None = no SISRUTE data (not connected): send null, NOT false. false means "checked, not available"
    sisrute_age_days: float = Field(0.0, ge=0, le=3650)
