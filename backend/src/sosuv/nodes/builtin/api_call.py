"""API Call: HTTP request with GET, POST, PUT or DELETE."""

from typing import Any, Literal

import httpx

from sosuv.nodes import (
    BaseNode,
    JsonObject,
    JsonValue,
    NodeContext,
    NodeError,
    NodeOutput,
    NodeSettings,
    RetryableNodeError,
    register_node,
    setting,
)

MAX_BODY_CHARS = 20_000


class ApiCallSettings(NodeSettings):
    method: Literal["GET", "POST", "PUT", "DELETE"] = setting("GET", label="Method")
    url: str = setting(label="URL", placeholder="https://api.example.com/notify", min_length=1)
    headers: JsonObject = setting(None, label="Headers (JSON)", placeholder='{"Authorization": "Bearer ..."}')
    body: JsonValue = setting(None, label="Body (JSON)", placeholder='{"status": "done"}')
    expected_status: int = setting(200, label="Expected status code", ge=100, le=599)
    timeout_seconds: int = setting(30, label="Request timeout (seconds)", ge=1, le=600)


class ApiCallOutput(NodeOutput):
    status_code: int
    body: Any  # parsed JSON if the response is JSON, otherwise text (truncated)


@register_node
class ApiCallNode(BaseNode[ApiCallSettings, ApiCallOutput]):
    type = "api_call"
    name = "API Call"
    description = "Call an HTTP API with GET, POST, PUT or DELETE."
    icon = "globe"
    color = "#0891b2"
    category = "Integrations"

    async def run(self, ctx: NodeContext, settings: ApiCallSettings) -> ApiCallOutput:
        ctx.log.info("%s %s", settings.method, settings.url)
        try:
            async with httpx.AsyncClient(timeout=settings.timeout_seconds) as client:
                response = await client.request(
                    settings.method,
                    settings.url,
                    headers=settings.headers or None,
                    json=settings.body if settings.method != "GET" else None,
                )
        except httpx.TransportError as e:  # DNS, connection refused, timeout …
            raise RetryableNodeError(f"Request failed: {e}") from e

        ctx.log.info("Response %d (%d bytes)", response.status_code, len(response.content))
        if response.status_code >= 500:
            raise RetryableNodeError(f"Server error {response.status_code}")
        if response.status_code != settings.expected_status:
            raise NodeError(f"Expected status {settings.expected_status}, got {response.status_code}")

        body: Any
        if "application/json" in response.headers.get("content-type", ""):
            body = response.json()
        else:
            body = response.text[:MAX_BODY_CHARS]
        return ApiCallOutput(status_code=response.status_code, body=body)
