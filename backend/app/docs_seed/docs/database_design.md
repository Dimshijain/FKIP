# Database Design Document
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

---

## 1. Relational Database Design (PostgreSQL)

The relational schema maps user access control, records ingestion activities, and tracks structural database and software assets. Foreign key constraints maintain relational integrity.

```
+---------------------------------------------------------------------------------+
|                                 RELATIONAL SCHEMA                               |
|                                                                                 |
|   +-------------------+          +-------------------+          +-----------+   |
|   |       users       |          |     documents     |          |  feedback |   |
|   |-------------------|          |-------------------|          |-----------|   |
|   | PK id (UUID)      |          | PK id (UUID)      |          | PK id     |   |
|   |    email (UNIQUE) |          |    filename       |          | FK log_id |   |
|   |    password_hash  |          |    file_path      |          |    rating |   |
|   |    role (ENUM)    |          |    file_hash      |          |    comment|   |
|   +---------+---------+          |    status         |          +-----+-----+   |
|             |                    +---------+---------+                |         |
|             |                              |                          |         |
|             |                              v                          |         |
|             |                    +---------+---------+                |         |
|             |                    |  document_chunks  |                |         |
|             |                    |-------------------|                |         |
|             |                    | PK id (UUID)      |                |         |
|             |                    | FK document_id    |                |         |
|             |                    |    chunk_content  |                |         |
|             |                    +-------------------+                |         |
|             |                                                         |         |
|             +-------------+                                           |         |
|             |             |                                           |         |
|             v             v                                           v         |
|   +---------+---------+  +---------+---------+              +---------+---------+
|   |    opportunities  |  | search_audit_logs |--------------|    audit logs     |
|   |-------------------|  |-------------------|              +-------------------+
|   | PK id (UUID)      |  | PK id (UUID)      |                                  
|   |    opp_code (UNQ) |  | FK user_id        |                                  
|   |    name           |  |    query_text     |                                  
|   | FK created_by     |  |    response_text  |                                  
|   +-------------------+  +-------------------+                                  
|                                                                                 
|   +-------------------+          +-------------------+                          
|   |  oracle_metadata  |<-------- |oracle_dependencies|                          
|   |-------------------|          |-------------------|                          
|   | PK id (UUID)      |          | PK id (UUID)      |                          
|   |    object_name    |          | FK source_id      |                          
|   |    object_type    |          | FK target_id      |                          
|   +---------^---------+          +-------------------+                          
|             |                                                                   
|             +-------------------------+                                         
|                                       |                                         
|   +-------------------+          +----+--------------+                          
|   |  dna_applications |<-------- |  dna_app_features |                          
|   |-------------------|          |-------------------|                          
|   | PK id (UUID)      |          | PK id (UUID)      |                          
|   |    app_code (UNQ) |          | FK app_id         |                          
|   |    app_name       |          |    feature_name   |                          
|   +-------------------+          +-------------------+                          
+---------------------------------------------------------------------------------+
```

### 1.1 SQL DDL Specifications

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'CREATOR', 'CONSUMER');
CREATE TYPE ingestion_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE oracle_object_type AS ENUM ('TABLE', 'VIEW', 'PROCEDURE', 'TRIGGER', 'COLUMN');
CREATE TYPE dependency_type AS ENUM ('FOREIGN_KEY', 'VIEW_REFERENCE', 'TRIGGER_REFERENCE', 'CALLS');
CREATE TYPE opportunity_source AS ENUM ('ORACLE_METADATA', 'DNA_APPLICATIONS', 'SUPPORT_TICKETS', 'RELEASE_NOTES', 'GENERAL');
CREATE TYPE opportunity_metric AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE opportunity_priority AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE opportunity_status AS ENUM ('BACKLOG', 'IN_PROGRESS', 'VALIDATING', 'COMPLETED');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CONSUMER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_hash VARCHAR(64) UNIQUE NOT NULL, -- Prevents processing duplicates
    author VARCHAR(255),
    status ingestion_status NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks Table (for relational traceability)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_content TEXT NOT NULL,
    token_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Oracle Metadata Table
CREATE TABLE oracle_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    object_name VARCHAR(255) NOT NULL,
    object_type oracle_object_type NOT NULL,
    owner VARCHAR(100) NOT NULL,
    schema_definition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oracle_object UNIQUE (owner, object_name, object_type)
);

-- 5. Oracle Dependencies Table
CREATE TABLE oracle_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_object_id UUID NOT NULL REFERENCES oracle_metadata(id) ON DELETE CASCADE,
    target_object_id UUID NOT NULL REFERENCES oracle_metadata(id) ON DELETE CASCADE,
    dep_type dependency_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dependency UNIQUE (source_object_id, target_object_id, dep_type)
);

-- 6. Core Banking Applications Table
CREATE TABLE dna_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_code VARCHAR(50) UNIQUE NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Core Banking Application Features Table
CREATE TABLE dna_app_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES dna_applications(id) ON DELETE CASCADE,
    feature_name VARCHAR(255) NOT NULL,
    feature_description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Product Opportunities Table (Innovation Pipeline)
CREATE TABLE innovation_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opp_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., OPP-001
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source_type opportunity_source NOT NULL,
    business_value opportunity_metric NOT NULL,
    complexity opportunity_metric NOT NULL,
    priority opportunity_priority NOT NULL,
    status opportunity_status NOT NULL DEFAULT 'BACKLOG',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Search Audit Logs Table (For AI Safety, Cost, Quality tracking)
CREATE TABLE search_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    response_latency_ms INT NOT NULL,
    relevance_score NUMERIC(5,4), -- Evaluated by Ragas (0.0000 to 1.0000)
    faithfulness_score NUMERIC(5,4),
    hallucination_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. User Feedback Table
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID NOT NULL REFERENCES search_audit_logs(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_doc_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX idx_oracle_dependencies_source ON oracle_dependencies(source_object_id);
CREATE INDEX idx_oracle_dependencies_target ON oracle_dependencies(target_object_id);
CREATE INDEX idx_dna_features_app_id ON dna_app_features(app_id);
CREATE INDEX idx_search_audit_user ON search_audit_logs(user_id);
```

---

## 2. Vector Database Design (Weaviate Schema)

Weaviate acts as our primary semantic memory layer. We define three main collections (equivalent to classes) for semantic vector queries.

### 2.1 Collection: `DocumentChunk`
Holds text blocks from documents to support the RAG knowledge retrieval flow.

*   **Distance Metric**: Cosine
*   **Vectorizer**: `none` (Injected directly by the Python ingestion script using `all-MiniLM-L6-v2` embeddings).

```json
{
  "class": "DocumentChunk",
  "description": "Represents semantic chunks extracted from uploaded documents.",
  "vectorIndexConfig": {
    "distance": "cosine",
    "efConstruction": 128,
    "maxConnections": 64
  },
  "properties": [
    {
      "name": "content",
      "dataType": ["text"],
      "description": "The textual body of the chunk",
      "tokenization": "word",
      "indexSearchable": true
    },
    {
      "name": "documentId",
      "dataType": ["string"],
      "description": "UUID referencing the relational database document ID",
      "indexFilterable": true
    },
    {
      "name": "fileName",
      "dataType": ["string"],
      "description": "Name of the source file for quick UI display",
      "indexFilterable": true
    },
    {
      "name": "chunkIndex",
      "dataType": ["int"],
      "description": "Sequential order index within the document"
    },
    {
      "name": "author",
      "dataType": ["string"],
      "description": "Document author if extracted"
    },
    {
      "name": "createdDate",
      "dataType": ["date"],
      "description": "Date metadata of the source file"
    }
  ]
}
```

### 2.2 Collection: `DnaAppFeature`
Stores feature profiles of the 400+ Core Banking Applications to support semantic overlap checks and gap analysis.

*   **Distance Metric**: Cosine

```json
{
  "class": "DnaAppFeature",
  "description": "Stores features of Core Banking applications for semantic comparison and overlap mapping.",
  "vectorIndexConfig": {
    "distance": "cosine"
  },
  "properties": [
    {
      "name": "featureName",
      "dataType": ["string"],
      "description": "Name of the application feature",
      "indexSearchable": true
    },
    {
      "name": "featureDescription",
      "dataType": ["text"],
      "description": "Long-form description of what the feature does",
      "tokenization": "word",
      "indexSearchable": true
    },
    {
      "name": "category",
      "dataType": ["string"],
      "description": "Classified domain category",
      "indexFilterable": true
    },
    {
      "name": "appName",
      "dataType": ["string"],
      "description": "Source application name"
    },
    {
      "name": "appCode",
      "dataType": ["string"],
      "description": "Source application code",
      "indexFilterable": true
    },
    {
      "name": "appId",
      "dataType": ["string"],
      "description": "UUID referencing the relational database application record"
    }
  ]
}
```

### 2.3 Collection: `OracleObjectMetadata`
Allows users to discover schemas conceptually (e.g., searching for "tables that manage customer invoicing details").

```json
{
  "class": "OracleObjectMetadata",
  "description": "Holds database metadata schema layouts for semantic schema queries.",
  "vectorIndexConfig": {
    "distance": "cosine"
  },
  "properties": [
    {
      "name": "objectName",
      "dataType": ["string"],
      "description": "Database object identifier",
      "indexSearchable": true
    },
    {
      "name": "objectType",
      "dataType": ["string"],
      "description": "TABLE, VIEW, PROCEDURE, TRIGGER, etc.",
      "indexFilterable": true
    },
    {
      "name": "schemaDefinition",
      "dataType": ["text"],
      "description": "DDL representation of the database schema structure"
    },
    {
      "name": "ownerSchema",
      "dataType": ["string"],
      "description": "Database schema owner (e.g. FIN_PROD)",
      "indexFilterable": true
    }
  ]
}
```
