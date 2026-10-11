# SIRUJUK risk model card

**Evidence base: SYNTHETIC.** Every metric in `models/train_report.json` measures the pipeline against fraud it was
told to find (scenarios A-E in `app/ml/synth.py`). It is not real-world performance and must not be quoted as such.
Regenerate with `python train.py`.

## Deviations from the proposal (revise the proposal or the code)
| Proposal | Code | Why |
|---|---|---|
| Weights 0.25 each until 200 labelled cases | Logistic regression on synthetic labels | Equal weights on standardised terms score PR-AUC 0.50 vs 0.82 fitted. Refit on audited labels in the pilot (>= ~40 positive *events* for 5 terms, not 200 cases). |
| Insufficient history -> exclude | Empirical-Bayes shrinkage to peer median + `INSUFFICIENT_HISTORY` | Never silently drops a doctor. |
| Four doctor/referral terms as written | NS x is_non_specialist(i); HHI only when this referral goes to the dominant destination **and it is not the nearest facility** | Otherwise one high-NS doctor turns every referral red. |
| HHI alone | Needs "nearest facility" data | Without it HHI cannot separate steering from a rural single-hospital doctor. Measured cost: PR-AUC 0.82 -> 0.42. Backend must send `dest_is_nearest: null` (not `true`) when unknown; the HHI term is then 0 (`HHI_NEAREST_UNKNOWN`). |
| NLP: P10 *or* continuous | Both (continuous length-controlled z + P10 flag) | Length-NLP correlation -0.30 before control, 0.00 after. |
| Red = P95, yellow = P80 | Percentile cuts remain, but are `--yellow-share/--red-share` and returned by the API | They are a review-capacity budget, not a fraud probability. See `capacity_table`: reviewing 5% of referrals gives ~91% precision / ~64% recall on synthetic data; 10% gives ~59% / ~82%; 20% gives ~32% / ~90%. |
| 144 KNS list | `app/ml/data/kns144.tsv`, 144 rows | ICD-10 codes come from a secondary source (medminutes.io, 2026-05); PPK texts are drafts. **A physician must validate both.** Permenkes 5/2014 (the appendix this list traces to) was **revoked by Permenkes 4/2026** (ditetapkan 5 Maret 2026, diundangkan 11 Maret 2026, LN 2026/174, in force from promulgation). It has two articles: revoke 5/2014, effective on promulgation. It names no successor list, and its considerations say PPK are now written by each facility as part of its SOP (UU 17/2023, PP 28/2024). Checked 2026-10-11 on pasal.id and a search summary of the peraturan.go.id PDF; jdih.kemkes.go.id and the PDF itself were unreachable, so confirm there. Do not cite 5/2014 as a current regulation in the proposal. |

## Consequence of the 5/2014 revocation
The 144-diagnosis list no longer has a current regulation behind it, and PPK texts are facility-authored. So the
`kns144.tsv` list is a PoC reference, not a legal standard: the team must pick and cite its authority (e.g. the
competence standard of the Konsil Kedokteran Indonesia, or the list BPJS Kesehatan applies) and have a physician sign it
off. For a pilot, the narrative layer should compare against the participating facility's own PPK text, not the drafts
in `kns144.tsv`. The code already takes the table from `app/ml/data/*.tsv`, so swapping it means new rows plus a retrain,
and `diagnosis.VERSION` should change with them.

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

## Production regime today: only NS and narrative score
The deployed backend has no distance data (`dest_is_nearest: null`, HHI off) and SISRUTE is empty (`sisrute_available: false`,
flag off). `production_regime_no_hhi_no_sisrute` in `train_report.json` measures exactly that, on the same synthetic test set
and the same cuts as the full model:

| | all layers | HHI off | HHI + SISRUTE off (today) |
|---|---|---|---|
| red / yellow share | 7.2% / 15.3% | 4.1% / 15.9% | **1.6% / 15.4%** |
| recall (yellow+red) | 0.91 | 0.58 | **0.41** |
| red precision | 0.78 | 0.63 | 0.76 |
| PR-AUC | 0.82 | 0.42 | **0.29** |
| flagged: scenario B (steering) / C (equipment) | 1.00 / 1.00 | 0.21 / 1.00 | **0.19 / 0.14** |

- Red nearly disappears (1.6%, not the 5% budget) and the yellow queue is mostly narrative and NS noise. The cuts are
  full-regime percentiles; nothing in the service knows that two layers are off.
- **The request cannot say "SISRUTE not connected".** `sisrute_available: bool` has the same trap `dest_is_nearest` had:
  "no data" and "checked, equipment is not available" both arrive as `false`, so the verifier UI cannot tell that layer 1 never ran.
  Making it `bool | null` with a `SISRUTE_UNKNOWN` reason code (as for `HHI_NEAREST_UNKNOWN`) is a contract change in the
  backend and ML together, so it is not done here.
- Choices, none made in code: (1) accept it and say in the proposal that the PoC runs on two layers; (2) re-cut per regime so
  the review budget holds (`yellow_from`/`red_from` per set of live layers); (3) hold red until a third layer is connected.
  Any of them changes who is reviewed or held, so it is the team's decision.

## Known limits
- Collusion between doctor and patient (scenario X) is mostly undetected (~19% flagged).
- Subtler fraud (half injection strength) drops PR-AUC to ~0.25 and red precision to ~0.34.
- Rural red precision (0.69) is lower than urban (0.77): check stratified thresholds before any real use.
- Labels are not audit-biased in the simulation; real labels exist only for audited cases (keep a 0.5-1% random green audit).
- Embedding is char n-gram TF-IDF (no external service, no narrative leaves the process). Benchmark a self-hosted
  Indonesian sentence model on hand-labelled narratives before the pilot.

## Fewer live layers: the cuts stay, SISRUTE "unknown" is explicit
With HHI off (no distance data) and SISRUTE not connected, only NS and the narrative score. On the synthetic test set that
flags 41% of the fraud (all layers: 91%) and red falls to 1.6% of referrals (`train.py` reports it as
`production_regime_no_hhi_no_sisrute`).
- **Not re-cut.** Cuts re-derived on the train split under that regime and scored on the test split: keeping 5% red gives
  red precision 0.36 (now 0.76) and total recall 0.44 (now 0.41); keeping 2% red gives 0.57 and 0.44. Holding claims with
  a 64% false-hold rate to recover recall of 3 points is the wrong trade, so the full-regime cuts stay. Fewer reds is the
  safe direction when evidence is thinner; the shortfall is a coverage gap to state in the proposal, not to tune away.
- **`sisrute_available` is nullable.** null = not connected (flag 0, reason `SISRUTE_UNKNOWN` on equipment/staff referrals,
  `indicators.sisrute.known = false`); false = checked and the facility has no such equipment (flag 0, no warning). The
  score is identical for both. The ML service is ready; **the backend must send null instead of false while SISRUTE has
  no data** (`ScoringInput.SisruteAvailable` is a plain bool today, so production still sends false).
