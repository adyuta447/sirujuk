# PRD: SIRUJUK Anti Fraud

**Data-Based Referral Verification System for Detecting Self-Referral (Rujukan Semu) in JKN**
Healthkathon 2026, Category: Risk Efficiency in Healthcare Facilities
Status: Concept / proof of concept (TKT 2-3). Not tested on production data.

---

## 1. Summary

SIRUJUK Anti Fraud is a risk-scoring system that validates every FKTP to FKRTL referral **at the moment the referral is issued**, not only after the claim. It combines four signals into one 0-100 risk score that routes each referral to one of three outcomes: auto-pass, verifier review queue, or temporary hold for medical audit.

The score is a **prioritization aid for audit**, not legal proof of fraud. Final decisions always stay with human reviewers (TKMKB).

## 2. Problem and Urgency

- JKN serves 284,316,178 participants through 23,758 FKTP (as of 31 Jul 2026).
- 144 non-specialistic diagnoses (competence level 4A, per Panduan Praktik Klinis) must be resolved at FKTP unless explicit emergency criteria are met.
- Latest figure available (DJSN, Q1 2015): of 14,619,528 FKTP visits, 2,236,379 were referred (15.3%); 214,706 (9.6% of referrals) were non-specialistic and should have been handled at FKTP.
- **Caveat:** this data is 10+ years old. No continuous risk-based monitoring has replaced periodic manual checks, so the current national proportion is unmapped. The 9.6% figure is a baseline, not a claim about today.
- Document-only verification is vulnerable: Itjen Kemenkes found only 24.7% of 4,341 physiotherapy claims (3 hospitals, Jul 2017 - Jun 2018) had supporting medical records on re-audit; estimated loss Rp25-43 billion. This is phantom billing, not self-referral, but shows that complete-looking paperwork can be fabricated.
- Manual audit of tens of millions of referrals per year is infeasible. The need is **automatic prioritization**, not more uniform audit load.

## 3. Goals and Non-Goals

### Goals
1. Score every referral at issuance with a single explainable risk score (0-100).
2. Reduce unnecessary non-specialistic referrals through deterrence and targeted TKMKB intervention.
3. Keep audit burden proportional (precision targets below).
4. Build a structured historical dataset for future JKN cost-control calibration.

### Non-Goals (explicitly out of scope in this version)
- Detecting patient-side symptom falsification.
- Detecting two-way doctor-patient collusion, especially sporadic cases.
- Automatically sanctioning anyone. The system never issues sanctions.
- Proving fraud legally.

## 4. Users

| User | Need |
|---|---|
| TKMKB BPJS Kesehatan | Prioritized queue; red-category audit and facility confirmation |
| BPJS Kesehatan branch claim verification unit | Yellow-queue review with explanation of flags |
| Dinas Kesehatan | Oversight of FKTP compliance, regional views |

## 5. Solution: Four-Layer Scoring

| Layer | Signal | Type |
|---|---|---|
| 1 | Facility availability cross-check (SISRUTE) | Rule-based |
| 2 | Per-doctor / per-facility referral anomaly | Statistical |
| 3 | Doctor to destination-facility network | Graph / concentration |
| 4 | Clinical narrative vs. PPK template | NLP |

Key advantage: combining **document evidence with structural evidence**. One forged document can look valid, but repeated patterns across many transactions over time are far harder to hide.

## 6. Functional Requirements

### FR-1 Data ingestion
Integrate five sources:
1. Referral episodes (diagnosis code, origin/destination facility, referral reason): **P-Care, V-Claim** (BPJS).
2. Equipment, staff, bed availability: **SISRUTE** (integrated with ASPAK, SIRANAP, SISDMK; Kemenkes; Kepdirjen HK.02.02/D/1131/2023).
3. Doctor credentials (SIP, STR, specialty, active status): KKI and Kemenkes.
4. 144 KNS diagnosis baseline: PPK per Permenkes 5/2014.
5. Historical referrals: BPJS internal, for anomaly-model training and threshold calibration.

### FR-2 Indicators

**NS(d), non-specialistic referral ratio**
`NS(d) = referrals of doctor d with diagnosis in 144 KNS / total referrals of d`
- Rolling 90 days; minimum 20 referrals.
- Flag if above the 95th percentile of peers (same specialty and facility type, same period).

**HHI(d), referral concentration**
`HHI(d) = (Σ_j s(d,j)²) × 10,000`, where s(d,j) is the share of d's referrals going to destination j.
- Minimum 30 referrals in the last 180 days.
- < 1,500 normal; 1,500-2,500 observe; > 2,500 high concentration (needs clarification).

**Flag(i), facility availability validation**
- `Flag(i) = 1` if the referral reason cites missing equipment or staff **but** SISRUTE shows the origin facility as available on the referral date; else 0.
- Confidence weight: `w_f = 1 / (1 + days_since_last_SISRUTE_update / 30)`. Stale data lowers weight.

**NLP(i), narrative fit**
- Cosine similarity between embedding of free-text referral narrative and embedding of the PPK template for the related diagnosis (range 0-1).
- Below the 10th percentile of historical distribution (too generic) adds risk weight.

### FR-3 Composite score
```
S(i) = 100 × sigmoid( w1·Z(NS) + w2·Z(HHI) + w3·w_f·Flag(i) + w4·(1 − NLP(i)) )
```
- Z() = robust z-score (median and MAD).
- Initial weights: w1 = w2 = w3 = w4 = 0.25 (heuristic baseline).
- Recalibrate via logistic regression once labeled audit data exists; target at least 200 labeled cases (about 10 observations per predictor rule of thumb).

### FR-4 Decision categories

| Category | Condition | Action |
|---|---|---|
| Green | S(i) below P80 | Auto-pass, no manual review |
| Yellow | P80 to P95 | Verifier review queue, medium priority |
| Red | Above P95 | Claim held; medical audit and facility confirmation required before payment |

### FR-5 Human in the loop
- Red and yellow doctors receive **written clarification** before any sanction.
- Final decision rests with TKMKB, never automated.
- Every score shows contributing indicators (explainability).

### FR-6 Reviewer interface
Queue views for yellow/red, per-referral score breakdown, per-doctor and per-facility trends, audit outcome entry (feeds labeled data back for recalibration).

## 7. Non-Functional Requirements

- **Privacy (UU 27/2022, Art. 4):** diagnosis and medical history are specific personal data. Require encryption in transit and at rest, role-based access control, and access logs for every patient-data access.
- **Fairness:** thresholds stratified by region to avoid penalizing facilities with legitimate structural equipment gaps.
- **Auditability:** all scores, inputs, and model versions logged and reproducible.
- **Robustness:** tolerant to stale or missing SISRUTE data (freshness weighting).

## 8. Success Metrics

Fraud is expected to be rare (under 5% in literature), so **accuracy is not used**.

| Metric | Target |
|---|---|
| Precision, red category | ≥ 60% (at least 6 of 10 held claims confirmed on audit) |
| Recall (labeled test data, yellow or red) | ≥ 70% |
| False discovery rate, red | ≤ 40% |

Pilot exit criteria are lower (see roadmap): simulation precision ≥ 60%; pilot red-category precision ≥ 50%.

## 9. Roadmap (12 months)

| Phase | Months | Scope | Exit criterion |
|---|---|---|---|
| 1 | 1-2 | Model development on simulated data and public JKN samples | Simulated precision ≥ 60% on injected anomalies |
| 2 | 3-5 | Pilot: 10-20 FKTP, 5-10 FKRTL, 1-2 regencies/cities; ≥ 5,000 referral episodes | Validated red precision ≥ 50% vs. manual audit sample |
| 3 | 6-9 | Integrate P-Care/V-Claim and SISRUTE with TKMKB; expand to ≥ 1 province; recalibrate weights on pilot labels | Recalibrated model on labeled data |
| 4 | 10-12 | Full evaluation, national expansion plan, quantitative impact report vs. baseline | Impact report |

Technology readiness: TKT 2-3 now; TKT 4+ depends on pilot success.

## 10. Impact (illustrative only)

If the 9.6% non-specialistic share still held proportionally, and the system halves it, unnecessary referrals could drop roughly **4-5% of total national referral volume**. This is an order-of-magnitude illustration under explicit assumptions and **must be retested with pilot data before any official claim**.

Non-financial value: strengthens FKTP gatekeeping (Permenkes 16/2024); moves detection from periodic sampling to point-of-issuance scoring; builds a structured historical dataset.

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Written clarification; TKMKB final decision |
| Regional bias in historical data | Region-stratified thresholds |
| SISRUTE data staleness | Freshness weight w_f |
| SISRUTE access/endpoint status uncertain | Verify with Pusdatin Kemenkes before final integration design |
| Personal data exposure | Encryption, RBAC, access logging (UU PDP) |
| Doctor-patient collusion | Not mitigated in this version |
| Score misused as legal proof | Documented as prioritization aid only; process follows Permenkes 16/2019 |

## 12. Dependencies and Prerequisites

1. Official access to SISRUTE data (endpoint status to be verified).
2. Regulatory support for human-in-the-loop on red-category holds.
3. Access to P-Care/V-Claim data and BPJS historical referral data.
4. Audit-labeled outcomes from the pilot for recalibration.

## 13. Limitations

- Operates on recorded data, not clinical truth.
- Patient-side symptom falsification is out of scope (future layer: complaint vs. objective findings, patient behavior over time).
- Vulnerable to two-way collusion.
- All formulas, weights, thresholds, and targets are initial designs based on 2015 baseline and market-concentration conventions; they need recalibration with labeled data.
- Score is not stand-alone legal evidence.

## 14. Open Questions (gaps found while converting the proposal)

1. **Percentile-based categories fix the flag volume.** Green < P80 means about 20% of referrals are always yellow/red regardless of true fraud rate (~15% yellow, 5% red). With fraud under 5%, is a 20% review share workable for TKMKB capacity? Consider absolute score thresholds calibrated on labeled data.
2. **"Held claim" vs. human-in-the-loop:** red holds claims automatically before human review. Needs a regulatory basis and a service-level time limit so compliant facilities are not delayed.
3. **Diagnosis count:** proposal uses 144 KNS (current); the cited 2015 source discusses 155. Confirm the baseline list version.
4. **Layer 2/3 split:** the HHI indicator covers the network layer; no graph-based method beyond concentration is specified. Decide whether richer network analysis is in scope.
5. **Sigmoid centering:** with robust z-scores near 0, S(i) centers near 50 and the 0.25 weights compress the range; check score distribution in phase 1.
6. **Team profile (section 9 of the proposal)** is still a template to be filled in.