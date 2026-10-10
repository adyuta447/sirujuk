import hashlib
import hmac
import os
from functools import lru_cache
from pathlib import Path

import joblib

from app.core.config import MODEL_PATH


def _expected_sha256() -> str:
    # Pin MODEL_SHA256 from the deploy environment (outside the image) when possible;
    # the sidecar file written at build time only protects against post-build tampering.
    pinned = os.getenv("MODEL_SHA256")
    if pinned:
        return pinned.strip().lower()
    return Path(f"{MODEL_PATH}.sha256").read_text().split()[0].lower()


@lru_cache(maxsize=1)
def load_models():
    # joblib is pickle: loading a tampered file is arbitrary code execution. Verify before deserializing.
    digest = hashlib.sha256(Path(MODEL_PATH).read_bytes()).hexdigest()
    if not hmac.compare_digest(digest, _expected_sha256()):
        raise RuntimeError("model file hash mismatch; refusing to load")
    return joblib.load(MODEL_PATH)  # fails loudly if not trained: run `python train.py`
