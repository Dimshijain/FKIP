# FKIP (FinXSystems Knowledge Intelligence Platform) — Comprehensive Test Case Inventory

This document details the complete test case inventory covering all 23 major functional, API, security, performance, and UI modules of the FKIP enterprise platform.

---

## Summary Matrix by Module

| Module Code | Module Name | Total Cases | P0 | P1 | P2 | Automation Candidate |
|---|---|---|---|---|---|---|
| **AUTH** | Authentication & User Management | 10 | 6 | 3 | 1 | Yes (10/10) |
| **DASH** | Executive Dashboard & Telemetry | 6 | 2 | 3 | 1 | Yes (6/6) |
| **COPILOT**| Multi-Model AI Copilot & Streaming | 8 | 5 | 3 | 0 | Yes (8/8) |
| **SEARCH** | Knowledge Search & RAG Chat | 8 | 4 | 3 | 1 | Yes (8/8) |
| **SQL** | AI SQL Writer & Execution Workflow | 12 | 7 | 4 | 1 | Yes (12/12) |
| **ORACLE** | Oracle Intelligence & Impact Analysis | 8 | 4 | 3 | 1 | Yes (8/8) |
| **DOCS** | Document Ingestion & Chunking | 8 | 5 | 2 | 1 | Yes (8/8) |
| **DNA** | Core Banking DNA Catalog & Clustering | 5 | 2 | 2 | 1 | Yes (5/5) |
| **INNOV** | Innovation Opportunities Pipeline | 6 | 2 | 3 | 1 | Yes (6/6) |
| **GRAPH** | Knowledge Graph | 5 | 1 | 3 | 1 | Yes (5/5) |
| **GEN** | Technical Document Generator | 8 | 4 | 3 | 1 | Yes (8/8) |
| **REPORTS**| Analytics & Latency Metrics | 5 | 1 | 3 | 1 | Yes (5/5) |
| **ADMIN** | Admin Console & Health Monitoring | 6 | 3 | 2 | 1 | Yes (6/6) |
| **CACHE** | Redis In-Memory Caching System | 5 | 2 | 2 | 1 | Yes (5/5) |
| **SEC** | Security, RBAC & SQL Guardrails | 8 | 6 | 2 | 0 | Yes (8/8) |
| **PERF** | Large Dataset & Performance Benchmarks | 6 | 2 | 3 | 1 | Yes (6/6) |
| **UI** | Frontend E2E & Theme Workflows | 7 | 2 | 4 | 1 | Yes (7/7) |
| **TOTAL** | **Comprehensive FKIP Coverage** | **119** | **58** | **49** | **12** | **Yes (119/119)** |

---

## 1. Authentication & User Management (AUTH)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Test Data | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|---|
| **TC-AUTH-001** | User Login | Valid admin credentials authentication | Functional / API | P0 | Database seeded with demo admin | 1. POST `/api/auth/login` with email and password.<br>2. Inspect response. | `admin@finxsystems.com` / `password123` | Returns HTTP 200, JWT `access_token`, `token_type: bearer`, and user profile. | Yes |
| **TC-AUTH-002** | User Login | Invalid password rejection | Negative / Security | P0 | Admin account exists | 1. POST `/api/auth/login` with incorrect password.<br>2. Check status. | `admin@finxsystems.com` / `wrongpassword` | Returns HTTP 401 Unauthorized with "Invalid email or password" error. | Yes |
| **TC-AUTH-003** | User Login | Non-existent user rejection | Negative / API | P0 | None | 1. POST `/api/auth/login` with unregistered email. | `ghost@unknown.org` / `pass123` | Returns HTTP 401 Unauthorized. | Yes |
| **TC-AUTH-004** | User Registration | New user signup with default role | Functional / API | P1 | Email not registered | 1. POST `/api/auth/register` with valid details.<br>2. Check database. | `newuser@finx.com` / `SecurePass123!` / `New User` | Returns HTTP 201 Created with user ID and default role (CONSUMER). | Yes |
| **TC-AUTH-005** | User Registration | Duplicate email registration rejection | Negative / API | P1 | User already exists | 1. POST `/api/auth/register` with existing email. | `admin@finxsystems.com` | Returns HTTP 400 Bad Request with "Email already registered". | Yes |
| **TC-AUTH-006** | Profile Retrieval | Get authenticated user profile (`/api/auth/me`) | Functional / API | P0 | Valid JWT token | 1. GET `/api/auth/me` with `Bearer <token>`. | Valid Token | Returns HTTP 200 with id, email, role, and full_name. | Yes |
| **TC-AUTH-007** | JWT Validation | Request with missing Authorization header | Security | P0 | None | 1. GET `/api/auth/me` without Authorization header. | None | Returns HTTP 401 Unauthorized. | Yes |
| **TC-AUTH-008** | JWT Validation | Request with malformed/tampered token | Security | P0 | None | 1. GET `/api/auth/me` with `Bearer invalid_token_xyz`. | `Bearer invalid_token_xyz` | Returns HTTP 401 Unauthorized. | Yes |
| **TC-AUTH-009** | Role Hierarchy | Creator account permissions validation | Functional / RBAC | P1 | Creator user exists | 1. Login as Creator.<br>2. Check permissions in endpoints. | `creator@finxsystems.com` | Role is recognized as CREATOR; can generate docs & upload. | Yes |
| **TC-AUTH-010** | Role Hierarchy | Consumer account upload restriction | Security / RBAC | P1 | Consumer user exists | 1. Login as Consumer.<br>2. Attempt document upload or doc purge. | `consumer@finxsystems.com` | Returns HTTP 403 Forbidden on restricted endpoints. | Yes |

---

## 2. Executive Dashboard & Telemetry (DASH)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-DASH-001** | Dashboard Load | Fetch executive telemetry metrics (`GET /api/reports/executive`) | Functional / API | P0 | Auth Token | 1. GET `/api/reports/executive`.<br>2. Inspect payload fields. | Returns HTTP 200 with `ai_usage`, `knowledge_growth`, `user_activity`, `innovation`, `system_health`. | Yes |
| **TC-DASH-002** | Refresh Telemetry | Manual cache-busting refresh (`GET /api/reports/executive?refresh=true`) | Functional / API | P1 | Auth Token | 1. Call endpoint with `refresh=true`.<br>2. Verify fresh calculation. | Returns HTTP 200 with updated metrics bypassing Redis cache. | Yes |
| **TC-DASH-003** | System Health Pulse | Telemetry reporting of PostgreSQL, Weaviate, Ollama | Integration | P1 | Services running | 1. Inspect `system_health` in executive report. | All services return status ('healthy' / 'offline' / 'degraded') with CPU/RAM metrics. | Yes |
| **TC-DASH-004** | Knowledge Growth KPI | Total documents and chunk count accuracy | Functional / API | P1 | Documents in DB | 1. Query `/api/reports/executive`.<br>2. Verify `documents_count` and `chunks_count`. | Counts match actual database document records. | Yes |
| **TC-DASH-005** | UI Refresh State | "Refresh Telemetry" button loading spinner & timestamp | UI / E2E | P1 | Dashboard UI | 1. Click "Refresh Telemetry".<br>2. Verify button disables, text shows "Refreshing...", timestamp updates. | Button shows spinner, disables, toast appears, and "Last refreshed" updates. | Yes |
| **TC-DASH-006** | UI Dark/Light Mode | Dashboard KPI cards styling in Dark & Light theme | UI / Visual | P2 | Dashboard UI | 1. Toggle theme switch in header.<br>2. Verify text and background contrast. | Seamless theme transition without broken styling or illegible text. | Yes |

---

## 3. Multi-Model AI Copilot & Streaming (COPILOT)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-COPILOT-001** | Model Discovery | Fetch all configured AI models (`GET /api/copilot/models`) | Functional / API | P0 | Auth Token | 1. GET `/api/copilot/models`.<br>2. Verify list. | Returns 5 models: Qwen 2.5, Llama 3.1, Mistral, Gemma 2B, DeepSeek R1. | Yes |
| **TC-COPILOT-002** | Synchronous Chat | Send technical audit query via standard chat API | Functional / API | P0 | Auth Token | 1. POST `/api/copilot/chat` with prompt and model. | Returns HTTP 200 with AI response, model metadata, latency, and session ID. | Yes |
| **TC-COPILOT-003** | SSE Streaming | Stream AI response tokens over Server-Sent Events | Functional / API | P0 | Auth Token | 1. POST `/api/copilot/chat/stream`.<br>2. Consume SSE chunks (`data: {"token": "..."}`). | Chunks stream sequentially with end event `data: [DONE]`. | Yes |
| **TC-COPILOT-004** | Multi-Model Execution | Validate inference across all 5 models | Integration | P0 | Ollama running | 1. Send query to each of the 5 models.<br>2. Verify live responses. | All 5 models generate valid responses without 500 errors. | Yes |
| **TC-COPILOT-005** | Empty Prompt Validation | Submit empty prompt to Copilot | Negative | P1 | Auth Token | 1. POST `/api/copilot/chat` with `prompt: ""`. | Returns HTTP 400 Bad Request / validation error. | Yes |
| **TC-COPILOT-006** | Session History | Retrieve conversation session history | Functional / API | P1 | Active Session | 1. GET `/api/copilot/sessions`.<br>2. GET `/api/copilot/sessions/{id}`. | Returns session message list in chronological order. | Yes |
| **TC-COPILOT-007** | RAG Context Injection | Query referencing uploaded financial architecture spec | Integration | P1 | Ingested docs | 1. Query "What is FKIP architecture?".<br>2. Check citation in response. | Response incorporates context from ingested documents. | Yes |
| **TC-COPILOT-008** | Error Fallback | Graceful handling when Ollama model is offline | Edge / Resilience | P1 | Simulated offline | 1. Send request with fallback config. | Returns structured error/fallback without unhandled 500 crash. | Yes |

---

## 4. Knowledge Search & RAG Assistant (SEARCH)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-SEARCH-001** | Hybrid Search | Execute semantic keyword search across document chunks | Functional / API | P0 | Ingested docs | 1. POST `/api/search` with `query: "core ledger architecture"`. | Returns HTTP 200 with ranked chunks, relevance scores, and metadata. | Yes |
| **TC-SEARCH-002** | Filter by File Type | Search filtering by document format (`PDF`, `TXT`, `DOCX`) | Functional / API | P1 | Ingested docs | 1. POST `/api/search` with `file_type: "txt"`. | All returned chunks belong to `.txt` files. | Yes |
| **TC-SEARCH-003** | Relevance Score Threshold | Chunks below score threshold are filtered out | Functional / API | P1 | Ingested docs | 1. POST `/api/search` with `score_threshold: 0.75`. | All returned chunks have `score >= 0.75`. | Yes |
| **TC-SEARCH-004** | Empty Search Query | Submit empty search query | Negative | P1 | Auth Token | 1. POST `/api/search` with `query: "   "`. | Returns HTTP 400 or empty results gracefully. | Yes |
| **TC-SEARCH-005** | Conversational RAG | Interactive RAG Chat Assistant (`POST /api/search/chat`) | Functional / API | P0 | Auth Token | 1. POST `/api/search/chat` with prompt and history. | Returns synthesized AI answer with citations to source documents. | Yes |
| **TC-SEARCH-006** | Search Pagination | Multi-page search result pagination | Functional / API | P1 | Many chunks | 1. Call `/api/search` with `skip=0&limit=5` and `skip=5&limit=5`. | Page 1 and Page 2 contain non-overlapping results. | Yes |
| **TC-SEARCH-007** | Search Audit Logging | Query metrics recorded in `search_audit_logs` | Integration | P1 | Search executed | 1. Execute search.<br>2. Check `GET /api/search/audit-logs`. | Audit log contains query text, latency ms, result count, and timestamp. | Yes |
| **TC-SEARCH-008** | Redis Cache Speedup | Cold vs Warm query response latency | Performance | P0 | Redis active | 1. Run cold query.<br>2. Re-run same query within TTL. | Warm query is served from Redis in <50ms (5x-10x speedup). | Yes |

---

## 5. AI SQL Writer & Safe Execution (SQL)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-SQL-001** | Schema Catalog | Extract database schema tables tree (`GET /api/sql/schema`) | Functional / API | P0 | Tables seeded | 1. GET `/api/sql/schema`. | Returns table names, column definitions, data types, and primary keys. | Yes |
| **TC-SQL-002** | Natural Language to SQL | Synthesize Oracle SQL query from plain English | Functional / API | P0 | Auth Token | 1. POST `/api/sql/generate` with `dialect: "ORACLE"`. | Returns valid Oracle SQL with `FETCH FIRST n ROWS ONLY` and `is_safe=True`. | Yes |
| **TC-SQL-003** | PostgreSQL Dialect | Synthesize PostgreSQL query with LIMIT/OFFSET | Functional / API | P0 | Auth Token | 1. POST `/api/sql/generate` with `dialect: "POSTGRESQL"`. | Returns valid PostgreSQL query with `LIMIT n` and `is_safe=True`. | Yes |
| **TC-SQL-004** | SQL Formatting | Standardize SQL keywords and indentation | Functional / API | P1 | Auth Token | 1. POST `/api/sql/format` with unformatted SQL. | Returns clean, formatted SQL query string. | Yes |
| **TC-SQL-005** | Explain Plan Analysis | Synthesize query execution plan summary | Functional / API | P1 | Auth Token | 1. POST `/api/sql/explain` with SQL query. | Returns logic breakdown, join analysis, and safety verification. | Yes |
| **TC-SQL-006** | Safe SELECT Execution | Execute read-only SELECT query against live database | Functional / API | P0 | Auth Token | 1. POST `/api/sql/execute` with safe SELECT statement. | Returns HTTP 200, dynamic columns, row data, row count, and latency ms. | Yes |
| **TC-SQL-007** | User Controlled Trigger | Verify SQL is never auto-executed upon generation | Functional / UI | P0 | UI / Frontend | 1. Generate SQL in UI.<br>2. Observe results panel. | Results table remains hidden until user explicitly clicks "Run Query". | Yes |
| **TC-SQL-008** | Guardrail DDL Blocking | Block destructive DROP, DELETE, UPDATE, TRUNCATE | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with `DROP TABLE departments;`. | Blocked with HTTP 400 Bad Request with safety violation message. | Yes |
| **TC-SQL-009** | Injection Prevention | Block comment-based bypass injection attempts | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with `SELECT * FROM users; -- DROP TABLE x`. | Returns HTTP 400 Bad Request; zero mutations executed. | Yes |
| **TC-SQL-010** | Query History Tracking | Execution status & latency recorded in history | Functional / API | P1 | Query executed | 1. Execute query.<br>2. GET `/api/sql/history`. | History record contains `execution_status='SUCCESS'`, `row_count`, and ms. | Yes |
| **TC-SQL-011** | Documentation Synthesis | Synthesize structured Technical Specification doc | Functional / API | P1 | Query executed | 1. POST `/api/sql/generate-docs` with query telemetry. | Returns complete Markdown spec with Purpose, SQL, Metrics, and Sample Data. | Yes |
| **TC-SQL-012** | CSV Export | Download executed query results as CSV | UI / Functional | P1 | Query executed | 1. Click "Export CSV" in UI. | Downloads formatted CSV file with dynamic columns. | Yes |

---

## 6. Oracle Database Intelligence (ORACLE)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-ORACLE-001** | Schema Catalog | Retrieve Oracle metadata objects catalog (`GET /api/oracle/objects`) | Functional / API | P0 | Objects seeded | 1. GET `/api/oracle/objects`. | Returns list of tables, views, triggers, and procedures with DDL scripts. | Yes |
| **TC-ORACLE-002** | DDL File Upload | Upload and index Oracle DDL script (`POST /api/oracle/upload`) | Functional / API | P0 | Admin role | 1. Upload `.sql` file with DDL statements. | Returns 201 Created with objects_created and relationships_created counts. | Yes |
| **TC-ORACLE-003** | Relationship Detection | Detect Foreign Key, View, and Trigger dependencies | Functional / API | P0 | DDL indexed | 1. GET `/api/oracle/dependencies`. | Returns foreign keys (`EMPLOYEES`->`DEPARTMENTS`), views, and triggers. | Yes |
| **TC-ORACLE-004** | Impact Analysis | Change Impact Simulation for `DEPARTMENTS` | Functional / API | P0 | Metadata loaded | 1. GET `/api/oracle/impact-analysis?object_id=<DEPARTMENTS_ID>`. | Returns 3 downstream objects: `EMPLOYEES`, `EMP_DETAILS`, `LOG_EMPLOYEE_CHANGES`. | Yes |
| **TC-ORACLE-005** | Reference Validity | Valid schema references flagged as `✓ Valid reference` | Functional / API | P0 | Relationships | 1. Inspect impact results for `DEPARTMENTS`. | All valid schema references have `status='VALID_REFERENCE'` and `is_broken=False`. | Yes |
| **TC-ORACLE-006** | Broken Reference Detection | Missing target table flagged as `Broken reference risk` | Edge / Security | P1 | Unresolved FK | 1. Parse DDL with reference to non-existent table. | Flagged as `status='BROKEN_REFERENCE'`, `status_label='Broken reference risk'`. | Yes |
| **TC-ORACLE-007** | Leaf Node Impact | Impact analysis on leaf node with 0 downstream objects | Functional / API | P1 | Leaf view/trigger | 1. Trace impact on `EMP_DETAILS`. | Returns 0 downstream objects; shows "No cascading impact" banner. | Yes |
| **TC-ORACLE-008** | Visual ER Diagram | Render interactive Mermaid ER model | UI / Functional | P1 | Schema loaded | 1. Switch to "Visual ER Diagram" tab in UI. | Renders interactive ER diagram showing entities and foreign key links. | Yes |

---

## 7. Document Ingestion, Processing & Chunking (DOCS)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-DOC-001** | TXT Ingestion | Upload `.txt` file and trigger background chunking | Functional / API | P0 | Admin/Creator | 1. POST `/api/documents/upload` with `.txt` file. | Returns HTTP 201 Created with document ID; status updates to `COMPLETED`. | Yes |
| **TC-DOC-002** | PDF Ingestion | Upload `.pdf` document and extract text | Functional / API | P0 | Admin/Creator | 1. POST `/api/documents/upload` with `.pdf` file. | PDF text extracted and chunked cleanly. | Yes |
| **TC-DOC-003** | DOCX Ingestion | Upload `.docx` document and extract paragraphs | Functional / API | P1 | Admin/Creator | 1. POST `/api/documents/upload` with `.docx` file. | Word document parsed and indexed. | Yes |
| **TC-DOC-004** | Invalid File Format | Upload unsupported file extension (`.exe`, `.bin`) | Negative | P1 | Admin/Creator | 1. POST `/api/documents/upload` with `.exe` file. | Returns HTTP 400 Bad Request with unsupported extension error. | Yes |
| **TC-DOC-005** | Chunk Retrieval | Fetch generated chunks for document (`GET /api/documents/{id}/chunks`) | Functional / API | P0 | Processed doc | 1. GET chunks endpoint with document ID. | Returns list of semantic chunks with content, token length, and index. | Yes |
| **TC-DOC-006** | Weaviate Vector Indexing | Verify vectors are indexed in Weaviate vector store | Integration | P0 | Weaviate active | 1. Ingest document.<br>2. Perform hybrid vector search. | Ingested chunks are retrievable through vector similarity. | Yes |
| **TC-DOC-007** | Document Deletion | Delete document and cascade delete chunks | Functional / API | P1 | Admin role | 1. DELETE `/api/documents/{id}`. | Document and associated PostgreSQL & Weaviate chunks are purged. | Yes |
| **TC-DOC-008** | Viewer Upload Block | Viewer accounts blocked from uploading documents | Security / RBAC | P1 | Consumer user | 1. Attempt document upload with Consumer token. | Returns HTTP 403 Forbidden. | Yes |

---

## 8. Core Banking / DNA Application Catalog (DNA)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-DNA-001** | Application Listing | Fetch DNA core banking applications (`GET /api/dna/applications`) | Functional / API | P0 | Seeded apps | 1. GET `/api/dna/applications`. | Returns applications with app_code, name, owner, version, and features. | Yes |
| **TC-DNA-002** | Application Details | Fetch single application details with full feature list | Functional / API | P1 | Application ID | 1. GET `/api/dna/applications/{id}`. | Returns detailed application profile with associated features. | Yes |
| **TC-DNA-003** | Semantic Clustering | Fetch capability clusters (`GET /api/dna/clusters`) | Functional / API | P1 | Vector service | 1. GET `/api/dna/clusters`. | Returns grouped feature clusters with similarity metrics. | Yes |
| **TC-DNA-004** | Feature Similarity Match | Match new feature description against catalog (`POST /api/dna/features/match`) | Functional / API | P0 | Feature query | 1. POST with `feature_description: "Real-time account balance ledger"`. | Returns top matched existing DNA features with similarity scores. | Yes |
| **TC-DNA-005** | Non-Existent App | Query invalid application UUID | Negative | P2 | None | 1. GET `/api/dna/applications/<random-uuid>`. | Returns HTTP 404 Not Found. | Yes |

---

## 9. Innovation Pipeline & Opportunities (INNOV)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-INNOV-001** | Opportunity Listing | Fetch innovation opportunities (`GET /api/innovation/opportunities`) | Functional / API | P0 | Seeded opps | 1. GET `/api/innovation/opportunities`. | Returns list of opportunities with metrics (business_value, complexity, priority). | Yes |
| **TC-INNOV-002** | Create Opportunity | Create new innovation opportunity (`POST /api/innovation/opportunities`) | Functional / API | P0 | Auth Token | 1. POST with name, description, priority, and source_type. | Returns HTTP 201 Created with generated UUID. | Yes |
| **TC-INNOV-003** | Update Opportunity | Update opportunity status (`PUT /api/innovation/opportunities/{id}`) | Functional / API | P1 | Opp ID | 1. PUT with `status: "IN_REVIEW"`. | Status updated to IN_REVIEW; updated_at timestamp updated. | Yes |
| **TC-INNOV-004** | Delete Opportunity | Purge opportunity specification (`DELETE /api/innovation/opportunities/{id}`) | Functional / API | P1 | Admin role | 1. DELETE opportunity by ID. | Returns HTTP 200; opportunity removed from database. | Yes |
| **TC-INNOV-005** | AI Gap Analysis | Analyze document gaps (`POST /api/innovation/analyze`) | Integration | P1 | Documents | 1. POST with `document_ids`. | Synthesizes architectural gaps and proposed high-value opportunities. | Yes |
| **TC-INNOV-006** | Invalid Opportunity ID | Fetch or update non-existent opportunity ID | Negative | P2 | None | 1. GET `/api/innovation/opportunities/<fake-id>`. | Returns HTTP 404 Not Found. | Yes |

---

## 10. Knowledge Graph (GRAPH)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-GRAPH-001** | Graph Data Retrieval | Fetch cross-entity graph nodes and edges (`GET /api/knowledge-graph/data`) | Functional / API | P0 | Entities seeded | 1. GET `/api/knowledge-graph/data`. | Returns nodes (documents, oracle_objects, dna_apps, opportunities) & edges. | Yes |
| **TC-GRAPH-002** | Graph Search | Filter graph nodes by query string (`POST /api/knowledge-graph/search`) | Functional / API | P1 | Auth Token | 1. POST with `query: "DEPARTMENTS"`. | Returns matching sub-graph containing DEPARTMENTS and connected edges. | Yes |
| **TC-GRAPH-003** | Edge Relationship Types | Verify valid relationship types (`contains`, `references`, `depends_on`) | Functional / API | P1 | Graph loaded | 1. Inspect edge types in graph response. | All edges have recognized domain types without orphan connections. | Yes |
| **TC-GRAPH-004** | Node Type Filtering | Filter graph view by entity type in UI | UI / Functional | P1 | Graph UI | 1. Select "Oracle Objects" filter in UI. | Graph filters canvas to display selected node category. | Yes |
| **TC-GRAPH-005** | Empty Search Handling | Search graph for non-existent entity | Negative | P2 | None | 1. POST with `query: "XYZ_NON_EXISTENT"`. | Returns empty node and edge arrays gracefully. | Yes |

---

## 11. Technical Document Generator (GEN)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-GEN-001** | Template Synthesis | Generate BRD / SRS / Tech Design spec (`POST /api/docs/generate`) | Functional / API | P0 | Auth Token | 1. POST with `doc_type: "SRS"`, `title: "Core Banking Integration"`. | Synthesizes professional multi-section specification document. | Yes |
| **TC-GEN-002** | Custom Doc Creation | Save custom synthesized document (`POST /api/docs/custom`) | Functional / API | P0 | Auth Token | 1. POST with title, doc_type, and markdown content. | Returns HTTP 201 Created with saved document ID. | Yes |
| **TC-GEN-003** | Append to Document | Safely append new section to existing document (`PUT /api/docs/{id}`) | Functional / API | P0 | Doc exists | 1. PUT with `append_content: "## Section 7..."`. | Appends section cleanly while strictly preserving all prior content. | Yes |
| **TC-GEN-004** | Document List & Search | List generated documents with type filter (`GET /api/docs`) | Functional / API | P1 | Docs saved | 1. GET `/api/docs?doc_type=TECH_DESIGN`. | Returns list of matching technical specifications. | Yes |
| **TC-GEN-005** | Document Detail | Fetch complete document content by ID (`GET /api/docs/{id}`) | Functional / API | P1 | Doc ID | 1. GET `/api/docs/{id}`. | Returns full markdown content, author, and creation timestamp. | Yes |
| **TC-GEN-006** | Delete Document | Delete document specification (`DELETE /api/docs/{id}`) | Functional / API | P1 | Admin role | 1. DELETE document by ID. | Document is deleted from database. | Yes |
| **TC-GEN-007** | Viewer Delete Block | Viewer accounts blocked from deleting documents | Security / RBAC | P1 | Consumer user | 1. DELETE document with Consumer token. | Returns HTTP 403 Forbidden. | Yes |
| **TC-GEN-008** | Template Types | Verify support for all 6 template types | Functional / API | P2 | Auth Token | 1. Test BRD, SRS, TECH_DESIGN, API_DOCS, RELEASE_NOTES, USER_MANUAL. | All 6 templates synthesize cleanly. | Yes |

---

## 12. Analytics & Reporting (REPORTS)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-REP-001** | Reports Analytics | Fetch system analytics (`GET /api/reports/analytics`) | Functional / API | P0 | Admin/Creator | 1. GET `/api/reports/analytics`. | Returns search metrics, document metrics, top queries, and active users. | Yes |
| **TC-REP-002** | Latency Trends | Query latency data points for charting | Functional / API | P1 | Search logs | 1. Inspect `search.latency_trend` array. | Returns chronological latency data points with timestamps and ms. | Yes |
| **TC-REP-003** | Document Distribution | Document size and file type breakdown | Functional / API | P1 | Docs in DB | 1. Inspect `documents.by_type` distribution. | Accurately calculates file count per extension (pdf, txt, docx). | Yes |
| **TC-REP-004** | Consumer Access Block | Viewer accounts blocked from executive analytics | Security / RBAC | P1 | Consumer user | 1. Call `/api/reports/analytics` with Consumer token. | Returns HTTP 403 Forbidden. | Yes |
| **TC-REP-005** | User Satisfaction Rating| Average user feedback rating computation | Functional / API | P2 | Feedback in DB | 1. Check `average_rating` in analytics payload. | Correctly averages user feedback ratings. | Yes |

---

## 13. Admin Console & Infrastructure Monitoring (ADMIN)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-ADM-001** | User Management | List all registered users (`GET /api/admin/users`) | Functional / API | P0 | Admin role | 1. GET `/api/admin/users`. | Returns list of all platform users with roles and creation dates. | Yes |
| **TC-ADM-002** | Role Modification | Update user role (`PUT /api/admin/users/{id}/role`) | Functional / API | P0 | Admin role | 1. PUT with `role: "CREATOR"`. | User role updated successfully. | Yes |
| **TC-ADM-003** | Infrastructure Pulse | Real-time health check (`GET /api/admin/monitoring`) | Functional / API | P0 | Admin role | 1. GET `/api/admin/monitoring`. | Returns status for PostgreSQL, Redis, Weaviate, Ollama + CPU/RAM. | Yes |
| **TC-ADM-004** | Non-Admin Access Block | Non-admin users blocked from admin endpoints | Security / RBAC | P0 | Creator/Consumer | 1. Call `/api/admin/users` with non-admin token. | Returns HTTP 403 Forbidden. | Yes |
| **TC-ADM-005** | User Search | Search users by name or email query | Functional / API | P1 | Admin role | 1. GET `/api/admin/users?search=admin`. | Returns filtered user list matching query. | Yes |
| **TC-ADM-006** | Invalid User ID | Attempt role update on non-existent user ID | Negative | P2 | Admin role | 1. PUT `/api/admin/users/<fake-uuid>/role`. | Returns HTTP 404 Not Found. | Yes |

---

## 14. Redis Caching & Invalidation (CACHE)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-CACHE-001** | Search Cache Hit | Verify repeated search query hits Redis cache | Performance | P0 | Redis active | 1. Query search API twice with identical parameters. | Second query completes in <30ms with cache hit. | Yes |
| **TC-CACHE-002** | Dashboard Invalidation | Invalidate dashboard cache on `refresh=true` | Functional / API | P1 | Cached reports | 1. Request `/reports/executive?refresh=true`. | Bypasses cached entry and calculates fresh metrics. | Yes |
| **TC-CACHE-003** | Cache Expiry (TTL) | Verify cache keys expire according to configured TTL | Integration | P1 | Redis active | 1. Set key with short TTL.<br>2. Wait for expiration. | Key is evicted after TTL duration. | Yes |
| **TC-CACHE-004** | Redis Fallback | Application functions normally if Redis is temporarily offline | Resilience | P1 | Simulated down | 1. Perform search when cache is unreachable. | Request falls back to direct database query without crashing. | Yes |
| **TC-CACHE-005** | Cache Key Isolation | Cache keys isolated per user and endpoint | Security | P2 | Multi-user | 1. Inspect cache keys for different users. | Keys use namespacing (e.g. `reports:executive:{user_id}`). | Yes |

---

## 15. Security, RBAC & SQL Guardrails (SEC)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-SEC-001** | DML Mutation Block | Reject `DELETE` SQL statements in SQL Writer | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with `DELETE FROM users;`. | Blocked with HTTP 400 Bad Request; zero records deleted. | Yes |
| **TC-SEC-002** | DDL Mutation Block | Reject `DROP TABLE` SQL statements | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with `DROP TABLE departments;`. | Blocked with HTTP 400 Bad Request; table preserved. | Yes |
| **TC-SEC-003** | DDL Truncate Block | Reject `TRUNCATE` SQL statements | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with `TRUNCATE TABLE employees;`. | Blocked with HTTP 400 Bad Request. | Yes |
| **TC-SEC-004** | Update Mutation Block | Reject `UPDATE` SQL statements | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with `UPDATE users SET role='ADMIN';`. | Blocked with HTTP 400 Bad Request. | Yes |
| **TC-SEC-005** | Comment Injection | Reject comment-based bypasses (`-- DROP TABLE`) | Security | P0 | Auth Token | 1. POST `/api/sql/execute` with injected SQL comments. | Blocked with HTTP 400 Bad Request. | Yes |
| **TC-SEC-006** | Expired JWT Token | Reject expired authorization tokens | Security | P0 | Expired token | 1. Make API request with expired JWT token. | Returns HTTP 401 Unauthorized with token expired error. | Yes |
| **TC-SEC-007** | Tampered JWT Signature| Reject tokens with invalid cryptographic signatures | Security | P0 | Fake signature | 1. Modify JWT payload/signature and make request. | Returns HTTP 401 Unauthorized. | Yes |
| **TC-SEC-008** | RBAC Endpoint Matrix | Comprehensive role authorization matrix verification | Security / RBAC | P1 | All 3 roles | 1. Test Admin, Creator, Consumer across all routes. | Permissions strictly enforced according to matrix. | Yes |

---

## 16. Performance & Large Datasets (PERF)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-PERF-001** | Large Document Ingestion| Ingest 50-section large document (>25KB) | Performance | P0 | Admin role | 1. Upload large multi-section document. | Ingestion completes in <250ms; chunking completes cleanly. | Yes |
| **TC-PERF-002** | Chunk Scaling | Vector search across large corpus of chunks | Performance | P1 | 50+ chunks | 1. Perform hybrid search across entire corpus. | Search returns ranked results in <350ms. | Yes |
| **TC-PERF-003** | Cache Speedup Ratio | Measure speedup ratio between cold and cached search | Performance | P1 | Redis active | 1. Measure cold latency.<br>2. Measure warm latency. | Speedup ratio >= 5x. | Yes |
| **TC-PERF-004** | SQL Execution Latency | Safe SELECT query execution latency | Performance | P1 | Seeded data | 1. Execute multi-table join SELECT query. | Query executes and serializes rows in <100ms. | Yes |
| **TC-PERF-005** | Large Result Limiting | SQL results capped at maximum 100 rows | Safety / Perf | P1 | Query > 100 rows| 1. Execute query returning 1000+ rows. | Returns exactly top 100 rows to protect client memory. | Yes |
| **TC-PERF-006** | Pagination Boundaries | Document and search pagination across large sets | Performance | P2 | Many docs | 1. Page through 5 pages of documents. | Fast pagination with non-overlapping page boundaries. | Yes |

---

## 17. Frontend UI & Theme Workflows (UI)

| Test Case ID | Feature | Test Scenario | Type | Priority | Preconditions | Test Steps | Expected Result | Automation |
|---|---|---|---|---|---|---|---|---|
| **TC-UI-001** | Login to Dashboard | End-to-end login flow and redirection | UI / E2E | P0 | Browser open | 1. Enter credentials.<br>2. Click Sign In. | Redirects to Dashboard; session persisted in localStorage. | Yes |
| **TC-UI-002** | Navigation Sidebar | Navigate across all 10 sidebar modules | UI / E2E | P1 | Logged in | 1. Click each module in the sidebar. | Each page loads cleanly with correct headers and icons. | Yes |
| **TC-UI-003** | Dark/Light Theme | Toggle theme switch in application header | UI / Visual | P1 | Logged in | 1. Click theme toggle button. | Switches between Dark and Light CSS variables seamlessly. | Yes |
| **TC-UI-004** | SQL Writer Workflow | Generate, Execute, and View Results in UI | UI / E2E | P0 | SQL Writer page | 1. Enter prompt.<br>2. Click Generate.<br>3. Click Run Query. | Results table renders dynamic columns and row metrics. | Yes |
| **TC-UI-005** | Oracle Impact UI | Trace Impact on DEPARTMENTS in Oracle Intelligence | UI / E2E | P0 | Oracle page | 1. Click Trace Impact on DEPARTMENTS. | Displays 3 downstream items with `✓ Valid reference`. | Yes |
| **TC-UI-006** | Toast Notifications | Verify toast alerts on success/error actions | UI / Feedback | P1 | Any page | 1. Trigger action (copy, refresh, update). | Toast appears at bottom/top right and auto-dismisses. | Yes |
| **TC-UI-007** | Modal Inspector | Inspect DDL modal drawer in Oracle Intelligence | UI / Modals | P2 | Oracle page | 1. Click "Inspect" on table.<br>2. Close modal. | Modal opens with DDL code and closes on click/backdrop. | Yes |
