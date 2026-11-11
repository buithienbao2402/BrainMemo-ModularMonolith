from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text content to evaluate")


class ScoreResponse(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0, description="Toxicity probability score [0, 1]")
    flagged: bool = Field(..., description="Whether stub considers content flagged")
    label: str = Field(..., description="Classification label")
    model: str = Field(..., description="Model identifier")

