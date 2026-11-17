"""Workflow graph helpers. A workflow is a DAG: nodes are tasks, edges are "run after"."""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(frozen=True)
class Graph:
    node_ids: tuple[str, ...]
    parents: dict[str, tuple[str, ...]]
    children: dict[str, tuple[str, ...]]

    @classmethod
    def build(cls, node_ids: Iterable[str], edges: Iterable[tuple[str, str]]) -> "Graph":
        ids = tuple(node_ids)
        parents: dict[str, list[str]] = defaultdict(list)
        children: dict[str, list[str]] = defaultdict(list)
        for source, target in edges:
            parents[target].append(source)
            children[source].append(target)
        return cls(
            node_ids=ids,
            parents={n: tuple(parents[n]) for n in ids},
            children={n: tuple(children[n]) for n in ids},
        )

    @property
    def start_nodes(self) -> tuple[str, ...]:
        """Nodes with no incoming edges. Each one has its own start time on scheduled runs."""
        return tuple(n for n in self.node_ids if not self.parents[n])

    def find_cycle(self) -> list[str] | None:
        """Return one cycle as a list of node ids, or None if the graph is a valid DAG."""
        white, grey, black = 0, 1, 2
        color = dict.fromkeys(self.node_ids, white)
        stack: list[str] = []

        def visit(n: str) -> list[str] | None:
            color[n] = grey
            stack.append(n)
            for c in self.children.get(n, ()):
                if color.get(c) == grey:
                    return [*stack[stack.index(c) :], c]
                if color.get(c) == white and (found := visit(c)):
                    return found
            stack.pop()
            color[n] = black
            return None

        for n in self.node_ids:
            if color[n] == white and (found := visit(n)):
                return found
        return None
