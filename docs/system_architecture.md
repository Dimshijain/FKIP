# System Architecture Document
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

---

## 1. Architectural Overview

The FinXSystems Knowledge Intelligence Platform (FKIP) is built using a **Layered Microservices Architecture** deployed on-premise inside containerized environments. It decouples the React frontend single-page application, FastAPI backend services, Redis caching, relational data persistence (PostgreSQL), dense vector search (Weaviate), and local LLM inference (Ollama).

```text
+-----------------------------------------------------------------------------------------+
|                                      PRESENTATION LAYER                                 |
|   +---------------------------------------------------------------------------------+   |
|   |                       React 18 SPA (Vite + Glassmorphism UI)                    |   |
|   |   - Dashboard         - AI Copilot (SSE)     - SQL Writer      - Oracle Intel   |   |
|   |   - Knowledge Search  - DNA Catalog          - Innovation      - Knowledge Graph|   |
|   |   - Doc Generator     - Analytics Reports    - Admin Console   - Theme Context  |   |
|   +----------------------------------------+----------------------------------------+   |
+--------------------------------------------|--------------------------------------------+
                                             | HTTP / REST & Server-Sent Events (SSE)
                                             v
+-----------------------------------------------------------------------------------------+
|                                    APPLICATION API LAYER                                |
|   +---------------------------------------------------------------------------------+   |
|   |                       FastAPI Asynchronous Backend (Port 8000)                  |   |
|   |   - auth_router       - search_router        - copilot_router  - sql_writer_router  |
|   |   - oracle_router     - dna_router           - innovation_router - docs_router      |
|   |   - graph_router      - reports_router       - admin_router    - CORS Middleware    |
|   +----------------------------------------+----------------------------------------+   |
+--------------------------------------------|--------------------------------------------+
                                             | Internal Service Bus / Pipelines
                                             v
+-----------------------------------------------------------------------------------------+
|                                      SERVICES LAYER                                     |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
|   |  Ingestion Engine |  |  Grounding & RAG  |  |  Oracle Service   |  | Clustering |   |
|   |  - Chunking       |  |  - Citations      |  |  - DDL Parser     |  | - Overlaps |   |
|   |  - Token Counts   |  |  - Prompt Builder |  |  - Impact Graph   |  | - Features |   |
|   +---------+---------+  +---------+---------+  +---------+---------+  +-----+------+   |
|             |                      |                      |                  |          |
|   +---------v---------+  +---------v---------+  +---------v---------+        |          |
|   |   Cache Service   |  |    LLM Service    |  |   Vector Service  |<-------+          |
|   |   - In-Memory     |  |   - Multi-Model   |  |   - Weaviate      |                   |
|   |   - Redis Client  |  |   - Streaming SSE |  |   - Hybrid Search |                   |
|   +---------+---------+  +---------+---------+  +---------+---------+                   |
+-------------|----------------------|----------------------|-----------------------------+
              |                      |                      |
              v                      v                      v
+-----------------------------------------------------------------------------------------+
|                                   INFRASTRUCTURE LAYER                                  |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
|   |    PostgreSQL     |  |   Redis Cache     |  |  Weaviate Vector  |  |   Ollama   |   |
|   |    Port: 5432     |  |   Port: 6379      |  |   Port: 8081      |  | Port:11434 |   |
|   | Relational tables |  | In-memory caching |  | Vector embeddings |  | Local LLMs |   |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Components

### 2.1 Frontend Single-Page Application (`/frontend`)
* **Technology**: React 18, Vite, React Router v6, Lucide React icons, Recharts.
* **Styling**: Curated Vanilla CSS design system with HSL tokens, dark/light theme switching, and glassmorphism styling.
* **State & Communication**:
  * `ThemeContext`: Toggles between dark mode (`#090d16`) and light mode themes.
  * `ToastContext`: Provides global floating toast notifications.
  * `api.js`: Centralized Axios/fetch client handling JWT Bearer tokens and HTTP errors.
  * Real-time SSE consumers for streaming AI Copilot responses.

### 2.2 Backend Microservice (`/backend`)
* **Technology**: Python 3.11+, FastAPI, SQLAlchemy, Pydantic, Uvicorn.
* **Routers (`app/api/`)**:
  * `auth.py`: JWT login, registration, and profile retrieval.
  * `copilot.py`: Multi-model AI reasoning, SSE streaming (`EventSourceResponse`), session history.
  * `search.py`: Hybrid semantic search, conversational RAG, feedback ratings, search audit logs.
  * `sql_writer.py`: Schema extraction, Natural Language to SQL, formatting, explain plan, safe read-only execution, query history, Markdown tech spec synthesis, CSV export.
  * `oracle.py`: DDL parsing, schema object catalog, foreign key/view/trigger dependencies, change impact simulation with valid reference validation.
  * `docs.py`: Document uploads (`202 Accepted`), chunking, template generation (BRD, SRS, Tech Design, API Docs, Release Notes, User Manual), custom document saving, section appending.
  * `dna.py`: Core Banking application catalog, capability clustering, feature similarity matching.
  * `innovation.py`: Opportunity backlog CRUD, scoring, AI gap analysis.
  * `knowledge_graph.py`: Cross-entity graph node/edge extraction and filtering.
  * `reports.py`: Executive KPI telemetry with cache invalidation, latency trends.
  * `admin.py`: User governance, role elevations, real-time infrastructure pulse.

### 2.3 Storage & Infrastructure Components
* **PostgreSQL (`fkip-postgres:5432`)**: Relational storage for 14 entities (users, documents, chunks, opportunities, audit logs, feedbacks, Oracle metadata, Oracle dependencies, DNA apps, DNA features, copilot conversations, copilot messages, generated documents, SQL generation history).
* **Redis (`fkip-redis:6379`)**: In-memory caching for executive telemetry and frequent hybrid search queries with automatic fallback to local memory cache.
* **Weaviate (`fkip-weaviate:8081`)**: Vector database storing dense vector embeddings for semantic document search and DNA feature clustering.
* **Ollama (`fkip-ollama:11434`)**: Local inference engine running configured models (`qwen2.5`, `llama3.1`, `mistral`, `gemma:2b`, `deepseek-r1`) without external cloud API calls.

---

## 3. End-to-End Data Flows

### 3.1 Document Ingestion & Vector Indexing Flow
```text
User (Upload File)
  │
  ▼
FastAPI (/api/documents/upload)
  │
  ├─► Generates SHA-256 Hash & Saves File
  ├─► Creates Document Record in PostgreSQL (Status: PROCESSING)
  │
  ▼
Background Worker (app.services.ingestion)
  │
  ├─► Extracts Text (PDF, DOCX, TXT)
  ├─► Segments Text into Semantic Chunks with Token Counts
  ├─► Writes DocumentChunks to PostgreSQL
  ├─► Generates Vector Embeddings via Ollama / SentenceTransformers
  ├─► Indexes Vectors into Weaviate Vector Store
  │
  ▼
Updates Document Record in PostgreSQL (Status: COMPLETED)
```

### 3.2 Multi-Model AI Copilot Streaming Flow
```text
User (Prompt + Model Selection)
  │
  ▼
FastAPI (/api/copilot/chat/stream)
  │
  ├─► Authenticates JWT Bearer Token & Verifies User
  ├─► Retrieves Semantic Recommendations from Ingested Docs & Schema Catalog
  ├─► Constructs Enriched System & User Prompt
  │
  ▼
Ollama Inference Engine (Selected Model: Qwen / Llama / Mistral / Gemma / DeepSeek)
  │
  ▼ (Streaming Tokens)
FastAPI SSE Endpoint (yields data: {"token": "..."})
  │
  ▼ (Server-Sent Events Stream)
React Client (Renders Markdown Tokens Incrementally in Real Time)
  │
  ▼ (Stream Complete)
FastAPI Persists Message to copilot_messages in PostgreSQL
```

### 3.3 Safe AI SQL Writer Flow
```text
User (Plain English Prompt)
  │
  ▼
FastAPI (/api/sql/generate)
  │
  ├─► Injects Schema Context (Tables, Columns, Types, PKs)
  ├─► Synthesizes Dialect-Specific SQL (Oracle / PostgreSQL)
  ├─► Analyzes Query Safety (Flags DDL/DML Mutations)
  │
  ▼
User Reviews SQL in UI & Clicks "Run Query"
  │
  ▼
FastAPI (/api/sql/execute)
  │
  ├─► Guardrail Validator: Rejects DROP, DELETE, UPDATE, TRUNCATE, ALTER, CREATE, GRANT
  ├─► Rejects SQL Injection & Comment Bypass Attempts
  ├─► Executes Safe Read-Only SELECT with Limit Capping (Max 100 Rows)
  ├─► Logs Telemetry in sql_generation_history
  │
  ▼
React Client Renders Dynamic Table & Export CSV Option
```

### 3.4 Oracle Change Impact Simulation Flow
```text
User (Selects Schema Object e.g. DEPARTMENTS)
  │
  ▼
FastAPI (/api/oracle/impact-analysis)
  │
  ├─► Fetches OracleMetadata & OracleDependencies from PostgreSQL
  ├─► Performs Graph BFS Traversal to Trace Downstream Dependents
  ├─► Evaluates Target Reference Integrity:
  │     • Valid Schema Link  ──► Status: VALID_REFERENCE ("✓ Valid reference")
  │     • Missing Target     ──► Status: BROKEN_REFERENCE ("Broken reference risk")
  │
  ▼
React Client Renders Cascading Impact Tree & Status Badges
```
