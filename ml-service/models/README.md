# Model artifacts

Nothing here is committed except this file and `.gitkeep`. `Dockerfile` runs `train.py` at build and writes:

- `sirujuk.joblib`: the fitted `Scorer` (TF-IDF, logistic regression, peer stats, cuts).
- `sirujuk.joblib.sha256`: its hash. `app/core/model_loader.py` checks it before unpickling and refuses to load on a mismatch.
- `train_report.json`: metrics, ablation, robustness and capacity table (all on synthetic data, see `MODEL_CARD.md`).

For local runs: `python train.py > models/train_report.json`, then write the hash with `shasum -a 256`.
Train and serve with the same `scikit-learn` version (pinned in `requirements.txt`); a pickle from another version loads with a warning and is not guaranteed to score the same.
