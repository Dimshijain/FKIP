import pytest

def test_tc_oracle_001_schema_objects_list(client, admin_headers):
    """TC-ORACLE-001: Retrieve Oracle metadata objects catalog."""
    res = client.get("/oracle/objects", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    objects = res.json()
    assert isinstance(objects, list)
    assert len(objects) >= 4
    names = [o["object_name"] for o in objects]
    assert "DEPARTMENTS" in names
    assert "EMPLOYEES" in names

def test_tc_oracle_003_dependencies_list(client, admin_headers):
    """TC-ORACLE-003: Detect Foreign Key, View, and Trigger dependencies."""
    res = client.get("/oracle/dependencies", headers=admin_headers)
    assert res.status_code == 200
    deps = res.json()
    assert isinstance(deps, list)
    assert len(deps) >= 4
    dep_types = [d["dep_type"] for d in deps]
    assert "FOREIGN_KEY" in dep_types

def test_tc_oracle_004_impact_analysis_departments(client, admin_headers):
    """TC-ORACLE-004 & 005: Change Impact Simulation for DEPARTMENTS with valid references."""
    objs = client.get("/oracle/objects", headers=admin_headers).json()
    dept = next(o for o in objs if o["object_name"] == "DEPARTMENTS")
    
    res = client.get(f"/oracle/impact-analysis?object_id={dept['id']}", headers=admin_headers)
    assert res.status_code == 200
    impacts = res.json()
    assert len(impacts) == 3
    
    emp_impact = next(i for i in impacts if i["object_name"] == "EMPLOYEES")
    assert emp_impact["dep_type"] == "FOREIGN_KEY"
    assert emp_impact["status"] == "VALID_REFERENCE"
    assert emp_impact["status_label"] == "Valid reference"
    assert emp_impact["is_broken"] is False

def test_tc_oracle_007_leaf_node_zero_downstream(client, admin_headers):
    """TC-ORACLE-007: Impact analysis on leaf node with 0 downstream objects."""
    objs = client.get("/oracle/objects", headers=admin_headers).json()
    view_obj = next((o for o in objs if o["object_name"] == "EMP_DETAILS"), None)
    if view_obj:
        res = client.get(f"/oracle/impact-analysis?object_id={view_obj['id']}", headers=admin_headers)
        assert res.status_code == 200
        assert len(res.json()) == 0
