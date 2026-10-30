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

## Fewer live layers: the cuts stay, SISRUTE "unknown" is explicit
With HHI off (no distance data) and SISRUTE not connected, only NS and the narrative score. On the synthetic test set that
flags 41% of the fraud (all layers: 91%) and red falls to 1.6% of referrals (`train.py` reports it as
`production_regime_no_hhi_no_sisrute` once the regime check is merged from main).
- **Not re-cut.** Cuts re-derived on the train split under that regime and scored on the test split: keeping 5% red gives
  red precision 0.36 (now 0.76) and total recall 0.44 (now 0.41); keeping 2% red gives 0.57 and 0.44. Holding claims with
  a 64% false-hold rate to recover recall of 3 points is the wrong trade, so the full-regime cuts stay. Fewer reds is the
  safe direction when evidence is thinner; the shortfall is a coverage gap to state in the proposal, not to tune away.
- **`sisrute_available` is nullable.** null = not connected (flag 0, reason `SISRUTE_UNKNOWN` on equipment/staff referrals,
  `indicators.sisrute.known = false`); false = checked and the facility has no such equipment (flag 0, no warning). The
  score is identical for both. The ML service is ready; **the backend must send null instead of false while SISRUTE has
  no data** (`ScoringInput.SisruteAvailable` is a plain bool today, so production still sends false).

## Real data: BPJS Kesehatan 2025 sample (`bpjs.py`, `models/bpjs_report.json`)
391,548 FKTP referrals (visits 2024, 21,093 facilities, 2,989 hospitals; 88% linked to an FKRTL visit via `FKP02`).
The sample has **no fraud labels, doctor IDs, narratives, SISRUTE or distance**, so it cannot train or validate the
fraud model. What it does give, and what the model now uses:
- **Peer baseline from real data.** `train.py --peer models/bpjs_peer.json` (the Docker build does this) keeps the fitted
  weights and cuts and replaces only the per-stratum NS/HHI median, MAD and NS P95. The synthetic HHI baseline was far
  off: median 6,557 synthetic vs 2,098 real (urban puskesmas 1,499), so a real doctor at HHI 4,000 looked *below* peers.
  NS was close overall (0.098 vs 0.091) but real strata differ (urban mandiri 0.18, rural mandiri 0.04).
- **Diagnosis table coverage is the biggest gap.** Only 30.6% of real referral diagnoses are in the table (10.3% KNS).
  The most common unmapped codes are I11, K04, M54, H52, H54, Z09, F20, K01: a physician should decide which belong.
- **History is thin in a participant sample.** Only 6% of referrals meet n90 >= 20 (9% n180 >= 30): per-facility
  counts are far below real volume (PSTV15 weights). The facility stands in for the doctor (a puskesmas has many).
- **Shadow scoring** (no narrative, SISRUTE unknown, nearest unknown, cuts not re-cut): 99.7% green, 0.3% yellow,
  0.02% red. Proxy check (does facility NS predict that the hospital also coded a simple KNS case?) AUC 0.49: no
  signal. That proxy is weak, not a fraud label, but it means the NS layer alone is not shown to work on real data.
- Empty narrative is now "not recorded" (`NARRATIVE_UNAVAILABLE`, no NLP term) instead of "generic", so imported
  history is not punished for a missing field. The backend and frontend now require a narrative on new referrals.
