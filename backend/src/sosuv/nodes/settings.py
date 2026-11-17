"""Building blocks for a node's settings (its form in the UI) and its output (what later nodes get).

Settings
    Subclass NodeSettings and declare fields with `setting(...)`. The Python type decides the UI widget:
        str -> text · int/float -> number · bool -> checkbox · Literal[...] / Enum -> select
        SecretStr -> password (encrypted, masked in logs) · JsonObject / JsonValue -> JSON textarea
        setting(widget="textarea") -> multi-line text
    Field names are snake_case in Python and camelCase in the UI/JSON (remote_folder <-> remoteFolder).

Output
    Subclass NodeOutput. Keep it small (counts, ids, short lists). Big data goes in files: save the
    file with ctx.files.save(...) and return the FileRef.
"""

import json
from typing import Annotated, Any, Literal, cast

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from pydantic.alias_generators import to_camel
from pydantic_core import PydanticUndefined

Widget = Literal["textarea"]


def setting(
    default: Any = PydanticUndefined,
    *,
    label: str | None = None,
    placeholder: str | None = None,
    help: str | None = None,
    widget: Widget | None = None,
    **constraints: Any,
) -> Any:
    """Declare one settings field. No default means the field is required.

    Extra keyword arguments are Pydantic constraints, e.g. ge=0, le=65535, min_length=1.
    """
    extra = {k: v for k, v in (("placeholder", placeholder), ("widget", widget)) if v is not None}
    return Field(
        default, title=label, description=help, json_schema_extra=cast(Any, extra) or None, **constraints
    )


class NodeSettings(BaseModel):
    """Base class for a node's settings. Validated before the node runs."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",  # older saved workflows may contain fields a node no longer has
        frozen=True,
        str_strip_whitespace=True,
    )


class NodeOutput(BaseModel):
    """Base class for what a node returns. Stored as JSON and passed to the next nodes."""

    model_config = ConfigDict(extra="forbid")


class EmptyOutput(NodeOutput):
    """For nodes that produce nothing for later nodes."""


class FileRef(BaseModel):
    """A file stored by the platform. Pass this between nodes instead of file contents."""

    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    size: int
    content_type: str | None = None


def _parse_json(value: Any) -> Any:
    """The UI sends JSON fields as text. Accept text or already-parsed values."""
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Not valid JSON: {e.msg} (line {e.lineno}, column {e.colno})") from e
    return value


JsonObject = Annotated[dict[str, Any] | None, BeforeValidator(_parse_json)]
"""A JSON object entered as text in the UI, e.g. headers or query parameters."""

JsonValue = Annotated[dict[str, Any] | list[Any] | None, BeforeValidator(_parse_json)]
"""A JSON object or array entered as text in the UI, e.g. a request body or a pipeline."""
