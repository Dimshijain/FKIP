# Database Design Document
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

---

## 1. Relational Database Design (PostgreSQL)

The relational schema maps user access control, records ingestion activities, manages SQL generation history, tracks multi-model conversation sessions, stores generated technical specifications, and tracks structural database and software assets.

```text
+---------------------------------------------------------------------------------------------------+
|                                         RELATIONAL SCHEMA                                         |
|                                                                                                   |
|   +-------------------+          +-------------------+          +-----------------------------+   |
|   |       users       |          |     documents     |          |      user_feedback          |   |
|   |-------------------|          |-------------------|          |-----------------------------|   |
|   | PK id (UUID)      |          | PK id (UUID)      |          | PK id (UUID)                |   |
|   |    email (UNIQUE) |          |    filename       |          | FK log_id (search_audit_logs|   |
|   |    password_hash  |          |    file_path      |          |    rating (INT)             |   |
|   |    role (ENUM)    |          |    file_size_bytes|          |    comments                 |   |
|   +---------+---------+          |    file_type      |          +--------------^--------------+   |
|             |                    |    file_hash (UNQ)|                         |                  |
|             |                    |    status (ENUM)  |                         |                  |
|             |                    +---------+---------+                         |                  |
|             |                              |                                   |                  |
|             |                              v                                   |                  |
|             |                    +---------+---------+                         |                  |
|             |                    |  document_chunks  |                         |                  |
|             |                    |-------------------|                         |                  |
|             |                    | PK id (UUID)      |                         |                  |
|             |                    | FK document_id    |                         |                  |
|             |                    |    chunk_index    |                         |                  |
|             |                    |    chunk_content  |                         |                  |
|             |                    |    token_count    |                         |                  |
|             |                    +-------------------+                         |                  |
|             |                                                                  |                  |
|             +----------------------------+-----------------------+             |                  |
|             |                            |                       |             |                  |
|             v                            v                       v             |                  |
|   +---------+---------------+  +---------+---------+  +----------+----------+  |                  |
|   |innovation_opportunities |  |search_audit_logs  |  |sql_generation_hist  |  |                  |
|   |-------------------------|  |-------------------|  |---------------------|  |                  |
|   | PK id (UUID)            |  | PK id (UUID)      |  | PK id (UUID)        |  |                  |
|   |    opp_code (UNQ)       |  | FK user_id        |  | FK user_id          |  |                  |
|   |    name                 |  |    query_text     |  |    prompt           |  |                  |
|   | FK created_by (users.id)|  |    response_text  |  |    dialect          |  |                  |
|   |    business_value (ENUM)|  |    response_lat_ms|  |    generated_sql    |  |                  |
|   |    complexity (ENUM)    |  +---------+---------+  |    is_safe          |  |                  |
|   |    priority (ENUM)      |            |            |    row_count        |  |                  |
|   |    status (ENUM)        |            +------------|----+----------------+  |                  |
|   +-------------------------+                         +------------------------+                  |
|                                                                                                   |
|   +--------------------------+          +--------------------------+                              |
|   |  copilot_conversations   |          |     copilot_messages     |                              |
|   |--------------------------|          |--------------------------|                              |
|   | PK id (UUID)             |          | PK id (UUID)             |                              |
|   | FK user_id (users.id)    |<-------- | FK conversation_id       |                              |
|   |    title                 |          |    role (user/assistant) |                              |
|   +--------------------------+          |    content               |                              |
|                                         |    suggestions (JSON)    |                              |
|                                         |    recommendations (JSON)|                              |
|                                         +--------------------------+                              |
|                                                                                                   |
|   +--------------------------+          +--------------------------+                              |
|   |     oracle_metadata      |<-------- |   oracle_dependencies    |                              |
|   |--------------------------|          |--------------------------|                              |
|   | PK id (UUID)             |          | PK id (UUID)             |                              |
|   |    object_name           |          | FK source_object_id      |                              |
|   |    object_type (ENUM)    |          | FK target_object_id      |                              |
|   |    owner                 |          |    dep_type (ENUM)       |                              |
|   |    schema_definition     |          +--------------------------+                              |
|   +------------^-------------+                                                                    |
|                |                                                                                  |
|   +------------+-------------+          +--------------------------+                              |
|   |     dna_applications     |<-------- |     dna_app_features     |                              |
|   |--------------------------|          |--------------------------|                              |
|   | PK id (UUID)             |          | PK id (UUID)             |                              |
|   |    app_code (UNQ)        |          | FK app_id                |                              |
|   |    app_name              |          |    feature_name          |                              |
|   |    owner                 |          |    feature_description   |                              |
|   |    platform              |          |    category              |                              |
|   +--------------------------+          +--------------------------+                              |
|                                                                                                   |
|   +--------------------------+                                                                    |
|   |   generated_documents    |                                                                    |
|   |--------------------------|                                                                    |
|   | PK id (UUID)             |                                                                    |
|   |    doc_type (INDEX)      |                                                                    |
|   |    title (INDEX)         |                                                                    |
|   |    content (TEXT)        |                                                                    |
|   |    author                |                                                                    |
|   +--------------------------+                                                                    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Table Specifications & Entities

### 2.1 Enums Defined
* `user_role`: `'ADMIN'`, `'CREATOR'`, `'CONSUMER'`
* `ingestion_status`: `'PENDING'`, `'PROCESSING'`, `'COMPLETED'`, `'FAILED'`
* `opportunity_source`: `'ORACLE_METADATA'`, `'DNA_APPLICATIONS'`, `'SUPPORT_TICKETS'`, `'RELEASE_NOTES'`, `'GENERAL'`
* `opportunity_metric`: `'HIGH'`, `'MEDIUM'`, `'LOW'`
* `opportunity_priority`: `'P1'`, `'P2'`, `'P3'`
* `opportunity_status`: `'BACKLOG'`, `'IN_PROGRESS'`, `'VALIDATING'`, `'COMPLETED'`
* `oracle_object_type`: `'TABLE'`, `'VIEW'`, `'PROCEDURE'`, `'TRIGGER'`, `'COLUMN'`
* `dependency_type`: `'FOREIGN_KEY'`, `'VIEW_REFERENCE'`, `'TRIGGER_REFERENCE'`, `'CALLS'`

---

### 2.2 Relational Tables (14 Entities)

1. **`users`**: Platform user accounts, authentication passwords, and assigned roles.
2. **`documents`**: Ingested document metadata, file paths, SHA-256 deduplication hashes, and processing status.
3. **`document_chunks`**: Semantic text fragments parsed from documents with token lengths and chunk indices. Cascades delete on document purge.
4. **`innovation_opportunities`**: Innovation backlog opportunities, scoring metrics, and status lifecycle.
5. **`search_audit_logs`**: Historical search queries, synthesized answers, latency metrics, and hallucination flags.
6. **`user_feedback`**: Star ratings (1–5) and user comments linked to search audit logs.
7. **`oracle_metadata`**: Reverse-engineered Oracle tables, views, triggers, and DDL schema definitions.
8. **`oracle_dependencies`**: Graph edges capturing foreign keys, view references, and trigger dependencies between Oracle objects.
9. **`dna_applications`**: Catalog of 400+ internal Core Banking software applications.
10. **`dna_app_features`**: Specific capability features and functional categories associated with each Core Banking application.
11. **`copilot_conversations`**: Persistent chat session threads created by users.
12. **`copilot_messages`**: Sequential user and assistant messages within a session, including follow-up suggestions and context recommendations.
13. **`generated_documents`**: Technical specification documents (BRD, SRS, Tech Design, API Docs, Release Notes, User Manual) and custom documents synthesized by the system.
14. **`sql_generation_history`**: History of generated SQL queries, prompts, safety status, execution latency, and row counts.

---

## 3. Vector Database Schema (Weaviate)

Weaviate operates on port `8081` and manages dense vector collections for high-dimensional semantic search:

### Collection: `DocumentChunk`
* **Properties**:
  * `document_id`: UUID string linking back to PostgreSQL `documents.id`.
  * `filename`: Source file name (e.g. `financial_reporting_architecture.txt`).
  * `chunk_index`: Sequence order integer.
  * `content`: Chunk text payload.
  * `token_count`: Integer token count.
* **Vector Indexing**: Dense cosine distance vector index generated via Ollama / SentenceTransformers embedding models.
