import pytest
import time

def test_tc_innov_001_list_opportunities(client, admin_headers):
    """TC-INNOV-001: Fetch innovation opportunities."""
    res = client.get("/innovation/opportunities", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert isinstance(res.json(), list)

def test_tc_innov_002_create_and_delete_opportunity(client, admin_headers):
    """TC-INNOV-002 & 004: Create, update, and delete opportunity."""
    name = f"Auto Opportunity {int(time.time())}"
    res = client.post("/innovation/opportunities", headers=admin_headers, json={
        "name": name,
        "description": "Automated ledger reconciliation pipeline",
        "business_value": "HIGH",
        "complexity": "MEDIUM",
        "priority": "P1",
        "source_type": "GENERAL",
        "status": "BACKLOG"
    })
    assert res.status_code in [200, 201], f"Create opportunity failed: {res.text}"
    opp = res.json()
    opp_id = opp["id"]
    
    # Update status via query parameters
    upd_res = client.put(f"/innovation/opportunities/{opp_id}?status_val=IN_PROGRESS&priority_val=P1", headers=admin_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["status"] == "IN_PROGRESS"
    
    # Delete
    del_res = client.delete(f"/innovation/opportunities/{opp_id}", headers=admin_headers)
    assert del_res.status_code in [200, 204]
