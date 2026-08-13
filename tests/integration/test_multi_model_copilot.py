import pytest

def test_all_configured_copilot_models(client, admin_headers):
    """Integration Test: Live inference check across all configured AI models."""
    models_res = client.get("/copilot/models", headers=admin_headers)
    assert models_res.status_code == 200
    models = models_res.json()
    assert len(models) >= 5
    
    # Test primary model
    test_model = models[0].get("id") or "qwen2.5:0.5b"
    chat_res = client.post("/copilot/chat", headers=admin_headers, json={
        "message": "What is 2+2?",
        "model": test_model
    })
    assert chat_res.status_code == 200
    assert len(chat_res.json().get("response", "")) > 0
