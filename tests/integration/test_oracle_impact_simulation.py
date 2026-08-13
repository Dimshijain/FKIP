import pytest

def test_oracle_impact_simulation_graph_traversal(client, admin_headers):
    """Integration Test: Oracle DDL schema catalog -> Graph traversal -> Valid references vs broken."""
    objs_res = client.get("/oracle/objects", headers=admin_headers)
    assert objs_res.status_code == 200
    objs = objs_res.json()
    dept = next((o for o in objs if o["object_name"] == "DEPARTMENTS"), None)
    assert dept is not None, "DEPARTMENTS table metadata not found"
    
    impact_res = client.get(f"/oracle/impact-analysis?object_id={dept['id']}", headers=admin_headers)
    assert impact_res.status_code == 200
    impacts = impact_res.json()
    
    # 3 downstream dependents
    assert len(impacts) == 3
    
    emp_dep = next(i for i in impacts if i["object_name"] == "EMPLOYEES")
    assert emp_dep["dep_type"] == "FOREIGN_KEY"
    assert emp_dep["status"] == "VALID_REFERENCE"
    assert emp_dep["status_label"] == "Valid reference"
    assert emp_dep["risk_level"] in ["LOW", "MEDIUM"]
    assert emp_dep["is_broken"] is False
    
    view_dep = next(i for i in impacts if i["object_name"] == "EMP_DETAILS")
    assert view_dep["dep_type"] == "VIEW_REFERENCE"
    assert view_dep["status"] == "VALID_REFERENCE"
    assert view_dep["is_broken"] is False
    
    trig_dep = next(i for i in impacts if i["object_name"] == "LOG_EMPLOYEE_CHANGES")
    assert trig_dep["dep_type"] == "TRIGGER_REFERENCE"
    assert trig_dep["status"] == "VALID_REFERENCE"
    assert trig_dep["is_broken"] is False
