#!/usr/bin/env python
"""
Master Consolidated Test Suite Runner for FinXSystems Knowledge Intelligence Platform (FKIP).
Executes all API, Integration, Security, Performance, and E2E test suites.
"""

import os
import sys
import time
import pytest

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure repo root is on Python path
REPO_ROOT = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

def run_suite():
    print("=" * 80)
    print("FINXSYSTEMS KNOWLEDGE INTELLIGENCE PLATFORM (FKIP)")
    print("MASTER AUTOMATED TEST SUITE EXECUTION")
    print("=" * 80)
    
    test_dirs = [
        ("API Test Suite", "tests/api"),
        ("Security & Guardrails Suite", "tests/security"),
        ("Integration Pipelines Suite", "tests/integration"),
        ("Performance & Large Dataset Suite", "tests/performance"),
        ("E2E UI Navigation Suite", "tests/e2e"),
    ]
    
    results = {}
    total_start = time.perf_counter()
    
    for name, test_dir in test_dirs:
        print(f"\n[RUNNING] {name} ({test_dir})...")
        t0 = time.perf_counter()
        exit_code = pytest.main(["-v", test_dir])
        t1 = time.perf_counter()
        duration = t1 - t0
        results[name] = {"exit_code": exit_code, "duration_s": round(duration, 2)}
        print(f"[{'PASS' if exit_code == 0 else 'FAIL'}] {name} completed in {duration:.2f}s")
        
    total_duration = time.perf_counter() - total_start
    
    print("\n" + "=" * 80)
    print("FKIP TEST EXECUTION SUMMARY")
    print("=" * 80)
    all_passed = True
    for name, res in results.items():
        status = "PASSED" if res["exit_code"] == 0 else "FAILED"
        if res["exit_code"] != 0:
            all_passed = False
        print(f"  * {name:<38}: {status:<10} ({res['duration_s']}s)")
        
    print(f"\nTotal Execution Time: {total_duration:.2f}s")
    print(f"Overall Result: {'ALL SUITES PASSED' if all_passed else 'SOME SUITES FAILED'}")
    print("=" * 80)
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(run_suite())
