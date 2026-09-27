# Backend Go Rules

- Go owns validation, orchestration, final scoring, thresholds, and `green/yellow/red`.
- Handlers remain thin; business decisions belong in services.
- Do not trust a decision returned by ML or frontend.
- Never log diagnosis, clinical narrative, or personally identifying patient data.
- Red is a review priority, never an automatic sanction.
