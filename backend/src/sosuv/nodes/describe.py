"""Turns a node class into the ToolDefinition the frontend uses to draw the Task Library and forms.

Output matches ToolDefinition / ToolField in frontend/src/types.ts.
"""

import enum
import inspect
from types import NoneType, UnionType
from typing import Any, Literal, Union, get_args, get_origin

from pydantic import BaseModel, SecretStr
from pydantic.fields import FieldInfo
from pydantic_core import PydanticUndefined

from sosuv.nodes.base import BaseNode

FieldType = Literal["text", "number", "password", "select", "textarea", "checkbox"]
Primitive = str | int | float | bool


class ToolField(BaseModel):
    key: str
    label: str
    type: FieldType
    required: bool = False
    placeholder: str | None = None
    help: str | None = None
    options: list[str] | None = None
    default: Primitive | None = None


class ToolDefinition(BaseModel):
    type: str
    name: str
    description: str
    icon: str
    color: str
    category: str
    version: int
    fields: list[ToolField]


def describe_node(cls: type[BaseNode[Any, Any]]) -> ToolDefinition:
    return ToolDefinition(
        type=cls.type,
        name=cls.name,
        description=cls.description,
        icon=cls.icon,
        color=cls.color,
        category=cls.category,
        version=cls.version,
        fields=[_describe_field(name, info) for name, info in cls.settings_model.model_fields.items()],
    )


def _describe_field(name: str, info: FieldInfo) -> ToolField:
    extra = info.json_schema_extra if isinstance(info.json_schema_extra, dict) else {}
    widget = extra.get("widget")
    field_type, options = _ui_type(info.annotation, widget if isinstance(widget, str) else None)
    placeholder = extra.get("placeholder")
    return ToolField(
        key=info.alias or name,
        label=info.title or name.replace("_", " ").capitalize(),
        type=field_type,
        required=info.is_required(),
        placeholder=placeholder if isinstance(placeholder, str) else None,
        help=info.description,
        options=options,
        default=_default(info),
    )


def _ui_type(annotation: Any, widget: str | None) -> tuple[FieldType, list[str] | None]:
    ann = annotation
    if get_origin(ann) in (Union, UnionType):
        args = [a for a in get_args(ann) if a is not NoneType]
        if len(args) == 1:
            ann = args[0]
        elif all(_is_container(a) for a in args):
            return "textarea", None
    if widget == "textarea":
        return "textarea", None
    if ann is SecretStr:
        return "password", None
    if ann is bool:
        return "checkbox", None
    if ann in (int, float):
        return "number", None
    if get_origin(ann) is Literal:
        return "select", [str(a) for a in get_args(ann)]
    if inspect.isclass(ann) and issubclass(ann, enum.Enum):
        return "select", [str(m.value) for m in ann]
    if _is_container(ann):
        return "textarea", None
    return "text", None


def _is_container(ann: Any) -> bool:
    return ann in (dict, list) or get_origin(ann) in (dict, list)


def _default(info: FieldInfo) -> Primitive | None:
    value = info.default
    if value is PydanticUndefined or value is None or isinstance(value, SecretStr):
        return None
    if isinstance(value, enum.Enum):
        value = value.value
    return value if isinstance(value, str | int | float | bool) else None
