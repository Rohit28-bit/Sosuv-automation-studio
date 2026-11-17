"""GET /api/tools: every registered node type with its settings form. The frontend Task Library and
settings panel are built from this, so a new node needs no frontend change."""

from fastapi import APIRouter

from sosuv.nodes.describe import describe_node
from sosuv.nodes.registry import registry
from sosuv.schemas.tool import ToolDefinition

router = APIRouter(tags=["tools"])


@router.get("/tools", response_model=list[ToolDefinition], response_model_exclude_none=True)
async def list_tools() -> list[ToolDefinition]:
    return [describe_node(cls) for cls in registry.all()]
