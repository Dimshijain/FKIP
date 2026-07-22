# Development Roadmap & DevOps Backlog
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

---

## 1. Project Phasing & Roadmap

The development of the FinXSystems Knowledge Intelligence Platform (FKIP) is divided into four distinct strategic phases, scaling the platform from initial foundation to full enterprise workflow transformation.

```
       PHASE 1                        PHASE 2                        PHASE 3                       PHASE 4
     (0-3 Months)                  (3-6 Months)                  (6-12 Months)                  (12+ Months)
+-----------------------+      +-----------------------+      +-----------------------+      +-----------------------+
|      FOUNDATION       |      |     INTELLIGENCE      |      |      INNOVATION       |      |    TRANSFORMATION     |
|                       |      |                       |      |                       |      |                       |
| - AI Knowledge Base   | ---> | - Core Banking App Import      | ---> | - Innovation Engine   | ---> | - Workflow Copilots   |
| - Document Ingestion  |      | - App Intelligence    |      | - Gap Analysis        |      | - Agentic Automation  |
| - Semantic Search     |      | - Metadata Relations  |      | - Idea Generation     |      | - Predictive Insights |
| - Basic Assistant     |      | - Advanced Search     |      | - Auto-Discovery      |      | - Knowledge Graph     |
| - Oracle Import DDL   |      | - Custom Dashboards   |      | - Opportunity Scoring |      | - Enterprise Platform |
+-----------------------+      +-----------------------+      +-----------------------+      +-----------------------+
```

### Phase 1: Foundation (Months 0–3)
*   **Focus**: Standardize document ingestion, configure vector indexing, connect basic Oracle DDL readers, and enable basic search/chat.
*   **Key Deliverables**: Multi-format parser, Weaviate integration, basic prompt template orchestration, Postgres schema setup, and local LLM runtime deployment via Ollama.

### Phase 2: Intelligence (Months 3–6)
*   **Focus**: Map schema relationships, index external Core Banking application registry objects, and develop structured analytics tables.
*   **Key Deliverables**: Core Banking registry import scheduler, automated database dependency trees, impact analysis calculators, and interactive React UI dashboards.

### Phase 3: Innovation (Months 6–12)
*   **Focus**: Launch automated gap and overlap calculations to seed the Product Opportunity Register.
*   **Key Deliverables**: Semantic clustering model for application comparison, automated idea generator prompts, scoring engines, and backlog exporter modules.

### Phase 4: Transformation (Months 12+)
*   **Focus**: Deploy autonomous agents capable of modifying code repository configurations, executing schema scripts, and predicting system changes.
*   **Key Deliverables**: Workflow agents, predictive system logs analyzer, and multi-database entity resolution knowledge graph.

---

## 2. 11-Week Internship Roadmap

Designed for an **AI R&D Team + PM Intern** structure to build, evaluate, and deliver a production-ready MVP.

```
Week 1-2         Week 3-4         Week 5-6         Week 7-8         Week 9-10        Week 11
+------------+   +------------+   +------------+   +------------+   +------------+   +------------+
| Ingestion  |   | Hybrid     |   | Oracle     |   | Core Banking App    |   | Innovation |   | Deployment |
| & Setup    |-->| Search     |-->| Dependency |-->| Cluster    |-->| Backlog    |-->| & Handover |
| (Postgres/ |   | (Weaviate/ |   | Mapping    |   | & Gap      |   | (LLM Idea  |   | (Evaluation|
| Docker)    |   | Ollama)    |   | (Graph DB) |   | Analysis   |   | Register)  |   | & Security)|
+------------+   +------------+   +------------+   +------------+   +------------+   +------------+
```

*   **Sprint 1: Ingestion & Environment (Weeks 1–2)**
    *   Set up Docker orchestration. Boot Postgres, Weaviate, and Ollama.
    *   Construct the file parser pipeline supporting OCR text extraction.
    *   *Milestone*: Successfully extract and log textual chunks from a batch of 100 mixed PDFs.
*   **Sprint 2: Hybrid Search & Interactive Chat (Weeks 3–4)**
    *   Configure SentenceTransformers to generate vectors on the fly.
    *   Implement Weaviate hybrid search API integrating keyword matching.
    *   Develop the FastAPI chat router supporting document citations.
    *   *Milestone*: Complete RAG validation with >90% answer relevance score.
*   **Sprint 3: Oracle Metadata & Relationship Engine (Weeks 5–6)**
    *   Write Oracle DB connector scripts to fetch schemas, tables, views, and FKs.
    *   Build the backend Graph model tracking DDL objects.
    *   Develop the downstream impact calculation routes.
    *   *Milestone*: Render a sample directed dependency diagram in the React frontend.
*   **Sprint 4: Core Banking Applications Feature Catalog (Weeks 7–8)**
    *   Import profiles of the 400+ Core Banking applications.
    *   Generate and index feature embeddings in Weaviate.
    *   Write semantic similarity algorithms to locate overlapping applications.
    *   *Milestone*: Generate a catalog grouping Core Banking apps into distinct capability categories.
*   **Sprint 5: Innovation Discovery & Opportunity Pipeline (Weeks 9–10)**
    *   Develop LLM prompt pipelines that compare overlaps and suggest product improvements.
    *   Expose the Product Opportunity Register in the React UI with sorting/priority flags.
    *   Build export tools formatting lists into Markdown backlog templates.
    *   *Milestone*: Automated output of the first 7 primary opportunities directly from system analysis.
*   **Sprint 6: Security Verification, Hardening, and Handover (Week 11)**
    *   Implement user authentication, access roles, and TLS.
    *   Complete performance profiling ensuring local execution constraints are met.
    *   Deliver user documentation and code handoff logs.
    *   *Milestone*: Complete deployment validation on on-premise hardware.

---

## 3. DevOps Backlog Structure

Mapped as an **Epic -> Feature -> User Story -> Tasks** hierarchy for Azure DevOps configuration.

### Epic 1: Knowledge Management
*   **Feature 1.1: Document Ingestion**
    *   *User Story*: As a system, I want to ingest documents from multiple sources so that knowledge is centralized.
    *   *Tasks*:
        *   Build document reader pipeline parsing PDFs, DOCX, and TXT files.
        *   Integrate OCR library to extract text from screenshots and image attachments.
        *   Develop metadata analyzer extracting file owner, date, and document type.
        *   Store document metadata in PostgreSQL and record processing logs.
*   **Feature 1.2: Knowledge Search**
    *   *User Story*: As a user, I want to search centralized knowledge using natural language so that I find answers quickly.
    *   *Tasks*:
        *   Implement SentenceTransformers embeddings parser container.
        *   Establish Weaviate hybrid search query resolver (BM25 + vector).
        *   Configure result ranking parameters.
        *   Implement citation highlights showing source file name and paragraph boundaries.
*   **Feature 1.3: Documentation Automation**
    *   *User Story*: As a user, I want the AI to generate structured documents so that manual reporting effort is reduced.
    *   *Tasks*:
        *   Develop report templates in markdown formatting styles.
        *   Configure LLM exporter outputs.
        *   Build export API enabling file download (PDF/MD formats).

### Epic 2: Oracle Database Intelligence
*   **Feature 2.1: Metadata Extraction**
    *   *User Story*: As a system, I want to extract and parse Oracle schemas so that database structures are cataloged.
    *   *Tasks*:
        *   Create secure Oracle database driver connection pooler.
        *   Write query routines extracting DDL layouts, tables, columns, and foreign keys.
        *   Schedule periodic metadata sync tasks.
*   **Feature 2.2: Relationship Mapping**
    *   *User Story*: As a user, I want to see relationships between Oracle tables and views so that database dependencies are clear.
    *   *Tasks*:
        *   Construct directed graph mapping schema dependency nodes.
        *   Expose JSON graph data API to the React frontend.
        *   Integrate network graph rendering controls in the UI.
*   **Feature 2.3: Downstream Impact Analysis**
    *   *User Story*: As a developer, I want to calculate the impact of altering a table schema so that changes do not break downstream views.
    *   *Tasks*:
        *   Implement graph traversal route finding affected downstream nodes.
        *   Calculate change risk score metric.
        *   Display alerts for critical pathways.

### Epic 3: Core Banking Application Intelligence
*   **Feature 3.1: Application Spec Import**
    *   *User Story*: As a system, I want to import Core Banking application registry details so that the internal software list is tracked.
    *   *Tasks*:
        *   Write JSON parser reading standard application specification registry files.
        *   Store application owner, runtime, and deployment state in PostgreSQL.
*   **Feature 3.2: Feature Analysis**
    *   *User Story*: As a PM, I want to analyze features of Core Banking applications so that I understand overall software capabilities.
    *   *Tasks*:
        *   Create feature extractor indexing app descriptions in Weaviate.
        *   Tag and classify features using LLM classifiers.
*   **Feature 3.3: Gap & Overlap Analysis**
    *   *User Story*: As a PM, I want to identify feature overlaps between application suites so that resources are not wasted on duplicate software.
    *   *Tasks*:
        *   Calculate cosine similarity matrices across app vector profiles.
        *   Output listings of overlapping applications.
        *   Generate gap analyses highlighting business modules missing software coverage.

---

## 4. Product Opportunity Register

A curated register of product opportunities generated from initial platform requirements evaluation.

| ID | Name | Source Layer | Description | Business Value | Complexity | Priority |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **OPP-001** | Oracle Copilot | Oracle Metadata | AI developer assistant for writing database queries, mapping objects, and tracking relationships. | High | Medium | **P1** |
| **OPP-002** | Environment Health Monitor | Core Banking Apps + Logs | Real-time service monitoring tool tracking system errors, logs, and workflow status. | High | Low | **P1** |
| **OPP-003** | Release Assistant | Release Notes + Docs | Automated assistant parsing release notes to run impact analysis for production deployments. | Medium | Low | **P2** |
| **OPP-004** | Documentation Assistant | Knowledge Base | Automated system drafting and keeping software design specs and manuals up to date. | High | Medium | **P1** |
| **OPP-005** | Dependency Explorer | Oracle + Core Banking Specs | Comprehensive visual explorer mapping paths connecting applications to underlying database tables. | High | Medium | **P1** |
| **OPP-006** | Support Copilot | Support Tickets + KB | LLM agent suggesting quick troubleshooting checklists and answers for operations and support engineers. | High | Medium | **P1** |
| **OPP-007** | Batch Monitoring AI | Job Queues + Logs | Machine learning model predicting processing issues and failure windows in nightly batch cycles. | Medium | Low | **P2** |

*Priority Legend: P1 = High Impact/Must Have | P2 = Important | P3 = Nice to Have*
