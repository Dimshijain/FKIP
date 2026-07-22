# FKIP REST API Documentation Reference

This document maps the API routes, query parameters, authorization headers, and JSON payloads for the **FinXSystems Knowledge Intelligence Platform (FKIP)** backend server.

---

## 1. Authentication Router

All endpoints (except `/api/auth/login`) require the authorization header:
`Authorization: Bearer <access_token>`

### POST `/api/auth/login`
- **Description**: Authenticates users and returns a JWT token.
- **Request Payload** (`application/json`):
  ```json
  {
    "email": "creator@finxsystems.com",
    "password": "password123",
    "role": "CREATOR"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "access_token": "ey...",
    "token_type": "bearer"
  }
  ```

### GET `/api/auth/me`
- **Description**: Retrieves current logged in user details.
- **Response** (200 OK):
  ```json
  {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
    "email": "creator@finxsystems.com",
    "role": "CREATOR"
  }
  ```

---

## 2. Ingestion & Search Router

### POST `/api/documents/upload`
- **Description**: Uploads a document to PostgreSQL and processes it into vector chunks inside Weaviate in the background.
- **Request Payload** (`multipart/form-data`):
  - `file`: Binary file (TXT, PDF, DOCX, CSV)
- **Response** (202 Accepted):
  ```json
  {
    "id": "uuid-string",
    "filename": "srs_blueprint.pdf",
    "file_type": "pdf",
    "status": "PENDING"
  }
  ```

### POST `/api/search/hybrid`
- **Description**: Performs keyword + semantic vector search in Weaviate.
- **Request Payload**:
  ```json
  {
    "query": "Oracle trigger references",
    "limit": 3,
    "document_id": "optional-uuid-to-filter"
  }
  ```

### POST `/api/search/chat`
- **Description**: Sends user query to the RAG chat assistant.
- **Request Payload**:
  ```json
  {
    "messages": [
      {"role": "user", "content": "What is Weaviate's port?"}
    ],
    "document_id": "optional-uuid"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "response": "Weaviate runs on port 8081.",
    "citations": [
      {"filename": "test_doc.txt", "chunk_content": "..."}
    ],
    "log_id": "uuid-string"
  }
  ```

---

## 3. Oracle Intelligence Router

### POST `/api/oracle/upload`
- **Description**: Uploads a schema SQL DDL script, parses it, and creates relational records.
- **Request Payload** (`multipart/form-data`):
  - `file`: SQL DDL script file
- **Response** (201 Created):
  ```json
  {
    "message": "DDL parsed and relationships indexed successfully.",
    "objects_created": 4,
    "relationships_created": 3
  }
  ```

### GET `/api/oracle/impact-analysis`
- **Description**: Computes the downstream impacted views/triggers for a selected table object.
- **Query Params**:
  - `object_id`: UUID of the selected object
- **Response** (200 OK):
  ```json
  [
    {
      "id": "uuid",
      "object_name": "EMP_DETAILS",
      "object_type": "VIEW",
      "dep_type": "VIEW_REFERENCE",
      "depth": 1
    }
  ]
  ```

---

## 4. Core Banking Router

### POST `/api/dna/upload`
- **Description**: Ingests JSON application specification catalog.
- **Request Payload** (`multipart/form-data`):
  - `file`: JSON file catalog
- **Response** (201 Created):
  ```json
  {
    "message": "Core Banking applications and feature specifications ingested successfully.",
    "features_indexed": 12
  }
  ```

### GET `/api/dna/clusters`
- **Description**: Evaluates feature semantic overlaps and detects capability redundancies.
- **Query Params**:
  - `threshold`: Float similarity limit (default `0.80`)
- **Response** (200 OK):
  ```json
  [
    {
      "cluster_id": "CLUSTR-001",
      "primary_capability": "Billing Process",
      "category": "Accounting",
      "features": [
        {"app_code": "APP-CRM", "feature_name": "Billing Process", "similarity_score": 1.0}
      ]
    }
  ]
  ```

---

## 5. Innovation Pipeline & Graph Routers

### POST `/api/innovation/analyze`
- **Description**: Runs gap analysis comparing documents text against system capabilities.
- **Request Payload**:
  ```json
  {
    "document_ids": ["uuid-1"]
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "gaps": ["Billing discrepancy"],
    "ideas": [
      {
        "name": "Audit Logging",
        "description": "Log all invoice actions.",
        "business_value": "HIGH",
        "complexity": "LOW",
        "priority": "P1"
      }
    ]
  }
  ```

### GET `/api/knowledge-graph`
- **Description**: Renders nodes and edges linking files, SQL objects, and backlog tickets.
- **Response** (200 OK):
  ```json
  {
    "nodes": [{"id": "node-1", "label": "test_doc.txt", "type": "document"}],
    "edges": [{"source": "node-1", "target": "node-2", "type": "REFERENCE"}]
  }
  ```

---

## 6. Spec Generator Router

### POST `/api/docs/generate`
- **Description**: Auto-drafts specification templates using local LLM contexts.
- **Request Payload**:
  ```json
  {
    "doc_type": "SRS",
    "title": "FKIP System Blueprint"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "id": "uuid-string",
    "doc_type": "SRS",
    "title": "FKIP System Blueprint",
    "content": "# Title\nDetailed content..."
  }
  ```
