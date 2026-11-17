"""PostgreSQL: queries, inserts, updates. Implementation: step 9."""

from typing import Any, Literal

from pydantic import SecretStr

from sosuv.nodes import (
    BaseNode,
    FileRef,
    JsonObject,
    NodeContext,
    NodeOutput,
    NodeSettings,
    register_node,
    setting,
)


class PostgresSettings(NodeSettings):
    host: str = setting("localhost", label="Host", placeholder="localhost")
    port: int = setting(5432, label="Port", ge=1, le=65535)
    database: str = setting(label="Database", placeholder="app_db")
    username: str = setting(label="Username", placeholder="postgres")
    password: SecretStr | None = setting(None, label="Password", help="Stored encrypted on the server.")
    ssl: bool = setting(False, label="Use SSL / TLS")
    operation: Literal["query", "insert", "update", "stored procedure"] = setting("query", label="Operation")
    query: str = setting(
        label="SQL query",
        placeholder="SELECT * FROM orders WHERE created_at >= CURRENT_DATE",
        widget="textarea",
    )
    parameters: JsonObject = setting(None, label="Parameters (JSON)", placeholder='{"limit": 100}')


class PostgresOutput(NodeOutput):
    row_count: int
    rows: list[dict[str, Any]]
    file: FileRef | None = None


@register_node
class PostgresNode(BaseNode[PostgresSettings, PostgresOutput]):
    type = "postgres"
    name = "PostgreSQL"
    description = "Execute SQL queries, inserts, or updates against a PostgreSQL database."
    icon = "postgres"
    color = "#336791"
    category = "Databases"

    async def run(self, ctx: NodeContext, settings: PostgresSettings) -> PostgresOutput:
        raise NotImplementedError("PostgreSQL execution is implemented in step 9")
