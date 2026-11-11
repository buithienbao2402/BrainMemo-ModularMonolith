from fastapi import FastAPI

from app.schemas import ScoreRequest, ScoreResponse

app = FastAPI(
    title="BrainMemo AI Service (Stub)",
    version="0.1.0",
    description="Development stub for PhoBERT moderation scoring (/score). Replaced with ONNX model in T-S11-BE-04.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "stub", "model": "PhoBERT-stub"}


@app.post("/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    # Stub always returns safe zero score until PhoBERT ONNX model is integrated in S11.
    _ = payload.text
    return ScoreResponse(
        score=0.0,
        flagged=False,
        label="SAFE",
        model="PhoBERT-stub",
    )

