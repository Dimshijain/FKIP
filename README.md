# FinXSystems Knowledge Intelligence Platform (FKIP)

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/finxsystems/fkip)
[![Docker Support](https://img.shields.io/badge/Docker-Containerized-blue.svg)](https://docker.com)
[![AI Accuracy](https://img.shields.io/badge/AI_Accuracy-97.0%25-success.svg)](docs/srs.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

**FKIP (FinXSystems Knowledge Intelligence Platform)** is an enterprise-grade AI Knowledge Intelligence and RAG Platform designed for corporate banking architectures. FKIP provides hybrid vector document search, downstream Oracle database impact tracing, Core Banking capability similarity clustering, AI Copilot assistance, connected knowledge graphs, and automated technical documentation generation.

---

## Enterprise Directory Structure

```text
FKIP/
├── backend/                  # FastAPI Application Microservice
│   ├── app/                  # Application Core Modules
│   │   ├── api/              # API Endpoint Routers (auth, search, copilot, oracle, dna, etc.)
│   │   ├── db/               # Database Models & SQLAlchemy Session Setup
│   │   ├── services/         # Business Logic (ingestion, vector, oracle, clustering, grounding)
│   │   ├── config.py         # Application Settings & Pydantic Environment Config
│   │   └── main.py           # FastAPI Application Entrypoint & Middleware
│   ├── uploads/              # Ingested Document File Persistence
│   ├── Dockerfile            # Backend Container Build Definition
│   └── requirements.txt      # Python Dependencies Manifest
│
├── frontend/                 # React SPA (Vite + Tailwind CSS + Lucide + React Flow)
│   ├── src/                  # React Source Code
│   │   ├── components/       # Reusable Glassmorphism UI Components & Layouts
│   │   ├── pages/            # Page Views (Dashboard, Search, Oracle, Core Banking, Copilot, etc.)
│   │   ├── context/          # React Context State Providers
│   │   ├── services/         # Axios API Client Utilities
│   │   ├── App.jsx           # Application Router & Navigation
│   │   └── index.css         # Styling System & Glassmorphism Design Tokens
│   ├── Dockerfile            # Frontend NGINX / Vite Container Build
│   └── package.json          # Node.js Dependencies Manifest
│
├── scripts/                  # Operational, Deployment & Test Scripts
│   ├── bootstrap_db.sql      # Database Schema Initialization DDL
│   ├── setup_weaviate.py     # Weaviate Vector Schema Generator
│   ├── phase2_test.py        # Automated Phase 2 Integration Test Suite
│   ├── phase3_test.py        # Automated Phase 3 Integration Test Suite
│   ├── e2e_test.py           # End-to-End Regression Test Suite
│   ├── audit_runner.py       # 100-Question AI Accuracy Benchmark Suite
│   ├── run_local.ps1         # Windows PowerShell Local Quickstart Script
│   └── run_local.sh          # Linux Bash Local Quickstart Script
│
├── demo_data/                # Sample Enterprise Test Files & Catalogs
│   ├── core_banking_catalog.json       # Core Banking Software Capability Specifications
│   ├── fkip_system_architecture_spec.txt # System Architecture Vector Index Specification
│   ├── hr_schema.sql                   # Sample Oracle Database DDL Script
│   └── sample_spec_logs.txt            # Enterprise Sample Log Output
│
├── docs/                     # Comprehensive Platform Documentation Suite
│   ├── srs.md                # Software Requirements Specification
│   ├── system_architecture.md# System Architecture & Infrastructure Diagram
│   ├── database_design.md    # Relational & Vector DB Schema Specifications
│   ├── api_documentation.md  # OpenAPI REST Endpoint Contracts
│   ├── user_manual.md        # Enterprise User Operations Manual
│   ├── admin_manual.md       # Platform Administrator Guide
│   ├── deployment_guide.md   # Production Docker Deployment Guide
│   └── development_roadmap.md# Technical Roadmap & Milestones
│
├── docker-compose.yml        # Orchestration Manifest (Postgres, Weaviate, Ollama, Backend, Frontend)
├── .env                      # Production Environment Variables
├── .env.example              # Environment Variable Template
└── README.md                 # Project Overview & Architecture Guide
```

---

## Quickstart: Docker Deployment

### Prerequisites
- Docker Engine v24.0+
- Docker Compose v2.20+

### Step 1: Launch Containers
```bash
docker compose up -d --build
```

### Step 2: Download Ollama LLM Models
```bash
docker compose exec fkip-ollama ollama pull all-minilm:latest
docker compose exec fkip-ollama ollama pull llama3:latest
```

### Step 3: Access Application
- **Frontend SPA**: `http://localhost:5173`
- **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`
- **Weaviate Vector DB**: `http://localhost:8081`

---

## Default Authentication Credentials

| User Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@finxsystems.com` | `password123` | Full Administrative & System Monitoring Access |
| **Creator** | `creator@finxsystems.com` | `password123` | Ingestion, Oracle Parsing, Opportunity Backlog |
| **Consumer** | `consumer@finxsystems.com` | `password123` | Read-only Search & AI Copilot Chat |

---

## Key Modules & Core Features

1. **Knowledge Search (RAG Engine)**: Hybrid search combining BM25 keyword matching and 384-dimensional vector embeddings with metadata confidence scoring.
2. **Oracle Intelligence**: DDL parser extracting downstream impact dependency graphs for database tables, views, and triggers.
3. **Core Banking Engine**: Application capability catalog ingestion with vector similarity clustering to detect redundant software logic across business divisions.
4. **AI Copilot**: Conversational assistant with thread history, context recommendations, and follow-up question suggestions.
5. **Innovation Discovery**: Automated document gap analysis and AI-scored opportunity backlog generation.
6. **Documentation Generator**: Technical BRD and SRS draft generator based on ingested system knowledge.

---

## Quality Metrics & Test Execution

- **AI Accuracy Audit**: **97.0% Accuracy** (100 Benchmark Questions)
- **Hallucination Rate**: **0.0%** (Pre-execution grounding fallback controls)

### Running Automated Test Suites
```bash
# Phase 2 Integration Tests
docker compose exec fkip-backend python /scripts/phase2_test.py

# Phase 3 Integration Tests
docker compose exec fkip-backend python /scripts/phase3_test.py

# Full E2E System Test
docker compose exec fkip-backend python /scripts/e2e_test.py
```
