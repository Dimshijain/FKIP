# FKIP User Operations Manual

Welcome to the **FinXSystems Knowledge Intelligence Platform (FKIP)**. This user operations manual outlines page-by-page workflows, document ingestion protocols, and conversational intelligence parameters.

---

## 1. Authentication Portal

1. Open your browser and navigate to [http://localhost:5173/login](http://localhost:5173/login).
2. Input one of the default role-based account credentials:
   - **Creator Account** (Manage docs/schemas/gaps):
     * Email: `creator@finxsystems.com`
     * Password: `password123`
   - **Consumer Account** (Search/Browse-only):
     * Email: `consumer@finxsystems.com`
     * Password: `password123`
3. Click **Sign In** to navigate to the Executive Dashboard.

---

## 2. Knowledge Search & RAG Explorer

- Navigate to the **Knowledge Search** tab in the sidebar.
- **Hybrid Search**: Input keyword queries or questions (e.g., *"What is the port mapping for Weaviate?"*). The hybrid engine queries Weaviate to return text chunks with relevance score indices.
- **RAG Assistant**: In the chat panel on the right, converse with the AI. The assistant will answer using only the retrieved document context chunks and display clickable citation source cards under the reply.

---

## 3. Oracle Intelligence Portal

- Navigate to **Oracle Intelligence** in the sidebar.
- **DDL Parser**: Go to the **Upload DDL** modal, browse for a `.sql` schema script file, and click parse. The backend DDL compiler extracts constraints, primary/foreign keys, views, and trigger joins.
- **ER Diagram Visualizer**: Switch to the **ER Relationship Diagram** tab to explore a visual flow of database links.
- **Impact Trace Analysis**: Choose any table in the catalog (e.g., `EMPLOYEES`) and click **Trace Impact**. The screen displays downstream tables, views, and database triggers that are affected by modifications to the selected object.

---

## 4. Core Banking Portal

- Navigate to **Core Banking Catalog** in the sidebar.
- **Application Ingestion**: Click upload to import a `.json` catalog list mapping software application specs and capability details.
- **Capability Redundancies**: Go to the **Capability Clustering Redundancy** tab. Adjust the similarity slider threshold (e.g. `0.75`). The vector model clusters duplicate or highly similar feature code routines across APP-CRM, APP-FIN, etc., identifying redundant logic.

---

## 5. AI Copilot Chat Workspace

- Navigate to **AI Copilot** in the sidebar.
- **Thread Management**: Create conversational context sessions (e.g., *"Audit Billing System"*).
- **Enriched Prompts**: Chat with Copilot. Behind the scenes, the query fetches semantic recommendations from documents, database joins, and app metadata, placing them inside the LLM prompt.
- **Suggestion Tags**: Click on any of the suggested follow-up questions at the bottom of the message logs to expand your query.

---

## 6. Relational Knowledge Graph

- Navigate to the **Knowledge Graph** visualizer.
- The canvas computes a circular cluster network mapping Documents, Oracle Schemas, Backlog Opportunities, and Core Banking Systems nodes.
- Filter by node types (e.g., click `DOCUMENT` to show only files).
- Click any node to drill down into characteristics, descriptions, and relations in the detail sidebar.

---

## 7. Document Spec Generator

- Navigate to **Doc Generator** in the sidebar.
- **Spec Architect**: Select a document template type (e.g., Software Requirement Specification, Business Requirement Document).
- Enter a title and click **Generate AI Document**. The system drafts a comprehensive spec incorporating active DB schemas and opportunities context.
- Preview the markdown code and click **Download .md** to save it locally.
