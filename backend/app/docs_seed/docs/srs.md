# Software Requirements Specification (SRS)
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the **FinXSystems Knowledge Intelligence Platform (FKIP)**. FKIP is a secure, private, enterprise-grade AI-powered platform designed to centralize and synthesize knowledge across scattered documents, Oracle metadata, and 400+ internal Core Banking applications. It provides intelligent search capabilities, metadata dependency mapping, and automated innovation pipeline generation.

### 1.2 Scope
FKIP is built to eliminate information silos, reduce manual research overhead, and establish a continuous innovation pipeline for FinXSystems. The system integrates:
1.  **An Ingestion Pipeline** for unstructured documents (PDF, DOCX, TXT), release notes, user guides, screenshots, and workflows.
2.  **An Oracle Intelligence Engine** to parse DB schemas, analyze relationships/dependencies, and calculate the downstream impact of modifications.
3.  **A Core Banking Application Intelligence Engine** to analyze and categorize 400+ internal software assets, identifying functional gaps and overlapping features.
4.  **An Innovation Discovery Engine** to auto-detect automation opportunities and market gaps, generating structured ideas prioritized by business value and complexity.
5.  **A RAG-Powered Knowledge Assistant** utilizing hybrid search (dense semantic vectors + sparse keyword search) and a private LLM environment.

### 1.3 Definitions, Acronyms, and Abbreviations
*   **RAG**: Retrieval-Augmented Generation.
*   **Core Banking Application**: Internal FinXSystems applications (comprising over 400 distinct tools/platforms).
*   **OCR**: Optical Character Recognition.
*   **Vector DB**: Database optimized for storing and querying multi-dimensional vector embeddings (Weaviate).
*   **Ollama**: Local, private framework for running LLMs on-premise.
*   **Hybrid Search**: Combination of keyword-based BM25 search and dense vector semantic search.
*   **SRS**: Software Requirements Specification.
*   **RBAC**: Role-Based Access Control.

### 1.4 References
*   IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications.
*   FKIP Solution Architecture Blueprint.
*   FinXSystems Data Security & Governance Standard.

---

## 2. Overall Description

### 2.1 Product Perspective
FKIP operates as an independent, private-cloud application deployed on-premise. It interfaces with external enterprise data sources (file systems, database servers, application registries) and exposes a secure Web Dashboard and API Services for internal users (Product Managers, Business Analysts, DBAs, Developers, and Support Teams).

```
  +------------------+
  |  Data Sources    |  (Documents, Oracle DB, Core Banking App Metadata, Log Files)
  +--------+---------+
           | Ingestion
           v
  +------------------+
  |    FKIP Core     |  (Ingestion, Knowledge Repositories, Vector & Search Layer)
  +--------+---------+
           | Services & APIs
           v
  +------------------+
  |   Applications   |  (Web UI, Chat, API Services, Reports & Dashboards)
  +------------------+
```

### 2.2 Product Functions
The primary functions of the platform include:
1.  **Multi-Source File Ingestion**: Ingest and process documents, extracting text and metadata using OCR.
2.  **Oracle Database Schema Intelligence**: Reverse engineer Oracle schemas to analyze dependencies, map visual graphs of tables/views/triggers, and perform impact analysis.
3.  **Core Banking Application Feature Profiling**: Catalog Core Banking applications and extract, tag, and categorize features.
4.  **Interactive AI Knowledge Assistant**: Provide a chat interface for semantic search, document summarization, and interactive troubleshooting.
5.  **Innovation Opportunities Analysis**: Identify overlapping functionalities and gaps across the software landscape, suggesting automated development ideas.
6.  **Report & Documentation Automation**: Export intelligence data into technical specs, release notes, or process flows.

### 2.3 User Classes and Characteristics
*   **Product Manager (PM)**: Explores Core Banking applications, analyzes feature redundancies, and prioritizes innovation opportunities in the product backlog.
*   **Business Analyst (BA)**: Detects market gaps, analyzes process workflows, generates business cases, and coordinates roadmap planning.
*   **Database Administrator (DBA) & Developer**: Analyzes Oracle database metadata dependencies and performs impact calculations for database migrations or modifications.
*   **Support & Operations Engineer**: Uses the Knowledge Assistant to search release notes, user guides, and troubleshooting steps.
*   **Platform Administrator**: Manages role assignments, monitors system logs, schedules ingestion tasks, and oversees local model configurations.

### 2.4 Design and Implementation Constraints
*   **Deployment**: Must run entirely on-premise or within a Private Cloud environment (no external SaaS LLM API calls permitted).
*   **GPU Resources**: LLM inference (via Ollama) must fit within the client's allocated hardware (e.g., enterprise NVIDIA GPUs, minimal VRAM profiles).
*   **Scalability**: The system must scale to handle 400+ Core Banking applications, thousands of Oracle tables/metadata objects, and tens of thousands of PDF/DOCX pages.
*   **Open Source Foundations**: Built using Python, Weaviate, PostgreSQL, Docker, and Ollama.

### 2.5 Assumptions and Dependencies
*   **Data Availability**: FinXSystems provides access keys and read-only database connections for Oracle schemas and Core Banking application registries.
*   **Hardware Provisioning**: Adequate computing infrastructure (GPU/CPU/Storage) is set up for running local vectorization and LLM workloads.

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 Ingestion Layer (IL)
*   **IL-1: Multi-Format Support**: The system shall ingest PDF, DOCX, TXT, CSV, and image files (PNG/JPG).
*   **IL-2: Optical Character Recognition (OCR)**: The system shall perform OCR on screenshots and scanned PDF pages to extract textual content.
*   **IL-3: Metadata Extraction**: The system shall auto-extract file attributes (author, creation date, source system, file type) and construct tags.
*   **IL-4: Chunking & Splitting**: The system shall segment documents into configurable, semantic chunks (e.g., 500-1000 characters with 10% overlap) optimized for vector representation.
*   **IL-5: Validation Pipeline**: The system shall execute schema validation on ingested application JSONs/CSVs and log errors.

#### 3.1.2 Knowledge Repository (KR)
*   **KR-1: Relational Metadata Storage**: The system shall use PostgreSQL to maintain user accounts, system configuration, Core Banking application lists, and Oracle table schemas.
*   **KR-2: Unstructured Data Storage**: The system shall store raw files, document chunks, and OCR extracts in a secure object store or local filesystem directory.
*   **KR-3: Graph Relationships (Optional)**: The system shall support modeling hierarchical associations (such as app-to-database connections) using relational self-references or graph extensions.

#### 3.1.3 Vector & Search Layer (VSL)
*   **VSL-1: Vector Ingestion**: The system shall convert document chunks and metadata features into high-dimensional vector embeddings using a local transformer model (e.g., `all-MiniLM-L6-v2` or similar local model via Ollama/SentenceTransformers).
*   **VSL-2: Semantic Storage**: The system shall index vectors inside Weaviate.
*   **VSL-3: Hybrid Search Execution**: The system shall run hybrid queries combining dense vector search (semantic) and BM25 keywords (lexical) with adjustable weights.
*   **VSL-4: Citation Traceability**: The search output shall include source document references, page numbers, and snippet boundaries to verify answers.

#### 3.1.4 Intelligence Engine (IE)
*   **IE-1: Interactive Chat (RAG)**: The system shall generate contextual answers to user queries using a local LLM (e.g., Llama-3-8B-Instruct or Mistral-7B-Instruct via Ollama) augmented with retrieved knowledge.
*   **IE-2: Oracle Dependency Extraction**: The system shall analyze DDL and DB metadata to track dependencies between tables, views, stored procedures, and triggers.
*   **IE-3: Database Impact Analysis**: The system shall calculate the downstream risk score and affected objects when a target table or column is altered.
*   **IE-4: Core Banking Application Gap & Overlap Analysis**: The system shall run semantic clustering on Core Banking application descriptions to group them by capability, detecting overlapping features and unaddressed market needs.
*   **IE-5: Automated Idea Generation**: The system shall run LLM prompts to synthesize gap findings into actionable product suggestions (e.g., "Oracle Copilot", "Environment Health Monitor").
*   **IE-6: Opportunity Scoring**: The system shall score ideas based on Business Value (High/Medium/Low) and Complexity (High/Medium/Low).

#### 3.1.5 Application & User Interface Layer (AUL)
*   **AUL-1: Interactive Web Dashboard**: The system shall provide a responsive user interface with panels for Knowledge Search, Core Banking Explorer, Oracle Dependency Tree, and the Product Opportunity Register.
*   **AUL-2: Dynamic Visualizations**: The system shall display Oracle dependency structures using interactive tree or network graphs (e.g., Cytoscape.js, D3.js, or Mermaid).
*   **AUL-3: Document Export**: The system shall enable users to download generated ideas and technical specs in Markdown and PDF formats.

---

## 4. Non-Functional Requirements

### 4.1 System Performance & Ingestion Rates
*   **PER-1: Search Response Latency**: Semantic search and retrieval (prior to LLM generation) must return results within **1.5 seconds** under a concurrent load of 50 users.
*   **PER-2: Chat Generation Latency**: Chat responses from the local LLM must maintain a generation rate of at least **15 tokens per second**.
*   **PER-3: Document Ingestion Speed**: The ingestion pipeline must process and index standard PDF files at a rate of at least **30 pages per minute** (excluding OCR).
*   **PER-4: OCR Processing**: Screen/image OCR extraction must execute in under **5 seconds** per image.

### 4.2 AI Quality & Performance Metrics
*   **AI-1: Answer Relevance**: The RAG assistant must maintain an answer relevance score of **> 90%** (validated via Ragas/evaluation frameworks).
*   **AI-2: Faithfulness**: Generated responses must have a faithfulness score of **> 90%**, ensuring facts are strictly grounded in retrieved documents.
*   **AI-3: Knowledge Coverage**: The search engine must index and retrieve relevant blocks from **> 95%** of valid uploaded resources.
*   **AI-4: Hallucination Rate**: The hallucination rate must remain below **5%** by enforcing strict system prompts ("I do not know if the documents do not specify").
*   **AI-5: Idea Quality**: Automated product ideas must meet a relevance rating of **> 85%** as judged by domain experts.

### 4.3 Security & Compliance
*   **SEC-1: Role-Based Access Control (RBAC)**: The system shall enforce permissions distinguishing between Administrators, Creators (PMs/BAs/DBAs), and Consumers (Viewers).
*   **SEC-2: On-Premise Data Isolation**: All data, embeddings, and model weights must reside strictly inside the corporate network. No telemetry or query logs shall be sent to external networks.
*   **SEC-3: Cryptography**: All data at rest must be encrypted using AES-256. User sessions and network communications must run over TLS 1.3.
*   **SEC-4: Audit Trails**: The system must log security-critical events (login attempts, permission changes, database connections, bulk data export) in PostgreSQL with read-only permission constraints for application services.

### 4.4 Reliability, Availability, and Portability
*   **REL-1: Availability**: The platform shall maintain **99.5% uptime** during working hours (Monday to Friday, 07:00 to 20:00).
*   **REL-2: Dockerization**: The entire application stack (Frontend, Backend, Vector DB, Relational DB) must be packageable via Docker Compose to ensure portability across local dev environments and the target private cloud.
