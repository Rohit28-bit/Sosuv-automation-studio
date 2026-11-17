"""Wait: pause the workflow. The reference example for writing a node."""

import asyncio

from sosuv.nodes import BaseNode, NodeContext, NodeOutput, NodeSettings, register_node, setting


class WaitSettings(NodeSettings):
    seconds: int = setting(5, label="Duration (seconds)", ge=0, le=24 * 3600)


class WaitOutput(NodeOutput):
    waited_seconds: int


@register_node
class WaitNode(BaseNode[WaitSettings, WaitOutput]):
    type = "wait"
    name = "Wait"
    description = "Pause the workflow for a set time."
    icon = "timer"
    color = "#64748b"
    category = "Flow"

    async def run(self, ctx: NodeContext, settings: WaitSettings) -> WaitOutput:
        ctx.log.info("Waiting %d seconds", settings.seconds)
        for _ in range(settings.seconds):
            ctx.check_cancelled()  # long-running nodes should check regularly
            await asyncio.sleep(1)
        ctx.log.info("Done waiting")
        return WaitOutput(waited_seconds=settings.seconds)
