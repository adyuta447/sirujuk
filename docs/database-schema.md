# Database Schema (logical)

Production persistence is intentionally outside the first proof of concept. The logical entities are:

- `referrals`: episode, facility, doctor, diagnosis, reason, timestamps.
- `risk_decisions`: score, decision, model version, signals, created_at.
- `audit_reviews`: reviewer, outcome, evidence, reviewed_at.
- `facility_snapshots`: availability data and freshness metadata.
- `access_audit_logs`: actor, resource, purpose, timestamp; never store raw clinical narrative.

Redis may cache serialized read models by referral ID with a short TTL, but it is not authoritative storage.
