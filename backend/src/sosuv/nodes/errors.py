"""Errors a node raises. The engine uses the type to decide whether to retry.

    NodeConfigError      the settings are wrong. Never retried; the user must fix the workflow.
    RetryableNodeError   temporary problem (network down, server busy). Retried with back-off.
    NodeError            anything else that should fail the task. Retried only if the node has retries.
    NodeCancelled        raised by ctx.check_cancelled() when the user cancels the run.

Any other exception is treated as NodeError (a bug or an unexpected failure).
"""


class NodeError(Exception):
    retryable: bool = True  # honours the node's "Retries" setting

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NodeConfigError(NodeError):
    retryable = False


class RetryableNodeError(NodeError):
    retryable = True


class NodeCancelled(NodeError):
    retryable = False

    def __init__(self, message: str = "Cancelled") -> None:
        super().__init__(message)
