"""MongoDB: find, insert, update, delete, aggregate. Implementation: step 9."""

from typing import Any, Literal

from pydantic import SecretStr

from sosuv.nodes import (
    BaseNode,
    FileRef,
    JsonObject,
    JsonValue,
    NodeContext,
    NodeOutput,
    NodeSettings,
    register_node,
    setting,
)


class MongoSettings(NodeSettings):
    connection_uri: SecretStr = setting(
        label="Connection URI",
        placeholder="mongodb+srv://user:pass@cluster.mongodb.net",
        help="Stored encrypted on the server.",
    )
    database: str = setting(label="Database", placeholder="production")
    collection: str = setting(label="Collection", placeholder="orders")
    operation: Literal["find", "insertOne", "updateMany", "deleteMany", "aggregate"] = setting(
        "find", label="Operation"
    )
    filter: JsonObject = setting(None, label="Filter / Query (JSON)", placeholder='{"status": "pending"}')
    document_or_pipeline: JsonValue = setting(
        None, label="Document / Update / Pipeline (JSON)", placeholder='{"$set": {"processed": true}}'
    )
    limit: int = setting(100, label="Limit (for find)", ge=1)


class MongoOutput(NodeOutput):
    affected: int
    documents: list[dict[str, Any]]
    file: FileRef | None = None


@register_node
class MongoNode(BaseNode[MongoSettings, MongoOutput]):
    type = "mongodb"
    name = "MongoDB"
    description = "Find, insert, update, delete, or aggregate documents in a MongoDB collection."
    icon = "mongodb"
    color = "#10aa50"
    category = "Databases"

    async def run(self, ctx: NodeContext, settings: MongoSettings) -> MongoOutput:
        raise NotImplementedError("MongoDB operations are implemented in step 9")
