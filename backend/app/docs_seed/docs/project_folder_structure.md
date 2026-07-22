# Project Folder Structure Document
## Project: FinXSystems Knowledge Intelligence Platform (FKIP)

This document maps out the repository structure for the FinXSystems Knowledge Intelligence Platform (FKIP). It defines an enterprise-level Python, FastAPI, React (Vite), and Docker configuration.

---

## 1. Directory Tree Layout

```
fkip/
├── .github/                   # CI/CD Workflows
│   └── workflows/
│       └── build-test.yml
├── backend/                   # FastAPI Python Application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # Application initialization and middleware
│   │   ├── config.py          # Environment settings, DB/Ollama variables
│   │   ├── api/               # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # Login, logout, JWT authentication
│   │   │   ├── search.py      # Hybrid search and RAG assistant endpoint
│   │   │   ├── oracle.py      # Metadata extraction and impact analysis
│   │   │   ├── dna.py         # Core Banking application indexing and gap comparison
│   │   │   └── innovation.py  # Backlog management, idea pipeline CRUD
│   │   ├── services/          # Core algorithmic engine logic
│   │   │   ├── __init__.py
│   │   │   ├── ingestion.py   # OCR, splitting, text parsing
│   │   │   ├── vector.py      # Weaviate client and indexing actions
│   │   │   ├── oracle_graph.py# Dependency graph building, DFS/BFS calculations
│   │   │   └── innovation.py  # Clustering algorithms, LLM prompting engine
│   │   ├── db/                # Relational Database connection & schemas
│   │   │   ├── __init__.py
│   │   │   ├── session.py     # SQLAlchemy engine / session generator
│   │   │   ├── models.py      # Declarative ORM models (SQLAlchemy)
│   │   │   └── schemas.py     # Request/Response validation models (Pydantic)
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py     # Text cleaning, system helpers
│   ├── tests/                 # Unit & Integration Tests
│   │   ├── __init__.py
│   │   ├── test_ingestion.py
│   │   ├── test_search.py
│   │   └── test_oracle.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                  # React / Vite SPA Frontend
│   ├── public/                # Static assets (favicons, fonts)
│   ├── src/
│   │   ├── assets/            # CSS files, logo images
│   │   │   └── index.css      # Vanilla CSS core layout design
│   │   ├── components/        # Shared UI components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── NetworkGraph.jsx # D3/Cytoscape chart component
│   │   │   └── ChatWindow.jsx
│   │   ├── pages/             # Layout view controllers
│   │   │   ├── Dashboard.jsx
│   │   │   ├── KnowledgeSearch.jsx
│   │   │   ├── OracleIntelligence.jsx
│   │   │   ├── DnaIntelligence.jsx
│   │   │   └── OpportunityRegister.jsx
│   │   ├── services/          # Network API client layers
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
├── docs/                      # Enterprise Project Documentation
│   ├── srs.md                 # Software Requirements Specification
│   ├── system_architecture.md # Architecture Blueprints & Flows
│   ├── database_design.md     # Relational DDL & Vector collections
│   ├── project_folder_structure.md # (This file)
│   └── development_roadmap.md  # Backlog structure & 11-week roadmap
├── scripts/                   # Migration & Utility CLI scripts
│   ├── bootstrap_db.sql       # Seed tables, admin user, mock records
│   ├── setup_weaviate.py      # CLI tool to configure schemas in Weaviate
│   └── run_local.sh           # Script to launch the stack locally
├── docker-compose.yml         # Dev/Prod Orchestration Config
├── .env.example               # Example Configuration file
├── .gitignore
└── README.md                  # Project Entrypoint README
```

---

## 2. Description of Key Files & Components

### 2.1 Backend Layer (`/backend`)
*   **`app/main.py`**: The entrypoint for FastAPI. Initializes routers, configurations, CORS policies, and exception handlers.
*   **`app/api/`**: Contains the API routers. The endpoint design maps directly to requirements (e.g., `search.py` maps to RAG queries, `oracle.py` handles dependency trees and impact analysis calculations).
*   **`app/services/ingestion.py`**: Handles text parsing, calls local OCR when images/scans are detected, splits content, and prepares batches.
*   **`app/services/oracle_graph.py`**: Contains algorithms for evaluating database schemas, constructing graph data structures using Python libraries, and running pathfinding to detect downstream changes.
*   **`app/db/models.py`**: Defines the database schema mapped to SQLAlchemy classes (e.g., `User`, `Document`, `Opportunity`).
*   **`app/db/schemas.py`**: Declares Pydantic schemas used for type checks, coercion, and parsing incoming JSON requests.

### 2.2 Frontend Layer (`/frontend`)
*   **`src/assets/index.css`**: Holds the design system tokens, CSS variables, and layout overrides. Refrains from utility framework constraints.
*   **`src/components/NetworkGraph.jsx`**: Incorporates visualization runtimes (like D3 or Cytoscape) to render database dependency trees.
*   **`src/pages/`**: Standard React container pages mapping directly to the distinct user journey views (Search, Oracle, Core Banking, and Opportunity Register).

### 2.3 Scripting & Initializers (`/scripts`)
*   **`setup_weaviate.py`**: Executed during initialization to register schema definitions (e.g. `DocumentChunk`, `DnaAppFeature`) inside the Weaviate container, setting up custom metrics.
*   **`bootstrap_db.sql`**: Contains the DDL table definitions and seed records to start a local testing database immediately.
*   **`docker-compose.yml`**: Integrates Backend, Frontend, Postgres, Weaviate, and Ollama into a single-command deployable suite.
