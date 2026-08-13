import pytest
import json

def test_tc_copilot_001_model_discovery(client, admin_headers):
    """TC-COPILOT-001: Discover all configured AI models."""
    res = client.get("/copilot/models", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    models = res.json()
    assert isinstance(models, list)
    assert len(models) >= 5
    model_names = [m.get("model_name") or m.get("name") for m in models]
    assert any("qwen" in str(name).lower() for name in model_names)

def test_tc_copilot_002_synchronous_chat(client, admin_headers):
    """TC-COPILOT-002: Technical audit synchronous chat."""
    res = client.post("/copilot/chat", headers=admin_headers, json={
        "message": "What is Python?",
        "model": "qwen2.5:0.5b"
    })
    assert res.status_code == 200, f"Chat failed: {res.text}"
    data = res.json()
    assert "response" in data
    assert len(data["response"]) > 5

def test_tc_copilot_003_sse_streaming(client, admin_headers):
    """TC-COPILOT-003: Server-Sent Events (SSE) streaming chat."""
    with client.stream("POST", "/copilot/chat/stream", headers=admin_headers, json={
        "message": "Explain database indexing in one sentence.",
        "model": "qwen2.5:0.5b"
    }) as stream_res:
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers.get("content-type", "")
        
        chunks = []
        for line in stream_res.iter_lines():
            if line:
                chunks.append(line)
        assert len(chunks) > 0, "No SSE stream chunks received"

def test_tc_copilot_005_empty_prompt_handling(client, admin_headers):
    """TC-COPILOT-005: Submit empty prompt to Copilot."""
    res = client.post("/copilot/chat", headers=admin_headers, json={
        "message": "",
        "model": "qwen2.5:0.5b"
    })
    assert res.status_code in [400, 422, 200]

def test_tc_copilot_006_session_history(client, admin_headers):
    """TC-COPILOT-006: Retrieve conversation sessions."""
    res = client.get("/copilot/conversations", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
