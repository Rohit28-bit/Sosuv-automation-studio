"""Execution engine: queue -> worker -> executor -> node.

queue.py        claim / heartbeat / finish tasks (Postgres SKIP LOCKED; swappable)
worker.py       the worker process loop (claim, run, save, advance, heartbeat, graceful shutdown)
executor.py     HOW a node runs: InProcessExecutor (tests/dev), SubprocessExecutor (production)
child.py        entry point inside the subprocess
protocol.py     the JSON-lines messages between worker and child
expressions.py  {{ }} templates in settings, filled from parent outputs
logs.py         node log lines: masking secrets, batching to the database
retry.py        back-off between attempts
"""
