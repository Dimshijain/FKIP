# FinXSystems Knowledge Intelligence Platform (FKIP)

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/Dimshijain/FKIP)
[![Docker Support](https://img.shields.io/badge/Docker-Containerized-blue.svg)](https://docker.com)
[![Automated Tests](https://img.shields.io/badge/Pytest-81%20Passed-success.svg)](docs/testing/test_report.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

**FKIP (FinXSystems Knowledge Intelligence Platform)** is an enterprise-grade AI Knowledge Intelligence, RAG, and Metadata Platform designed for corporate banking architectures. FKIP provides hybrid vector document search, downstream Oracle database change impact simulation, Core Banking capability similarity clustering, multi-model AI Copilot streaming assistance, an AI SQL Writer with safe execution guardrails, connected relational knowledge graphs, and automated technical documentation generation.

---

## Key Platform Capabilities

1. **Multi-Model AI Copilot**: Orchestrates inference across 5 local LLMs (`Qwen 2.5`, `Llama 3.1`, `Mistral 7B`, `Gemma 2B`, `DeepSeek R1`) with real-time Server-Sent Events (SSE) token streaming.
2. **AI SQL Writer & Guardrailed Execution**: Generates Oracle and PostgreSQL SQL from natural language prompts, formats code, explains execution plans, and enforces strict read-only execution guardrails.
3. **Oracle Database Intelligence**: Reverse-engineers Oracle SQL DDL scripts, extracts foreign keys, views, and triggers, and traces cascading downstream change impact with reference validity checks (`✓ Valid reference` vs `Broken reference risk`).
4. **Knowledge Search & RAG Assistant**: Hybrid search combining dense Weaviate vector similarity and sparse keyword search with strict citations and user feedback ratings.
5. **Core Banking DNA Catalog**: Catalogs 400+ internal software assets, groups capabilities using semantic clustering, and matches new feature proposals against the existing portfolio.
6. **Innovation Opportunities Pipeline**: Auto-detects architectural gaps and manages an opportunity backlog scored by Business Value, Complexity, and Priority.
7. **Relational Knowledge Graph**: Interactive visualizer mapping cross-entity links between documents, Oracle schemas, DNA apps, and opportunities.
8. **Technical Document Generator**: Generates enterprise documentation across 6 templates (BRD, SRS, Tech Design, API Docs, Release Notes, User Manual) with safe section appending.
9. **Executive Telemetry & Admin Console**: Real-time KPI dashboards, Redis caching with cache invalidation (`?refresh=true`), query latency trends, user role management, and container health monitoring.

---

## Enterprise Directory Structure

```text
FKIP/
├── backend/                  # FastAPI Application Microservice
│   ├── app/                  # Application Core Modules
│   │   ├── api/              # API Endpoint Routers (auth, search, copilot, oracle, dna, etc.)
│   │   ├── db/               # Database Models & SQLAlchemy Session Setup
│   │   ├── docs_seed/        # Core Seed Specifications for Ingestion
│   │   ├── services/         # Business Logic (RAG, cache, LLM, Oracle, vector)
│   │   ├── config.py         # Application Settings & Pydantic Environment Config
│   │   └── main.py           # FastAPI Application Entrypoint & Middleware
│   ├── Dockerfile            # Backend Container Build Definition
│   └── requirements.txt      # Python Dependencies Manifest
│
├── frontend/                 # React 18 Single Page Application (Vite + Glassmorphism UI)
│   ├── src/                  # React Source Code (Components, Pages, Context, Services)
│   ├── public/               # Static Public Assets
│   ├── Dockerfile            # Frontend Vite / Node Container Build
│   ├── package.json          # Node.js Dependencies Manifest
│   └── vite.config.js        # Vite Build Configuration
│
├── tests/                    # Consolidated Pytest Automated Test Suite (81 Tests)
│   ├── api/                  # 13 REST API Endpoint Test Modules (54 tests)
│   ├── security/             # Security, RBAC & SQL Guardrail Test Modules (13 tests)
│   ├── integration/          # Multi-Service Integration Test Modules (9 tests)
│   ├── performance/          # Performance Benchmark Modules (3 tests)
│   ├── e2e/                  # SPA Client Routing Test Modules (2 tests)
│   ├── fixtures/             # Centralized Mock Data & Auth Role Helpers
│   ├── conftest.py           # Pytest Session Fixtures & Base HTTP Client
│   └── run_all_tests.py      # Master Consolidated Test Suite Runner
│
├── scripts/                  # Operational, Seeding, and Verification Scripts
│   ├── verification/         # Standalone Live CLI Verification Utilities (11 scripts)
│   ├── audit_runner.py       # Automated AI Accuracy Audit Runner
│   ├── bootstrap_db.sql      # Database Schema Initialization DDL
│   ├── cleanup_demo.py       # Demo Data Purge Script
│   ├── e2e_test.py           # Standalone E2E System Test Script
│   ├── populate_demo_data.py # Demo Data Ingestion & Seeding Script
│   ├── reseed_fresh_data.py  # Full Database & Vector Reseed Utility
│   ├── run_local.ps1         # Windows PowerShell Local Quickstart Script
│   ├── run_local.sh          # Linux Bash Local Quickstart Script
│   └── setup_weaviate.py     # Weaviate Vector Schema Generator
│
├── demo_data/                # Sample Enterprise Specifications & Catalogs (16 files)
├── docs/                     # Comprehensive Platform Documentation Suite
│   ├── testing/              # Standardized Automated Testing Documentation
│   │   ├── test_case_inventory.md # 119-case test inventory matrix
│   │   ├── test_plan.md           # Test strategy & architecture plan
│   │   └── test_report.md         # Final test metrics & module coverage
│   ├── admin_manual.md       # Platform Administrator Guide
│   ├── api_documentation.md  # OpenAPI REST Endpoint Contracts
│   ├── database_design.md    # Relational & Vector DB Schema Specifications
│   ├── deployment_guide.md   # Production Docker Deployment Guide
│   ├── development_roadmap.md# Technical Roadmap & Milestones
│   ├── project_folder_structure.md # Directory Structure Specification
│   ├── srs.md                # Software Requirements Specification
│   ├── system_architecture.md# System Architecture & Infrastructure Diagram
│   └── user_manual.md        # Enterprise User Operations Manual
│
├── .vscode/                  # Shared IDE Configuration (`settings.json`)
├── docker-compose.yml        # Multi-Container Orchestration (Postgres, Redis, Weaviate, Ollama, Backend, Frontend)
├── .env.example              # Environment Variable Template (No Secrets)
├── .gitignore                # Standardized Git Ignore Rules
├── pytest.ini                # Pytest Configuration & Test Markers
└── README.md                 # Project Overview & Architecture Guide
```

---

## Quickstart: Docker Deployment

### Prerequisites
* Docker Engine v24.0+
* Docker Compose v2.20+

### Step 1: Launch Containers
```bash
docker compose up -d --build
```

### Step 2: Verify Container Health
```bash
docker compose ps
```
The stack launches 6 isolated services:
* `fkip-frontend`: React 18 SPA at `http://localhost:5173`
* `fkip-backend`: FastAPI backend at `http://localhost:8000` (API Docs at `/docs`)
* `fkip-postgres`: PostgreSQL database at `localhost:5432`
* `fkip-redis`: Redis in-memory cache at `localhost:6379`
* `fkip-weaviate`: Weaviate vector engine at `http://localhost:8081`
* `fkip-ollama`: Ollama AI model server at `http://localhost:11434`

---

## Automated Testing Suite

The repository includes an 81-test automated suite executed via Pytest:

```bash
# Run Master Test Suite (All 81 tests with categorized timing summary)
python tests/run_all_tests.py

# Run Individual Pytest Suites
python -m pytest tests/api/ -v
python -m pytest tests/security/ -v
python -m pytest tests/integration/ -v
python -m pytest tests/performance/ -v
python -m pytest tests/e2e/ -v

# Verify Frontend Production Build
cd frontend && npm run build
```

---

## Default Authentication Credentials

| User Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@finxsystems.com` | `password123` | Full administrative governance & monitoring |
| **Creator** | `creator@finxsystems.com` | `password123` | Upload docs, SQL writer, specs drafting, innovation |
| **Consumer** | `user@finxsystems.com` | `password123` | Read-only search and catalog exploration |

---

## Documentation Index

* [Software Requirements Specification (SRS)](docs/srs.md)
* [System Architecture Document](docs/system_architecture.md)
* [REST API Documentation Reference](docs/api_documentation.md)
* [Database Design Document](docs/database_design.md)
* [User Operations Manual](docs/user_manual.md)
* [Administrator Operations Manual](docs/admin_manual.md)
* [Production Deployment Guide](docs/deployment_guide.md)
* [Development Roadmap](docs/development_roadmap.md)
* [Project Folder Structure](docs/project_folder_structure.md)
* [Automated Test Case Inventory](docs/testing/test_case_inventory.md)
* [Automated Test Plan](docs/testing/test_plan.md)
* [Automated Test Execution Report](docs/testing/test_report.md)
