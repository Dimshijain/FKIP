import sys
import httpx

BASE_URL = "http://localhost:8000/api"

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def run_oracle_impact_tests():
    print("=" * 70)
    print("[START] TESTING ORACLE INTELLIGENCE CHANGE IMPACT SIMULATION")
    print("=" * 70)

    # 1. Login
    login_res = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@finxsystems.com", "password": "password123"},
        timeout=10.0
    )
    assert login_res.status_code == 200, "Authentication failed"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[AUTH] Successfully authenticated as admin.")

    # 2. Get Oracle Schema Objects
    objs_res = httpx.get(f"{BASE_URL}/oracle/objects", headers=headers, timeout=10.0)
    assert objs_res.status_code == 200, "Failed to get Oracle objects"
    objects = objs_res.json()
    print(f"[OBJECTS] Retrieved {len(objects)} Oracle Schema Objects:")
    for o in objects:
        print(f"   * {o['object_name']} ({o['object_type']}) - Owner: {o['owner']}")
    assert len(objects) >= 4, "Expected at least 4 schema objects"

    obj_map = {o["object_name"]: o for o in objects}
    dept_obj = obj_map.get("DEPARTMENTS")
    emp_obj = obj_map.get("EMPLOYEES")
    view_obj = obj_map.get("EMP_DETAILS")
    trig_obj = obj_map.get("LOG_EMPLOYEE_CHANGES")

    assert dept_obj is not None, "DEPARTMENTS table missing"
    assert emp_obj is not None, "EMPLOYEES table missing"

    # 3. Test Dependencies Endpoint
    deps_res = httpx.get(f"{BASE_URL}/oracle/dependencies", headers=headers, timeout=10.0)
    assert deps_res.status_code == 200, "Failed to get dependencies"
    deps = deps_res.json()
    print(f"\n[DEPENDENCIES] Retrieved {len(deps)} Relationships:")
    for d in deps:
        src = next((o["object_name"] for o in objects if o["id"] == d["source_object_id"]), str(d["source_object_id"]))
        tgt = next((o["object_name"] for o in objects if o["id"] == d["target_object_id"]), str(d["target_object_id"]))
        print(f"   * {src} -> {tgt} ({d['dep_type']})")

    # 4. Test Impact Analysis for DEPARTMENTS
    print(f"\n[IMPACT TEST 1] Tracing downstream impact for DEPARTMENTS ({dept_obj['id']})...")
    impact_res = httpx.get(f"{BASE_URL}/oracle/impact-analysis?object_id={dept_obj['id']}", headers=headers, timeout=10.0)
    assert impact_res.status_code == 200, "Impact analysis request failed"
    impacts = impact_res.json()
    print(f"[IMPACT 1] Downstream affected objects count: {len(impacts)}")
    for item in impacts:
        print(f"   * [Depth {item['depth']}] {item['object_name']} ({item['object_type']}) | Cause: {item['dep_type']} | Status: '{item.get('status_label')}' | Risk: {item.get('risk_level')}")
        # Verify that genuine valid references are NOT marked as broken
        assert item.get("status") == "VALID_REFERENCE", f"Expected VALID_REFERENCE for {item['object_name']}, got {item.get('status')}"
        assert item.get("status_label") == "Valid reference", f"Expected 'Valid reference' label, got {item.get('status_label')}"
        assert item.get("is_broken") is False, f"is_broken should be False for {item['object_name']}"

    assert len(impacts) == 3, f"Expected 3 downstream objects for DEPARTMENTS, got {len(impacts)}"

    # 5. Test Impact Analysis for EMP_DETAILS (Leaf Node)
    if view_obj:
        print(f"\n[IMPACT TEST 2] Tracing downstream impact for EMP_DETAILS (Leaf View)...")
        view_impact_res = httpx.get(f"{BASE_URL}/oracle/impact-analysis?object_id={view_obj['id']}", headers=headers, timeout=10.0)
        assert view_impact_res.status_code == 200
        view_impacts = view_impact_res.json()
        print(f"[IMPACT 2] Downstream affected objects count: {len(view_impacts)}")
        assert len(view_impacts) == 0, f"EMP_DETAILS should have 0 downstream objects, got {len(view_impacts)}"

    # 6. Test Impact Analysis for LOG_EMPLOYEE_CHANGES (Leaf Trigger)
    if trig_obj:
        print(f"\n[IMPACT TEST 3] Tracing downstream impact for LOG_EMPLOYEE_CHANGES (Leaf Trigger)...")
        trig_impact_res = httpx.get(f"{BASE_URL}/oracle/impact-analysis?object_id={trig_obj['id']}", headers=headers, timeout=10.0)
        assert trig_impact_res.status_code == 200
        trig_impacts = trig_impact_res.json()
        print(f"[IMPACT 3] Downstream affected objects count: {len(trig_impacts)}")
        assert len(trig_impacts) == 0, f"LOG_EMPLOYEE_CHANGES should have 0 downstream objects, got {len(trig_impacts)}"

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL ORACLE INTELLIGENCE IMPACT ANALYSIS TESTS PASSED!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_oracle_impact_tests()
    sys.exit(0 if success else 1)
