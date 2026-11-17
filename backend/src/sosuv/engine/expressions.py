"""{{ }} expressions in node settings, so one node's output feeds the next node's input. Step 6.

Available in templates:
    {{ nodes.<node_id>.output.<field> }}   output of an upstream node
    {{ run.date }} {{ run.id }} {{ run.number }} {{ workflow.name }}

Rendered with a sandboxed Jinja2 environment (no attribute access to Python internals), with
StrictUndefined so a typo fails the task with a clear error instead of an empty string.
A setting that is exactly one expression keeps its type (e.g. a list of FileRefs); otherwise the
result is text.
"""

from collections.abc import Mapping
from typing import Any


def resolve_settings(raw: Mapping[str, Any], scope: Mapping[str, Any]) -> dict[str, Any]:
    raise NotImplementedError("Expressions are implemented in step 6")
