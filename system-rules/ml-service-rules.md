# ML Service Rules

- FastAPI is inference-only and returns numeric/model signals.
- It must not classify green/yellow/red or persist audit outcomes.
- Model versions must be explicit in responses.
- Invalid input returns a clear 4xx; no silent fallback to a success-shaped score.
