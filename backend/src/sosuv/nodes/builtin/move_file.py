"""Move File: move or copy files between folders. Implementation: step 9."""

from typing import Literal

from sosuv.nodes import BaseNode, NodeContext, NodeOutput, NodeSettings, register_node, setting


class MoveFileSettings(NodeSettings):
    source: str = setting(label="Source", placeholder="processed/*.csv")
    destination: str = setting(label="Destination", placeholder="archive/")
    mode: Literal["move", "copy"] = setting("move", label="Mode")
    overwrite: bool = setting(False, label="Overwrite existing files")


class MoveFileOutput(NodeOutput):
    moved: list[str]
    count: int


@register_node
class MoveFileNode(BaseNode[MoveFileSettings, MoveFileOutput]):
    type = "move_file"
    name = "Move File"
    description = "Move or copy files between folders."
    icon = "folder"
    color = "#ea580c"
    category = "Files"

    async def run(self, ctx: NodeContext, settings: MoveFileSettings) -> MoveFileOutput:
        raise NotImplementedError("File moves are implemented in step 9")
