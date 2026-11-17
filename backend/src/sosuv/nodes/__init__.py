"""The node SDK: everything a node plugin is allowed to import.

    from sosuv.nodes import BaseNode, NodeContext, NodeOutput, NodeSettings, register_node, setting

A node plugin must not import the database, API, engine or scheduler (enforced by import-linter in
pyproject.toml). Everything it needs comes through NodeContext. That keeps nodes safe, testable
without a database, and runnable in any executor (subprocess today, Docker later).
"""

from sosuv.nodes.base import BaseNode
from sosuv.nodes.context import FileAccess, NodeContext, NodeLogger, RunInfo
from sosuv.nodes.errors import NodeCancelled, NodeConfigError, NodeError, RetryableNodeError
from sosuv.nodes.registry import register_node, registry
from sosuv.nodes.settings import (
    EmptyOutput,
    FileRef,
    JsonObject,
    JsonValue,
    NodeOutput,
    NodeSettings,
    setting,
)

__all__ = [
    "BaseNode",
    "EmptyOutput",
    "FileAccess",
    "FileRef",
    "JsonObject",
    "JsonValue",
    "NodeCancelled",
    "NodeConfigError",
    "NodeContext",
    "NodeError",
    "NodeLogger",
    "NodeOutput",
    "NodeSettings",
    "RetryableNodeError",
    "RunInfo",
    "register_node",
    "registry",
    "setting",
]
