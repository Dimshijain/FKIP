import pytest

def test_tc_dna_001_applications_list(client, admin_headers):
    """TC-DNA-001: List DNA core banking applications."""
    res = client.get("/dna/apps", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    apps = res.json()
    assert isinstance(apps, list)

def test_tc_dna_003_capability_clusters(client, admin_headers):
    """TC-DNA-003: Retrieve semantic capability clusters."""
    res = client.get("/dna/clusters", headers=admin_headers)
    assert res.status_code == 200
    clusters = res.json()
    assert isinstance(clusters, list)
