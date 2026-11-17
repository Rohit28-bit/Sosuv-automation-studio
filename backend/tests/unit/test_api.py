"""API smoke tests that need no database."""

from fastapi.testclient import TestClient

from sosuv.main import create_app


def test_health_and_tools() -> None:
    with TestClient(create_app()) as client:
        assert client.get("/api/health/live").json()["status"] == "ok"
        tools = client.get("/api/tools").json()
        wait = next(t for t in tools if t["type"] == "wait")
        assert wait["fields"] == [
            {
                "key": "seconds",
                "label": "Duration (seconds)",
                "type": "number",
                "required": False,
                "default": 5,
            }
        ]


def test_unbuilt_endpoints_answer_501_with_error_shape() -> None:
    with TestClient(create_app()) as client:
        res = client.get("/api/runs/00000000-0000-0000-0000-000000000000")
        assert res.status_code == 501
        assert res.json()["code"] == "not_implemented"
        assert "requestId" in res.json()
