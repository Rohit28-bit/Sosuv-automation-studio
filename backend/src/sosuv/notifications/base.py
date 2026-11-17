"""Notifier interface (Strategy). One class per provider; picked by the workflow's failureWebhook.provider.

Adding a provider (e.g. email, PagerDuty): write a class with `send()`, add it to NOTIFIERS.
"""

from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True)
class RunEvent:
    kind: Literal["run_failed", "run_completed", "deadline_missed"]
    workflow_name: str
    run_number: int
    run_url: str
    failed_nodes: tuple[str, ...] = ()
    error: str | None = None
    log_tail: str | None = None


class Notifier(Protocol):
    async def send(self, webhook_url: str, event: RunEvent, *, channel: str | None = None) -> None: ...


class SlackNotifier:
    async def send(self, webhook_url: str, event: RunEvent, *, channel: str | None = None) -> None:
        raise NotImplementedError("Slack alerts are implemented in step 10")


class TeamsNotifier:
    async def send(self, webhook_url: str, event: RunEvent, *, channel: str | None = None) -> None:
        raise NotImplementedError("Teams alerts are implemented in step 10")


class WebhookNotifier:
    """Plain JSON POST for any other system."""

    async def send(self, webhook_url: str, event: RunEvent, *, channel: str | None = None) -> None:
        raise NotImplementedError("Webhook alerts are implemented in step 10")


NOTIFIERS: dict[str, Notifier] = {
    "slack": SlackNotifier(),
    "teams": TeamsNotifier(),
    "custom": WebhookNotifier(),
}
