"""Back-off between attempts: the node's retryDelaySec, doubled each time, capped, with jitter so a
broken server isn't hit by all retries at the same moment."""

import random

MAX_DELAY_SECONDS = 30 * 60


def retry_delay(attempt: int, base_seconds: float) -> float:
    """Seconds to wait before the next try. attempt = the attempt that just failed (1, 2, …)."""
    delay = min(base_seconds * 2 ** max(attempt - 1, 0), MAX_DELAY_SECONDS)
    return float(delay * random.uniform(0.8, 1.2))
