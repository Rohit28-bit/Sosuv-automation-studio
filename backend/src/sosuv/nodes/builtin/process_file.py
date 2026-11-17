"""Process File: read, validate and filter file contents. Implementation: step 9."""

from typing import Literal

from sosuv.nodes import BaseNode, FileRef, NodeContext, NodeOutput, NodeSettings, register_node, setting


class ProcessFileSettings(NodeSettings):
    input_file: str = setting(label="Input file", placeholder="incoming/daily_file.csv")
    format: Literal["csv", "xlsx", "json"] = setting("csv", label="Expected format")
    required_columns: str = setting(
        "", label="Required columns", placeholder="id, amount, date", help="Comma separated."
    )
    filter: str = setting("", label="Row filter", placeholder="amount > 0")
    fail_if_empty: bool = setting(True, label="Fail if the file is empty")


class ProcessFileOutput(NodeOutput):
    file: FileRef
    rows_in: int
    rows_out: int


@register_node
class ProcessFileNode(BaseNode[ProcessFileSettings, ProcessFileOutput]):
    type = "process_file"
    name = "Process File"
    description = "Read, validate and filter file contents."
    icon = "filecheck"
    color = "#db2777"
    category = "Files"

    async def run(self, ctx: NodeContext, settings: ProcessFileSettings) -> ProcessFileOutput:
        raise NotImplementedError("File processing is implemented in step 9")
