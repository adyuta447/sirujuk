"""Point-in-time indicators: every value uses only referrals issued strictly before the current one."""
from collections import Counter, deque

import numpy as np
import pandas as pd

from app.ml.diagnosis import N_NS

MIN_NS, MIN_HHI, W_NS, W_HHI, K_SHRINK = 20, 30, 90, 180, 10


def doctor_history(df: pd.DataFrame) -> pd.DataFrame:
    """Adds ns90, n90, hhi180, n180, dom_dest per referral (rolling, excluding the referral itself)."""
    out = np.zeros((len(df), 5))
    for _, g in df.groupby("doc", sort=False):
        idx, days, ns, dest = g.index.values, g.day.values, (g.diag.values >= 0) & (g.diag.values < N_NS), g.dest.values
        q90, q180, c180, ns_sum = deque(), deque(), Counter(), 0
        for k, i in enumerate(idx):
            while q90 and days[q90[0]] <= days[k] - W_NS:
                ns_sum -= ns[q90.popleft()]
            while q180 and days[q180[0]] <= days[k] - W_HHI:
                c180[dest[q180.popleft()]] -= 1
            n180, n90 = len(q180), len(q90)
            sq = sum(v * v for v in c180.values())
            dom = max(c180, key=c180.get) if n180 else -1
            out[i] = (ns_sum / n90 if n90 else np.nan, n90, 10000 * sq / n180 ** 2 if n180 else np.nan, n180, dom)
            q90.append(k); q180.append(k); c180[dest[k]] += 1; ns_sum += ns[k]
    h = pd.DataFrame(out, columns=["ns90", "n90", "hhi180", "n180", "dom_dest"], index=df.index)
    return pd.concat([df, h], axis=1)


def shrink(x, n, med, k=K_SHRINK):
    """Empirical-Bayes shrinkage toward the peer median: sparse history cannot dominate the score."""
    x = np.where(np.isnan(x), med, x)
    return (n * x + k * med) / (n + k)
