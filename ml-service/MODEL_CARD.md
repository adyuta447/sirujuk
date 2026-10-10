# SIRUJUK risk model card

**Evidence base: SYNTHETIC.** Every metric in `models/train_report.json` measures the pipeline against fraud it was
told to find (scenarios A-E in `app/ml/synth.py`). It is not real-world performance and must not be quoted as such.
Regenerate with `python train.py`.

## Deviations from the proposal (revise the proposal or the code)
| Proposal | Code | Why |
|---|---|---|
| Weights 0.25 each until 200 labelled cases | Logistic regression on synthetic labels | Equal weights on standardised terms score PR-AUC 0.48 vs 0.82 fitted. Refit on audited labels in the pilot (>= ~40 positive *events* for 5 terms, not 200 cases). |
| Insufficient history -> exclude | Empirical-Bayes shrinkage to peer median + `INSUFFICIENT_HISTORY` | Never silently drops a doctor. |
| Four doctor/referral terms as written | NS x is_non_specialist(i); HHI only when this referral goes to the dominant destination **and it is not the nearest facility** | Otherwise one high-NS doctor turns every referral red. |
| HHI alone | Needs "nearest facility" data | Without it HHI cannot separate steering from a rural single-hospital doctor. Measured cost: PR-AUC 0.82 -> 0.44. Backend must send `dest_is_nearest: null` (not `true`) when unknown; the HHI term is then 0 (`HHI_NEAREST_UNKNOWN`). |
| NLP: P10 *or* continuous | Both (continuous length-controlled z + P10 flag) | Length-NLP correlation -0.30 before control, 0.00 after. |
| Red = P95, yellow = P80 | Percentile cuts remain, but are `--yellow-share/--red-share` and returned by the API | They are a review-capacity budget, not a fraud probability. See `capacity_table`: reviewing 5% of referrals gives ~94% precision / ~63% recall on synthetic data; 20% gives ~34% / ~91%. |
| 144 KNS list | `app/ml/data/kns144.tsv`, 144 rows | ICD-10 codes come from a secondary source (medminutes.io, 2026-05); PPK texts are drafts. **A physician must validate both.** That source also states Permenkes 5/2014 was replaced by Permenkes 4/2026 (unverified): check JDIH Kemenkes before citing 5/2014 in the final proposal. |

## What the diagnosis table does and does not cover
144 KNS + 34 specialist diagnoses carry a PPK reference text. Any other ICD-10 code (e.g. K30, J06.9) is **unmapped**:
not counted as non-specialist, no narrative term, reason `DIAGNOSIS_UNMAPPED`. Matching is by longest ICD-10 prefix,
so `E11.6` counts as `E11` (type 2 diabetes) even though complicated cases may legitimately be referred (TACC criteria).

## Calibration findings (found by checking the backend demo seed)
- **Narrative calibration was wrong and is fixed.** First version trained on 9-word keyword-bag narratives, so ordinary
  38-word clinical prose looked like a 7-sigma outlier and `NARRATIVE_GENERIC` alone pushed a green demo row to red.
  Now the generator mixes terse / keyword-dense / long-prose styles plus long *generic* administrative prose, and the
  continuous NLP term is clipped to [-3, 3]. Test: with no other evidence a narrative can reach yellow, never red
  (`tests_smoke.py`, specific narratives flagged 11%, generic 82%).
- `tests/narrative_benchmark.tsv` is a hand-written 46-narrative set (specific vs generic, length decoupled). Own-template
  cosine AUC 0.998 vs 0.77 for length alone. It was written by the model author, so it is a regression check, not
  validation: replace with narratives labelled by physicians.
- **Cuts are not "5% of production".** `yellow_from` / `red_from` are percentiles of the *training* score distribution.
  On any other population (demo seed, a different province) the red share will differ. Before use, score a real
  week in shadow mode, re-cut, and override with `ML_YELLOW_FROM` / `ML_RED_FROM`.
- **One layer can still reach red.** SISRUTE "equipment cited but shown available" alone scores ~22 (> red 16.5), because
  in the simulation that pattern is almost always injected fraud. Real SISRUTE is far noisier. Recommended policy
  before a claim is *held*: require two independent layers for red (otherwise yellow). Not implemented because it
  changes who is held; it is the team's decision.

## Known limits
- Collusion between doctor and patient (scenario X) is mostly undetected (~19% flagged).
- Subtler fraud (half injection strength) drops PR-AUC to ~0.29 and red precision to ~0.33.
- Rural red precision (0.69) is lower than urban (0.77): check stratified thresholds before any real use.
- Labels are not audit-biased in the simulation; real labels exist only for audited cases (keep a 0.5-1% random green audit).
- Embedding is char n-gram TF-IDF (no external service, no narrative leaves the process). Benchmark a self-hosted
  Indonesian sentence model on hand-labelled narratives before the pilot.
