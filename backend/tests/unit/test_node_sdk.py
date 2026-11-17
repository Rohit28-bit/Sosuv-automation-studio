"""The node plugin system: registration, UI description, execution."""

from typing import Literal

import pytest
from pydantic import SecretStr

from sosuv.engine.executor import ExecutionRequest, InProcessExecutor
from sosuv.engine.logs import MemoryLogSink
from sosuv.nodes import BaseNode, JsonObject, NodeContext, NodeOutput, NodeSettings, setting
from sosuv.nodes.describe import describe_node
from sosuv.nodes.registry import NodeRegistry, registry

FRONTEND_TOOL_TYPES = {
    "ftp",
    "run_sql",
    "postgres",
    "mongodb",
    "convert_excel",
    "move_file",
    "api_call",
    "process_file",
    "wait",
}


class EchoSettings(NodeSettings):
    greeting: str = setting(label="Greeting", placeholder="Hello")
    times: int = setting(1, ge=1)
    mode: Literal["upper", "lower"] = setting("upper")
    loud: bool = setting(False)
    token: SecretStr | None = setting(None)
    extra: JsonObject = setting(None)
    notes: str = setting("", widget="textarea")


class EchoOutput(NodeOutput):
    text: str


class EchoNode(BaseNode[EchoSettings, EchoOutput]):
    type = "echo"
    name = "Echo"

    async def run(self, ctx: NodeContext, settings: EchoSettings) -> EchoOutput:
        token = settings.token.get_secret_value() if settings.token else ""
        ctx.log.info("token is %s", token)
        text = " ".join([settings.greeting] * settings.times)
        return EchoOutput(text=text.upper() if settings.mode == "upper" else text.lower())


def test_builtin_nodes_match_frontend_tools() -> None:
    assert {cls.type for cls in registry.all()} == FRONTEND_TOOL_TYPES


def test_generics_fill_settings_and_output_models() -> None:
    assert EchoNode.settings_model is EchoSettings
    assert EchoNode.output_model is EchoOutput


def test_describe_maps_python_types_to_ui_fields() -> None:
    fields = {f.key: f for f in describe_node(EchoNode).fields}
    assert fields["greeting"].type == "text" and fields["greeting"].required
    assert fields["greeting"].placeholder == "Hello"
    assert fields["times"].type == "number" and fields["times"].default == 1
    assert fields["mode"].type == "select" and fields["mode"].options == ["upper", "lower"]
    assert fields["loud"].type == "checkbox"
    assert fields["token"].type == "password"
    assert fields["extra"].type == "textarea"
    assert fields["notes"].type == "textarea"


def test_keys_are_camel_case_like_the_frontend() -> None:
    ftp = {f.key for f in describe_node(registry.get("ftp")).fields}
    assert {"remoteFolder", "filePattern", "localPath"} <= ftp


def test_duplicate_type_is_rejected() -> None:
    reg = NodeRegistry()
    reg.register(EchoNode)

    class Other(EchoNode):
        pass

    with pytest.raises(ValueError, match="defined twice"):
        reg.register(Other)


def test_bad_type_name_is_rejected() -> None:
    class Bad(EchoNode):
        type = "Bad-Name"

    with pytest.raises(TypeError, match="snake_case"):
        NodeRegistry().register(Bad)


async def test_execute_validates_runs_and_masks_secrets(run_info, files) -> None:  # type: ignore[no-untyped-def]
    reg = NodeRegistry()
    reg.register(EchoNode)
    sink = MemoryLogSink()
    result = await InProcessExecutor(files, reg).execute(
        ExecutionRequest(
            task_run_id="t1",
            node_type="echo",
            run=run_info,
            settings={"greeting": "hi", "times": "2", "token": "s3cr3t-value", "extra": '{"a": 1}'},
            inputs={},
            timeout_seconds=5,
            secret_values=("s3cr3t-value",),
        ),
        sink,
        lambda: False,
    )
    assert result.status == "completed"
    assert result.output == {"text": "HI HI"}
    assert sink.messages == ["token is ****"]


async def test_invalid_settings_fail_without_retry(run_info, files) -> None:  # type: ignore[no-untyped-def]
    reg = NodeRegistry()
    reg.register(EchoNode)
    result = await InProcessExecutor(files, reg).execute(
        ExecutionRequest(
            task_run_id="t1",
            node_type="echo",
            run=run_info,
            settings={"times": 0},
            inputs={},
            timeout_seconds=5,
        ),
        MemoryLogSink(),
        lambda: False,
    )
    assert result.status == "failed"
    assert result.retryable is False
    assert "greeting" in (result.error or "")


async def test_wait_node_can_be_cancelled(run_info, files) -> None:  # type: ignore[no-untyped-def]
    result = await InProcessExecutor(files).execute(
        ExecutionRequest(
            task_run_id="t1",
            node_type="wait",
            run=run_info,
            settings={"seconds": 30},
            inputs={},
            timeout_seconds=60,
        ),
        MemoryLogSink(),
        lambda: True,
    )
    assert result.status == "cancelled"
