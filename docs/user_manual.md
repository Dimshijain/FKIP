# FKIP User Operations Manual

Welcome to the **FinXSystems Knowledge Intelligence Platform (FKIP)**. This user manual provides step-by-step instructions for all platform workflows, AI tools, schema analyzers, and documentation generators.

---

## 1. Authentication Portal

1. Open your web browser and navigate to `http://localhost:5173/login`.
2. Enter your account credentials:
   * **Admin Account**: `admin@finxsystems.com` / `password123` (Full system governance & monitoring)
   * **Creator Account**: `creator@finxsystems.com` / `password123` (Upload docs, SQL generation, specifications drafting)
   * **Consumer Account**: `user@finxsystems.com` / `password123` (Search & read-only exploratory access)
3. Click **Sign In** to access your workspace.

---

## 2. Executive Dashboard (`/`)

* **KPI Telemetry Cards**: View active counts for indexed documents, chunks, Core Banking applications, Oracle objects, and AI queries.
* **System Health Pulse**: Monitor real-time status indicators for PostgreSQL, Redis, Weaviate, and Ollama.
* **Refresh Telemetry**: Click the **Refresh Telemetry** button in the top right to bypass Redis cache and compute fresh statistics.
* **Theme Switching**: Click the Sun/Moon icon in the top navigation bar to toggle between Dark Mode and Light Mode.

---

## 3. Multi-Model AI Copilot (`/copilot`)

* **Model Selection**: Switch between 5 local AI models via the model dropdown:
  * `Qwen 2.5` (Default technical reasoning)
  * `Llama 3.1` (Enterprise Meta model)
  * `Mistral 7B` (Concise low-latency model)
  * `Gemma 2B` (Lightweight quick response)
  * `DeepSeek R1` (Deep analytical reasoning)
* **Real-Time Streaming (SSE)**: Enter your prompt; responses stream incrementally in real-time.
* **Context Recommendations**: View related documents and schema objects automatically injected into the reasoning context.
* **Suggested Follow-Ups**: Click any suggested follow-up question badge below the AI response to continue the investigation.
* **Thread History**: Manage persistent conversation threads in the left sidebar.

---

## 4. Knowledge Search & RAG Assistant (`/search`)

* **Hybrid Search**: Enter natural language or keyword queries (e.g. *"core ledger transaction retry policy"*). The search engine ranks semantic vector and keyword matches.
* **Filtering**: Filter search results by document or score threshold.
* **Interactive RAG Chat**: Ask questions in the right-hand panel to receive synthesized answers grounded strictly in uploaded documents.
* **Source Citations**: Click citation badges to view the exact source file and text snippet.
* **Feedback Submission**: Rate answers with 1–5 stars and submit comments to help improve retrieval quality.

---

## 5. AI SQL Writer & Safe Execution (`/sql-writer`)

* **Schema Catalog Explorer**: Browse database tables, columns, data types, and primary keys in the left schema tree.
* **Natural Language Generation**: Enter a plain English prompt (e.g. *"Find all employees in the Finance department with salary > 50000"*), select dialect (**Oracle** or **PostgreSQL**), and click **Generate SQL**.
* **SQL Formatting**: Standardize query indentation and keywords with the **Format** button.
* **Explain Plan**: Click **Explain** to view an AI breakdown of table joins and query logic.
* **Safe Query Execution**: Click **Run Query** to execute read-only `SELECT` queries against the live database. (Destructive mutations like `DROP`, `DELETE`, `UPDATE`, `TRUNCATE` are blocked by security guardrails).
* **Export CSV**: Download executed query results as a CSV file.
* **Synthesize Documentation**: Click **Generate Tech Spec** to automatically draft a Markdown specification document from query telemetry.

---

## 6. Oracle Database Intelligence (`/oracle`)

* **Schema Objects**: Browse tables, views, triggers, and stored procedures.
* **DDL Upload**: Click **Upload DDL** to index `.sql` schema scripts.
* **Visual ER Diagram**: Switch to the **Visual ER Diagram** tab to view interactive entity-relationship flowcharts.
* **Change Impact Simulation**: Click **Trace Impact** on any table (e.g. `DEPARTMENTS`) to simulate downstream cascading dependencies:
  * Valid database references are marked with `✓ Valid reference`.
  * Unresolved or missing foreign keys are flagged with `Broken reference risk`.

---

## 7. Core Banking DNA Catalog (`/dna`)

* **Application Registry**: Explore 400+ internal Core Banking software applications, versions, platforms, and feature tags.
* **Semantic Capability Clustering**: Switch to the **Clusters** tab to view grouped feature clusters and locate redundant feature logic across applications.
* **Feature Matcher**: Input a proposed feature description to search for similar existing capabilities and avoid duplicate development.

---

## 8. Innovation Pipeline (`/opportunities`)

* **Opportunity Backlog**: Browse innovation ideas scored by **Business Value**, **Complexity**, and **Priority** (`P1`, `P2`, `P3`).
* **Add Opportunity**: Create new product backlog items and assign initial lifecycle status (`BACKLOG`, `IN_PROGRESS`, `VALIDATING`, `COMPLETED`).
* **AI Gap Analysis**: Select documents and click **Run Gap Analysis** to discover architectural gaps and auto-generate new innovation opportunities.

---

## 9. Relational Knowledge Graph (`/knowledge-graph`)

* **Cross-Entity Visualizer**: Explore connected nodes across Documents, Oracle Objects, Core Banking Apps, and Innovation Opportunities.
* **Entity Filtering**: Filter the canvas by entity type to focus on specific architectural domains.
* **Node Inspector**: Click any node to open the detail sidebar showing relationships, descriptions, and linked assets.

---

## 10. Technical Document Generator (`/docs-generator`)

* **Template Spec Generator**: Select an enterprise template type (`BRD`, `SRS`, `TECH_DESIGN`, `API_DOCS`, `RELEASE_NOTES`, `USER_MANUAL`), enter a title, and click **Generate Document**.
* **Custom Documents**: Write and save custom Markdown documentation.
* **Append to Document**: Safely append new sections to existing specifications without overwriting prior content.
* **Download Specification**: Download generated documents as `.md` files.

---

## 11. Analytics & Reports (`/reports`)

* **Executive Analytics**: Review query volume, average response latency, and document distributions.
* **Latency Trends Chart**: Track search response times over time.
* **Search Audit Logs**: Inspect historical queries, synthesized responses, and system latency metrics.

---

## 12. Admin Console (`/admin`)

*(Visible only to users with the `ADMIN` role)*
* **User Management**: Search registered users, view roles, and update account permissions (`ADMIN`, `CREATOR`, `CONSUMER`).
* **Infrastructure Pulse**: Monitor real-time health for PostgreSQL, Redis, Weaviate, Ollama, and host CPU/RAM utilization.
* **Database Statistics**: Inspect table sizes and record counts.
