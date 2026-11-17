"""Convert Excel: Excel to CSV or CSV to Excel. Implementation: step 9."""

from typing import Literal

from sosuv.nodes import BaseNode, FileRef, NodeContext, NodeOutput, NodeSettings, register_node, setting


class ConvertExcelSettings(NodeSettings):
    input_file: str = setting(label="Input file", placeholder="incoming/daily_file.xlsx")
    output_format: Literal["csv", "xlsx"] = setting("csv", label="Output format")
    sheet_name: str = setting("", label="Sheet name", placeholder="Sheet1")
    output_file: str = setting("", label="Output file", placeholder="processed/daily_file.csv")


class ConvertExcelOutput(NodeOutput):
    file: FileRef
    rows: int


@register_node
class ConvertExcelNode(BaseNode[ConvertExcelSettings, ConvertExcelOutput]):
    type = "convert_excel"
    name = "Convert Excel"
    description = "Convert Excel to CSV, or CSV back to Excel."
    icon = "sheet"
    color = "#16a34a"
    category = "Files"

    async def run(self, ctx: NodeContext, settings: ConvertExcelSettings) -> ConvertExcelOutput:
        raise NotImplementedError("Excel conversion is implemented in step 9")
