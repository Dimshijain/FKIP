# Software Requirements Specification (SRS)
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the **FinXSystems Knowledge Intelligence Platform (FKIP)**. FKIP is a secure, private, enterprise-grade AI-powered platform designed to centralize and synthesize knowledge across scattered documents, Oracle metadata, and 400+ internal Core Banking applications. It provides intelligent search capabilities, metadata dependency mapping, an AI SQL Writer with safe execution guardrails, multi-model AI Copilot assistance, and automated innovation pipeline generation.

### 1.2 Scope
FKIP eliminates information silos, reduces manual research overhead, and establishes a continuous innovation pipeline for FinXSystems. The system integrates:
1. **Document Ingestion & Chunking Pipeline**: Supports unstructured documents (PDF, DOCX, TXT), background chunking, and dual storage across PostgreSQL and Weaviate.
2. **Hybrid Semantic Search & RAG Assistant**: Combines dense vector similarity and sparse lexical keyword search with strict citations and user feedback ratings.
3. **Multi-Model AI Copilot**: Orchestrates inference across 5 local LLMs (Qwen 2.5, Llama 3.1, Mistral, Gemma 2B, DeepSeek R1) with Server-Sent Events (SSE) token streaming and persistent conversation sessions.
4. **AI SQL Writer & Guardrailed Execution**: Generates SQL for Oracle and PostgreSQL dialects from plain English prompts, provides SQL formatting and explain plans, safely executes read-only queries with strict DDL/DML mutation blocking, generates technical specifications, and exports results to CSV.
5. **Oracle Database Intelligence Engine**: Parses SQL DDL schemas, builds relational dependency graphs (Foreign Keys, Views, Triggers), and simulates change impact with valid reference vs broken reference risk indicators.
6. **Core Banking DNA Catalog**: Catalogs 400+ internal software assets, extracts features, performs semantic capability clustering, and matches new feature descriptions against the existing portfolio.
7. **Innovation Opportunities Pipeline**: Analyzes architectural gaps and maintains an active product opportunity backlog with business value, complexity, and priority scoring.
8. **Relational Knowledge Graph**: Visualizes cross-entity connections between documents, Oracle objects, Core Banking applications, and innovation opportunities.
9. **Technical Document Generator**: Synthesizes 6 enterprise documentation templates (BRD, SRS, Tech Design, API Docs, Release Notes, User Manual), allows custom document creation, and safely appends sections while preserving prior content.
10. **Executive Telemetry & Admin Console**: Real-time KPI dashboards with Redis cache invalidation, search latency trends, user role management, and container health monitoring.

### 1.3 Definitions, Acronyms, and Abbreviations
* **RAG**: Retrieval-Augmented Generation.
* **Core Banking DNA**: Internal catalog of FinXSystems banking software applications and features.
* **Vector DB**: Database optimized for storing and querying multi-dimensional vector embeddings (Weaviate).
* **Ollama**: Local, private framework for running LLMs on-premise without external data leaks.
* **SSE**: Server-Sent Events for real-time token streaming.
* **RBAC**: Role-Based Access Control (`ADMIN`, `CREATOR`, `CONSUMER`).
* **DDL / DML**: Data Definition Language / Data Manipulation Language.

---

## 2. Overall Description

### 2.1 Product Perspective
FKIP operates as an independent, private cloud application deployed on-premise. It interfaces with enterprise data sources and exposes a secure Web Application and REST API Services for internal stakeholders (Product Managers, Business Analysts, DBAs, Developers, and System Administrators).

```text
  +-----------------------------------------------------------------------+
  |                             Data Sources                              |
  |   (Documents, Oracle SQL DDL, Core Banking Catalogs, Search Logs)     |
  +-----------------------------------+-----------------------------------+
                                      | Ingestion & Indexing
                                      v
  +-----------------------------------------------------------------------+
  |                               FKIP Core                               |
  |  (FastAPI Backend, Redis Cache, PostgreSQL Database, Weaviate Vector) |
  +-----------------------------------+-----------------------------------+
                                      | REST / SSE APIs
                                      v
  +-----------------------------------------------------------------------+
  |                           Client Application                          |
  |      (React 18 SPA: Copilot, SQL Writer, Oracle Intel, DNA, Admin)    |
  +-----------------------------------------------------------------------+
```

### 2.2 User Classes & Roles
* **CONSUMER (Viewer)**: Read-only access to search knowledge, view dashboard KPIs, explore the DNA catalog, and browse documentation. Blocked from uploads, deletions, and administrative actions.
* **CREATOR (Operator/Developer/BA)**: Full access to upload documents, generate SQL, run impact simulations, draft technical specifications, and add innovation opportunities.
* **ADMIN (System Administrator)**: Full platform governance, user role modification, real-time infrastructure health monitoring, and system maintenance.

### 2.3 Operating Environment & Constraints
* **Deployment**: Containerized multi-service deployment via Docker Compose (`backend`, `frontend`, `postgres`, `redis`, `weaviate`, `ollama`).
* **Security & Privacy**: 100% on-premise execution; zero external cloud API dependencies.
* **Data Isolation**: Local storage of vector embeddings, document files, and user session tokens.

---

## 3. Specific Functional Requirements

### 3.1 Authentication & User Management (AUTH)
* **AUTH-1: Secure Authentication**: The system shall authenticate users via `/api/auth/login` and issue cryptographically signed JWT bearer tokens.
* **AUTH-2: User Registration**: The system shall support new user registration via `/api/auth/register` with default `CONSUMER` role assignment and email uniqueness validation.
* **AUTH-3: Profile Retrieval**: The system shall return authenticated user details via `/api/auth/me`.
* **AUTH-4: Role-Based Access Control**: The system shall strictly enforce endpoint authorization across `ADMIN`, `CREATOR`, and `CONSUMER` roles.

### 3.2 Document Ingestion & Vector Indexing (DOCS)
* **DOCS-1: Multi-Format Ingestion**: The system shall accept `.pdf`, `.txt`, and `.docx` file uploads via `/api/documents/upload` with background processing.
* **DOCS-2: Chunking & Tokenization**: The system shall segment documents into semantic chunks with token counts and positional indices.
* **DOCS-3: Dual Persistence**: The system shall store document records in PostgreSQL and index dense vector embeddings in Weaviate.
* **DOCS-4: Chunk Retrieval & Purge**: The system shall support chunk listing via `/api/documents/{id}/chunks` and cascading deletion of documents and vector embeddings.

### 3.3 Knowledge Search & RAG Assistant (SEARCH)
* **SEARCH-1: Hybrid Search**: The system shall execute hybrid semantic and lexical keyword queries via `/api/search` with relevance scoring and limit filtering.
* **SEARCH-2: Conversational RAG**: The system shall provide interactive RAG chat via `/api/search/chat` with citations grounded in source document chunks.
* **SEARCH-3: Feedback Logging**: The system shall record user ratings (1–5) and comments via `/api/search/feedback`.
* **SEARCH-4: Search Auditing**: The system shall log query text, response text, and execution latency in `search_audit_logs`.

### 3.4 Multi-Model AI Copilot (COPILOT)
* **COPILOT-1: Model Discovery**: The system shall expose all 5 configured AI models (`qwen2.5:latest`, `llama3.1:latest`, `mistral:latest`, `gemma:2b`, `deepseek-r1:latest`) via `/api/copilot/models`.
* **COPILOT-2: Synchronous & SSE Streaming Chat**: The system shall provide synchronous chat via `/api/copilot/chat` and real-time token streaming via `/api/copilot/chat/stream`.
* **COPILOT-3: Context Enrichment**: The system shall enrich prompt contexts with semantic recommendations from ingested documents and catalog metadata.
* **COPILOT-4: Session History**: The system shall maintain persistent multi-message conversation threads via `/api/copilot/sessions`.

### 3.5 AI SQL Writer & Safe Execution (SQL)
* **SQL-1: Schema Tree Extraction**: The system shall extract database schema tables, columns, data types, and primary keys via `/api/sql/schema`.
* **SQL-2: Natural Language Generation**: The system shall generate SQL queries for Oracle and PostgreSQL dialects via `/api/sql/generate`.
* **SQL-3: SQL Formatting & Explain Plan**: The system shall format SQL keywords and indentation via `/api/sql/format` and generate execution plan breakdowns via `/api/sql/explain`.
* **SQL-4: Safe Execution Guardrails**: The system shall execute read-only `SELECT` queries via `/api/sql/execute` and strictly reject destructive DDL/DML mutations (`DROP`, `DELETE`, `UPDATE`, `TRUNCATE`, `ALTER`, `CREATE`, `GRANT`) and comment injection bypass attempts.
* **SQL-5: Query History & Documentation Synthesis**: The system shall log executed queries in `sql_generation_history` and synthesize Markdown technical specifications via `/api/sql/generate-docs`.

### 3.6 Oracle Database Intelligence (ORACLE)
* **ORACLE-1: DDL Ingestion**: The system shall parse `.sql` DDL scripts via `/api/oracle/upload` to extract tables, views, triggers, and foreign keys.
* **ORACLE-2: Catalog & Dependencies**: The system shall list schema objects via `/api/oracle/objects` and relationship mappings via `/api/oracle/dependencies`.
* **ORACLE-3: Change Impact Simulation**: The system shall calculate downstream impact trees via `/api/oracle/impact-analysis`, distinguishing valid references (`✓ Valid reference`) from broken reference risks.

### 3.7 Core Banking DNA Catalog (DNA)
* **DNA-1: Application Catalog**: The system shall list Core Banking applications and feature specifications via `/api/dna/applications`.
* **DNA-2: Semantic Clustering**: The system shall compute capability clusters via `/api/dna/clusters` to identify functional overlaps across applications.
* **DNA-3: Feature Matching**: The system shall match new feature descriptions against the existing catalog via `/api/dna/features/match`.

### 3.8 Innovation Opportunities Pipeline (INNOV)
* **INNOV-1: Pipeline Management**: The system shall provide CRUD management for innovation opportunities via `/api/innovation/opportunities`.
* **INNOV-2: Opportunity Scoring**: The system shall score opportunities across Business Value (`HIGH`, `MEDIUM`, `LOW`), Complexity (`HIGH`, `MEDIUM`, `LOW`), and Priority (`P1`, `P2`, `P3`).
* **INNOV-3: AI Gap Analysis**: The system shall synthesize document gaps and suggest high-value product opportunities via `/api/innovation/analyze`.

### 3.9 Knowledge Graph (GRAPH)
* **GRAPH-1: Cross-Entity Graph**: The system shall extract unified graph nodes and edges across documents, Oracle objects, DNA apps, and opportunities via `/api/knowledge-graph/data`.
* **GRAPH-2: Sub-Graph Search**: The system shall filter and retrieve sub-graphs based on entity search queries via `/api/knowledge-graph/search`.

### 3.10 Technical Document Generator (GEN)
* **GEN-1: Template Generation**: The system shall synthesize specifications across 6 enterprise templates (BRD, SRS, Tech Design, API Docs, Release Notes, User Manual) via `/api/docs/generate`.
* **GEN-2: Custom Docs & Append**: The system shall save custom Markdown documents via `/api/docs/custom` and append sections via `PUT /api/docs/{id}` while preserving existing content.

### 3.11 Executive Telemetry & Admin Console (DASH / ADMIN)
* **DASH-1: Executive KPI Metrics**: The system shall aggregate telemetry metrics via `/api/reports/executive` with Redis caching and manual cache invalidation (`?refresh=true`).
* **ADMIN-1: User Governance**: The system shall provide user listing, search, and role updates via `/api/admin/users`.
* **ADMIN-2: Infrastructure Health Monitoring**: The system shall monitor real-time health for PostgreSQL, Redis, Weaviate, Ollama, and host CPU/RAM via `/api/admin/monitoring`.

---

## 4. Non-Functional Requirements

### 4.1 Performance & Latency
* **PERF-1**: Redis-cached telemetry and search responses shall return in under **50ms**.
* **PERF-2**: Cold hybrid search queries across large vector spaces shall return in under **350ms**.
* **PERF-3**: Read-only SQL query execution against relational tables shall execute in under **100ms**.

### 4.2 Security & Integrity
* **SEC-1**: Password credentials must be hashed using bcrypt with salted entropy.
* **SEC-2**: API endpoints must validate JWT tokens on every authenticated request.
* **SEC-3**: SQL Writer must enforce strict read-only execution guardrails to prevent accidental or malicious database mutations.

### 4.3 Reliability & Automated Testing
* **REL-1**: The platform must maintain a comprehensive automated test suite covering API, Security, Integration, Performance, and E2E layers with 100% pass verification.
* **REL-2**: Container health checks and isolated microservices ensure independent restartability and fault tolerance.
