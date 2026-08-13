import pytest

def test_tc_graph_001_graph_data(client, admin_headers):
    """TC-GRAPH-001: Fetch cross-entity graph nodes and edges."""
    res = client.get("/knowledge-graph", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["edges"], list)
    assert len(data["nodes"]) > 0
