"""Run SQL: a query or stored procedure on PostgreSQL, SQL Server or MySQL. Implementation: step 9."""

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


class RunSqlSettings(NodeSettings):
    db_type: Literal["postgresql", "mssql", "mysql"] = setting("postgresql", label="Database type")
    connection: SecretStr = setting(label="Connection string", placeholder="postgresql://user:pass@host/db")
    mode: Literal["query", "stored procedure"] = setting("query", label="Mode")
    sql: str = setting(label="SQL / procedure name", placeholder="SELECT * FROM orders", widget="textarea")
    parameters: JsonObject = setting(
        None, label="Parameters (JSON)", placeholder='{"BusinessDate": "{{run.date}}"}'
    )


class RunSqlOutput(NodeOutput):
    row_count: int
    rows: list[dict[str, Any]]  # first rows only; the full result goes to `file`
    file: FileRef | None = None


@register_node
class RunSqlNode(BaseNode[RunSqlSettings, RunSqlOutput]):
    type = "run_sql"
    name = "Run SQL"
    description = "Run a SQL query or a stored procedure."
    icon = "database"
    color = "#7c3aed"
    category = "Databases"

    async def run(self, ctx: NodeContext, settings: RunSqlSettings) -> RunSqlOutput:
        raise NotImplementedError("SQL execution is implemented in step 9")
