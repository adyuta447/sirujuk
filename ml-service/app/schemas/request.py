from datetime import datetime
from pydantic import BaseModel

class PredictionRequest(BaseModel):
    referral_id: str
    diagnosis_code: str
    reason: str
    clinical_narrative: str
    issued_at: datetime
