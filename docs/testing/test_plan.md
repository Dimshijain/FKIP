# FKIP Comprehensive Automated Test Plan

## 1. Overview & Strategy

This test plan defines the automated testing strategy, execution architecture, test fixtures, and validation requirements for the FinXSystems Knowledge Intelligence Platform (FKIP).

---

## 2. Test Architecture

The FKIP test architecture is built using `pytest` and `httpx` with layered test suites:

```
tests/
├── api/                  # Direct FastAPI router & endpoint functional tests
├── integration/          # Cross-service pipeline & workflow integration tests
├── security/             # Role-based access control & SQL injection guardrail tests
├── performance/          # Large dataset ingestion throughput & Redis cache benchmarks
├── e2e/                  # Frontend single-page application route availability tests
├── fixtures/             # Centralized test fixtures, DDL schemas, and mock data
├── conftest.py           # Reusable pytest fixtures & session-level HTTP clients
└── run_all_tests.py      # Consolidated test runner with timing metrics
```

---

## 3. Test Suites & Scope

### 3.1 API Test Suite (`tests/api/`)
Covers all 13 core backend API endpoints:
- `test_auth_api.py`: Login, token generation, user registration, role enforcement (`ADMIN`, `CREATOR`, `CONSUMER`).
- `test_dashboard_api.py`: Executive KPI metrics, telemetry caching, and manual cache invalidation (`refresh=true`).
- `test_copilot_api.py`: Model discovery (Qwen, Mistral, Gemma, DeepSeek, Llama), synchronous chat, SSE token streaming, and session history.
- `test_search_api.py`: Hybrid semantic search, limit filtering, empty query handling, conversational RAG chat, and feedback rating.
- `test_sql_writer_api.py`: Schema extraction, Oracle/Postgres SQL generation, formatting, explain plan, safe execution, query history, and doc synthesis.
- `test_oracle_api.py`: Schema catalog, dependencies, change impact simulation with valid reference evaluation.
- `test_documents_api.py`: Document upload (`202 Accepted`), format validation, chunk listing, and consumer upload restrictions.
- `test_dna_api.py`: Core banking apps catalog, capability clusters, feature similarity search.
- `test_innovation_api.py`: Opportunity backlog CRUD and status lifecycle updates.
- `test_knowledge_graph_api.py`: Cross-entity graph nodes and edges extraction.
- `test_doc_generator_api.py`: Template generation, custom docs creation, section appending.
- `test_reports_api.py`: Executive analytics, query latency trends, search log auditing.
- `test_admin_api.py`: User management, role elevation, and infrastructure pulse monitoring.

### 3.2 Security & Guardrails Suite (`tests/security/`)
- `test_auth_rbac_security.py`: HTTP 401 unauthenticated enforcement, HTTP 403 consumer restrictions, and JWT token tampering detection.
- `test_sql_guardrail_security.py`: Strictly blocks destructive DDL/DML mutations (`DROP`, `DELETE`, `UPDATE`, `TRUNCATE`, `ALTER`, `CREATE`, `GRANT`) and comment injection bypass attempts (`--`, `/* */`).

### 3.3 Integration Pipelines Suite (`tests/integration/`)
- `test_rag_ingestion_pipeline.py`: Full document upload → background chunking → PostgreSQL storage → Weaviate indexing → hybrid search → document purge.
- `test_sql_writer_workflow.py`: Natural language → SQL generation → format → explain → safe execution → specification doc synthesis → custom doc save.
- `test_oracle_impact_simulation.py`: DDL schema catalog → Graph BFS traversal → cascading downstream dependency resolution.
- `test_redis_cache_integration.py`: Cold query vs warm query latency evaluation.
- `test_multi_model_copilot.py`: End-to-end multi-model inference across configured Ollama models.
- `test_cache_service.py`: In-memory cache fallback, key expiry TTL, and serialization resilience.

### 3.4 Performance & Large Dataset Suite (`tests/performance/`)
- `test_large_dataset_performance.py`: Ingestion throughput of 50-section technical specifications (>25KB) within <1500ms; SQL execution latency <300ms.
- `test_search_cache_benchmarks.py`: Repeated search query speedup ratio and cached latency <150ms.

### 3.5 E2E UI Navigation Suite (`tests/e2e/`)
- `test_ui_workflows.py`: Frontend SPA dev server accessibility and client-side routing across all 14 views.

---

## 4. Execution Commands

```bash
# Execute Full Master Test Suite
python tests/run_all_tests.py

# Execute Individual Pytest Suites
python -m pytest tests/api/ -v
python -m pytest tests/security/ -v
python -m pytest tests/integration/ -v
python -m pytest tests/performance/ -v
python -m pytest tests/e2e/ -v

# Verify Production Frontend Build
cd frontend && npm run build
```
