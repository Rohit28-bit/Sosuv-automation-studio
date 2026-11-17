"""BaseNode: the contract every node type implements.

    @register_node
    class WaitNode(BaseNode[WaitSettings, WaitOutput]):
        type = "wait"
        name = "Wait"
        description = "Pause the workflow for a set time."
        icon = "timer"
        color = "#64748b"

        async def run(self, ctx: NodeContext, settings: WaitSettings) -> WaitOutput:
            ...

Design: Template Method. The engine calls `execute()`, which validates settings, calls your `run()`,
and checks the output. You only write `run()`. The settings and output classes are read from the
generic parameters, so they never need to be repeated.
"""

import builtins
from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any, ClassVar, Generic, TypeVar, cast, get_args, get_origin

from pydantic import ValidationError

from sosuv.nodes.context import NodeContext
from sosuv.nodes.errors import NodeConfigError, NodeError
from sosuv.nodes.settings import NodeOutput, NodeSettings

SettingsT = TypeVar("SettingsT", bound=NodeSettings)
OutputT = TypeVar("OutputT", bound=NodeOutput)


class BaseNode(ABC, Generic[SettingsT, OutputT]):
    # --- metadata shown in the Task Library -------------------------------------------------------
    type: ClassVar[str]
    """Unique, stable id saved in workflows, e.g. "run_sql". Never rename it once used."""
    name: ClassVar[str]
    description: ClassVar[str] = ""
    icon: ClassVar[str] = "box"  # lucide icon name, see frontend components/ToolIcon.tsx
    color: ClassVar[str] = "#64748b"
    category: ClassVar[str] = "General"
    version: ClassVar[int] = 1  # bump when settings change incompatibly

    # --- execution --------------------------------------------------------------------------------
    queue: ClassVar[str] = "default"
    """Worker pool that runs this node. Heavy nodes can use e.g. "heavy" to go to bigger machines."""

    # Filled in automatically from BaseNode[Settings, Output].
    # (builtins.type because the `type` attribute above shadows the builtin inside this class)
    settings_model: ClassVar[builtins.type[NodeSettings]]
    output_model: ClassVar[builtins.type[NodeOutput]]

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        for base in getattr(cls, "__orig_bases__", ()):
            if get_origin(base) is BaseNode:
                settings_model, output_model = get_args(base)
                cls.settings_model = settings_model
                cls.output_model = output_model

    @abstractmethod
    async def run(self, ctx: NodeContext, settings: SettingsT) -> OutputT:
        """Do the work. Log with ctx.log, read parent outputs from ctx.inputs, return your output."""

    # --- called by the engine; do not override ----------------------------------------------------
    @classmethod
    def parse_settings(cls, raw: Mapping[str, Any]) -> SettingsT:
        try:
            return cast(SettingsT, cls.settings_model.model_validate(raw))
        except ValidationError as e:
            problems = "; ".join(
                f"{'.'.join(str(p) for p in err['loc']) or 'settings'}: {err['msg']}" for err in e.errors()
            )
            raise NodeConfigError(f"Invalid settings: {problems}") from e

    async def execute(self, ctx: NodeContext, raw_settings: Mapping[str, Any]) -> dict[str, Any]:
        settings = self.parse_settings(raw_settings)
        output = await self.run(ctx, settings)
        if not isinstance(output, self.output_model):
            raise NodeError(
                f"Node '{self.type}' returned {type(output).__name__}, expected {self.output_model.__name__}"
            )
        return output.model_dump(mode="json")
