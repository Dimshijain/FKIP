# FKIP REST API Documentation Reference

This document maps all API routes, query parameters, authorization headers, and JSON payloads for the **FinXSystems Knowledge Intelligence Platform (FKIP)** backend server.

---

## 1. Authentication Router (`app/api/auth.py`)

All endpoints (except login and register) require:
`Authorization: Bearer <access_token>`

### POST `/api/auth/login`
* **Description**: Authenticates user credentials and issues a JWT token.
* **Access**: Public
* **Request Body**:
  ```json
  {
    "email": "admin@finxsystems.com",
    "password": "password123",
    "role": "ADMIN"
  }
  ```
* **Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
      "email": "admin@finxsystems.com",
      "role": "ADMIN"
    }
  }
  ```

### POST `/api/auth/register`
* **Description**: Registers a new user account with default `CONSUMER` role.
* **Access**: Public
* **Request Body**:
  ```json
  {
    "email": "newuser@finxsystems.com",
    "password": "SecurePassword123!"
  }
  ```
* **Response** (201 Created):
  ```json
  {
    "id": "uuid-string",
    "email": "newuser@finxsystems.com",
    "role": "CONSUMER"
  }
  ```

### GET `/api/auth/me`
* **Description**: Returns profile details for the authenticated user.
* **Access**: Authenticated (`ADMIN`, `CREATOR`, `CONSUMER`)
* **Response** (200 OK):
  ```json
  {
    "id": "uuid-string",
    "email": "admin@finxsystems.com",
    "role": "ADMIN"
  }
  ```

---

## 2. Multi-Model AI Copilot Router (`app/api/copilot.py`)

### GET `/api/copilot/models`
* **Description**: Returns all 5 configured AI inference models.
* **Access**: Authenticated
* **Response** (200 OK):
  ```json
  [
    {"id": "qwen2.5:latest", "name": "Qwen 2.5 (Default)", "description": "High-accuracy technical reasoning"},
    {"id": "llama3.1:latest", "name": "Llama 3.1", "description": "Meta enterprise language model"},
    {"id": "mistral:latest", "name": "Mistral 7B", "description": "Fast concise reasoning"},
    {"id": "gemma:2b", "name": "Gemma 2B", "description": "Lightweight low-latency model"},
    {"id": "deepseek-r1:latest", "name": "DeepSeek R1", "description": "Deep reasoning and code analysis"}
  ]
  ```

### POST `/api/copilot/chat`
* **Description**: Synchronous multi-model chat with context enrichment.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "prompt": "Explain the FKIP database architecture",
    "model": "qwen2.5:latest",
    "conversation_id": "optional-uuid"
  }
  ```
* **Response** (200 OK):
  ```json
  {
    "response": "FKIP uses a PostgreSQL relational database...",
    "model": "qwen2.5:latest",
    "conversation_id": "uuid-string",
    "suggestions": ["Show entity relationships", "Explain impact simulation"],
    "recommendations": [{"type": "document", "name": "database_design.md"}]
  }
  ```

### POST `/api/copilot/chat/stream`
* **Description**: Streams AI response tokens over Server-Sent Events (SSE).
* **Access**: Authenticated
* **Request Body**: Same as `/api/copilot/chat`
* **Stream Events**:
  ```text
  data: {"token": "FKIP "}
  data: {"token": "uses "}
  ...
  data: [DONE]
  ```

### GET `/api/copilot/sessions`
* **Description**: Lists persistent conversation sessions for the current user.
* **Access**: Authenticated

### GET `/api/copilot/sessions/{session_id}`
* **Description**: Returns chronological messages for a conversation session.
* **Access**: Authenticated

---

## 3. AI SQL Writer Router (`app/api/sql_writer.py`)

### GET `/api/sql/schema`
* **Description**: Extracts full database schema tree with tables, columns, data types, and primary keys.
* **Access**: Authenticated

### POST `/api/sql/generate`
* **Description**: Synthesizes SQL query from plain English prompt.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "prompt": "Find all employees in the Finance department with salary > 50000",
    "dialect": "ORACLE"
  }
  ```
* **Response** (200 OK):
  ```json
  {
    "sql": "SELECT e.* FROM EMPLOYEES e JOIN DEPARTMENTS d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID WHERE d.DEPARTMENT_NAME = 'Finance' AND e.SALARY > 50000 FETCH FIRST 100 ROWS ONLY;",
    "dialect": "ORACLE",
    "explanation": "Joins EMPLOYEES and DEPARTMENTS with salary filtering.",
    "is_safe": true
  }
  ```

### POST `/api/sql/format`
* **Description**: Standardizes SQL indentation and keyword capitalization.
* **Access**: Authenticated
* **Request Body**: `{"sql": "select * from employees"}`

### POST `/api/sql/explain`
* **Description**: Generates execution plan explanation and join breakdown.
* **Access**: Authenticated
* **Request Body**: `{"sql": "SELECT * FROM EMPLOYEES;"}`

### POST `/api/sql/execute`
* **Description**: Safely executes read-only `SELECT` queries with strict guardrails (rejects DDL/DML mutations and comment injections).
* **Access**: Authenticated
* **Request Body**: `{"sql": "SELECT employee_id, first_name, last_name, salary FROM employees LIMIT 10;"}`
* **Response** (200 OK):
  ```json
  {
    "columns": ["employee_id", "first_name", "last_name", "salary"],
    "rows": [[101, "John", "Doe", 75000.00]],
    "row_count": 1,
    "execution_time_ms": 14.5
  }
  ```

### GET `/api/sql/history`
* **Description**: Retrieves query execution history for the current user.
* **Access**: Authenticated

### POST `/api/sql/generate-docs`
* **Description**: Synthesizes structured Markdown technical specification from query telemetry.
* **Access**: Authenticated

---

## 4. Oracle Intelligence Router (`app/api/oracle.py`)

### GET `/api/oracle/objects`
* **Description**: Lists schema metadata objects (tables, views, triggers, procedures).
* **Access**: Authenticated

### POST `/api/oracle/upload`
* **Description**: Uploads and indexes a `.sql` DDL schema file.
* **Access**: `ADMIN`, `CREATOR`
* **Request**: `multipart/form-data` with `file`

### GET `/api/oracle/dependencies`
* **Description**: Lists foreign key, view, and trigger dependencies.
* **Access**: Authenticated

### GET `/api/oracle/impact-analysis?object_id={id}`
* **Description**: Calculates cascading downstream impact tree with reference validation (`VALID_REFERENCE` vs `BROKEN_REFERENCE`).
* **Access**: Authenticated
* **Response** (200 OK):
  ```json
  {
    "source_object": {"id": "uuid", "name": "DEPARTMENTS"},
    "downstream_objects": [
      {
        "id": "uuid",
        "name": "EMPLOYEES",
        "type": "TABLE",
        "status": "VALID_REFERENCE",
        "status_label": "✓ Valid reference"
      }
    ],
    "total_affected": 3
  }
  ```

---

## 5. Knowledge Search & RAG Router (`app/api/search.py`)

### POST `/api/search` (or `/api/search/hybrid`)
* **Description**: Executes hybrid vector + lexical keyword search.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "query": "Core ledger transaction engine",
    "limit": 5,
    "document_id": "optional-uuid"
  }
  ```

### POST `/api/search/chat`
* **Description**: Conversational RAG assistant with strict source document citations.
* **Access**: Authenticated
* **Request Body**:
  ```json
  {
    "messages": [{"role": "user", "content": "What is the retry policy?"}],
    "document_id": "optional-uuid"
  }
  ```

### POST `/api/search/feedback`
* **Description**: Records user satisfaction rating (1–5) and comments.
* **Access**: Authenticated

### GET `/api/search/audit-logs`
* **Description**: Retrieves search audit logs with latency metrics.
* **Access**: `ADMIN`, `CREATOR`

---

## 6. Documents & Technical Specification Generator Router (`app/api/docs.py`)

### POST `/api/documents/upload`
* **Description**: Ingests `.pdf`, `.txt`, `.docx` files with background chunking and vector indexing.
* **Access**: `ADMIN`, `CREATOR`

### GET `/api/documents`
* **Description**: Lists all ingested documents with status and metadata.
* **Access**: Authenticated

### GET `/api/documents/{doc_id}/chunks`
* **Description**: Retrieves semantic chunks for a document.
* **Access**: Authenticated

### DELETE `/api/documents/{doc_id}`
* **Description**: Purges document and associated vector embeddings.
* **Access**: `ADMIN`, `CREATOR`

### POST `/api/docs/generate`
* **Description**: Generates specification from template (`BRD`, `SRS`, `TECH_DESIGN`, `API_DOCS`, `RELEASE_NOTES`, `USER_MANUAL`).
* **Access**: `ADMIN`, `CREATOR`

### POST `/api/docs/custom`
* **Description**: Creates and saves a custom synthesized Markdown document.
* **Access**: `ADMIN`, `CREATOR`

### GET `/api/docs`
* **Description**: Lists generated technical documents with optional `doc_type` filter.
* **Access**: Authenticated

### PUT `/api/docs/{doc_id}`
* **Description**: Safely appends sections or updates document content while preserving existing sections.
* **Access**: `ADMIN`, `CREATOR`

---

## 7. Core Banking DNA Router (`app/api/dna.py`)

### GET `/api/dna/applications`
* **Description**: Lists Core Banking applications with version, owner, and feature catalog.
* **Access**: Authenticated

### GET `/api/dna/clusters`
* **Description**: Computes semantic capability clusters identifying functional overlaps across applications.
* **Access**: Authenticated

### POST `/api/dna/features/match`
* **Description**: Matches a new feature description against existing capabilities.
* **Access**: Authenticated

---

## 8. Innovation Pipeline Router (`app/api/innovation.py`)

### GET `/api/innovation/opportunities`
* **Description**: Lists innovation opportunities backlog.
* **Access**: Authenticated

### POST `/api/innovation/opportunities`
* **Description**: Creates a new innovation opportunity with priority and complexity scoring.
* **Access**: `ADMIN`, `CREATOR`

### PUT `/api/innovation/opportunities/{opp_id}`
* **Description**: Updates opportunity status (`BACKLOG`, `IN_PROGRESS`, `VALIDATING`, `COMPLETED`).
* **Access**: `ADMIN`, `CREATOR`

### POST `/api/innovation/analyze`
* **Description**: Runs AI gap analysis across ingested documents to suggest product opportunities.
* **Access**: `ADMIN`, `CREATOR`

---

## 9. Knowledge Graph Router (`app/api/knowledge_graph.py`)

### GET `/api/knowledge-graph/data`
* **Description**: Extracts cross-entity graph nodes and edges across documents, Oracle objects, DNA apps, and opportunities.
* **Access**: Authenticated

### POST `/api/knowledge-graph/search`
* **Description**: Searches and filters sub-graph nodes based on query string.
* **Access**: Authenticated

---

## 10. Reports & Analytics Router (`app/api/reports.py`)

### GET `/api/reports/executive?refresh=false`
* **Description**: Aggregates executive KPI telemetry with Redis caching and manual cache invalidation (`refresh=true`).
* **Access**: Authenticated

### GET `/api/reports/analytics`
* **Description**: Returns detailed search performance, query latency trends, and document distributions.
* **Access**: `ADMIN`, `CREATOR`

---

## 11. Admin Console Router (`app/api/admin.py`)

### GET `/api/admin/users`
* **Description**: Lists all registered users with role and creation timestamp.
* **Access**: `ADMIN` only

### PUT `/api/admin/users/{user_id}/role`
* **Description**: Modifies user role (`ADMIN`, `CREATOR`, `CONSUMER`).
* **Access**: `ADMIN` only

### GET `/api/admin/monitoring`
* **Description**: Real-time health pulse for PostgreSQL, Redis, Weaviate, Ollama, host CPU, and RAM.
* **Access**: `ADMIN` only

### GET `/api/admin/db-stats`
* **Description**: Returns table record counts and database disk usage statistics.
* **Access**: `ADMIN` only
