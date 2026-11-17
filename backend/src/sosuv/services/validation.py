"""Workflow validation, the same rules as frontend/src/lib/validate.ts plus server-only checks. Step 3.

Errors (block saving an enabled workflow / starting a run):
    unknown node type · edge to a missing node · cycle (domain.graph.Graph.find_cycle)
    settings fail the node's NodeSettings validation (expressions are checked for syntax only)
    scheduled cycle: weekly with no days, invalid deadline, start node without a valid startTime
    before the deadline
Warnings: nodes not connected to anything.
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Issue:
    level: Literal["error", "warning"]
    message: str
    node_id: str | None = None


@dataclass
class ValidationReport:
    issues: list[Issue] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not any(i.level == "error" for i in self.issues)
