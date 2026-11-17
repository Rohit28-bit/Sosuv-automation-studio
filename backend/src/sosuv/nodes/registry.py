"""The node registry: every available node type, found automatically.

Design: Plugin + Registry. A node becomes available by being decorated with @register_node and living
in one of two places:
    1. any module under sosuv/nodes/builtin/   (imported automatically)
    2. an installed package that declares the "sosuv.nodes" entry point (see pyproject.toml)
No central list to edit, no API or frontend changes.
"""

import importlib
import pkgutil
import re
from importlib.metadata import entry_points
from typing import Any, TypeVar

from sosuv.nodes.base import BaseNode

NodeClass = TypeVar("NodeClass", bound=type[BaseNode[Any, Any]])

_TYPE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,49}$")
ENTRY_POINT_GROUP = "sosuv.nodes"


class UnknownNodeType(LookupError):
    pass


class NodeRegistry:
    def __init__(self) -> None:
        self._nodes: dict[str, type[BaseNode[Any, Any]]] = {}
        self._discovered = False

    def register(self, cls: NodeClass) -> NodeClass:
        node_type = getattr(cls, "type", None)
        if not isinstance(node_type, str) or not _TYPE_PATTERN.match(node_type):
            raise TypeError(f"{cls.__name__}.type must be snake_case, e.g. 'run_sql' (got {node_type!r})")
        if not getattr(cls, "name", None):
            raise TypeError(f"{cls.__name__} must set a display `name`")
        if not hasattr(cls, "settings_model"):
            raise TypeError(f"{cls.__name__} must subclass BaseNode[YourSettings, YourOutput]")
        existing = self._nodes.get(node_type)
        if existing is not None and existing is not cls:
            raise ValueError(
                f"Node type '{node_type}' is defined twice: {existing.__module__} and {cls.__module__}"
            )
        self._nodes[node_type] = cls
        return cls

    def get(self, node_type: str) -> type[BaseNode[Any, Any]]:
        try:
            return self._nodes[node_type]
        except KeyError:
            raise UnknownNodeType(f"Unknown node type '{node_type}'") from None

    def create(self, node_type: str) -> BaseNode[Any, Any]:
        return self.get(node_type)()

    def __contains__(self, node_type: object) -> bool:
        return node_type in self._nodes

    def all(self) -> list[type[BaseNode[Any, Any]]]:
        return sorted(self._nodes.values(), key=lambda c: (c.category, c.name))

    def discover(self) -> None:
        """Import built-in nodes and installed node packages. Safe to call more than once."""
        if self._discovered:
            return
        from sosuv.nodes import builtin

        for module in pkgutil.walk_packages(builtin.__path__, prefix=f"{builtin.__name__}."):
            if not module.name.rsplit(".", 1)[-1].startswith("_"):
                importlib.import_module(module.name)
        for ep in entry_points(group=ENTRY_POINT_GROUP):
            ep.load()
        self._discovered = True


registry = NodeRegistry()


def register_node(cls: NodeClass) -> NodeClass:
    """Class decorator that makes a node available in the Task Library and to workers."""
    return registry.register(cls)
