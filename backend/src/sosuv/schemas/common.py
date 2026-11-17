from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """camelCase JSON, snake_case Python, readable from ORM objects."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ErrorResponse(ApiModel):
    code: str
    message: str
    details: object | None = None
    request_id: str | None = None
