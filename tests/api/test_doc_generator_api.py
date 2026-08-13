import pytest
import time

def test_tc_gen_001_template_synthesis(client, admin_headers):
    """TC-GEN-001: Generate SRS / Tech Design spec from template."""
    res = client.post("/docs/generate", headers=admin_headers, json={
        "doc_type": "TECH_DESIGN",
        "title": "Automated Core Ledger Settlement Spec"
    })
    assert res.status_code in [200, 201], f"Generate failed: {res.text}"
    data = res.json()
    assert "content" in data
    assert len(data["content"]) > 100

def test_tc_gen_002_custom_doc_create_and_append(client, admin_headers):
    """TC-GEN-002 & 003: Save custom document and append section."""
    title = f"Custom Architecture Spec {int(time.time())}"
    res = client.post("/docs/custom", headers=admin_headers, json={
        "title": title,
        "doc_type": "TECH_DESIGN",
        "content": "# Executive Architecture\n\nInitial specification content."
    })
    assert res.status_code == 201
    doc_id = res.json()["id"]
    
    # Append section
    upd_res = client.put(f"/docs/{doc_id}", headers=admin_headers, json={
        "append_content": "## Section 2: Security & Telemetry\n\nAppended telemetry details."
    })
    assert upd_res.status_code == 200
    updated_content = upd_res.json()["content"]
    assert "Initial specification content" in updated_content
    assert "Section 2: Security" in updated_content

def test_tc_gen_004_list_generated_documents(client, admin_headers):
    """TC-GEN-004: List generated documents."""
    res = client.get("/docs", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
