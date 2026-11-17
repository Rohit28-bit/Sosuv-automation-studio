"""The worker process. Step 5.

Loop (worker_concurrency slots in parallel):
    task = queue.claim(worker_id, queues)          nothing? sleep worker_poll_seconds
    request = build request: load version, resolve {{ }} with parent outputs, decrypt secrets
    result = executor.execute(request, log_sink, is_cancelled)   heartbeat every few seconds meanwhile
    queue.finish(task, result)                      -> saves output, retries, services.runs.advance()

On SIGTERM: stop claiming, let running tasks finish (up to a grace period), release the rest.
"""

from sosuv.config import Settings


class Worker:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def run_forever(self) -> None:
        raise NotImplementedError("The worker loop is implemented in step 5")
