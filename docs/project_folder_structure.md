# FKIP Project Folder Structure

This document details the enterprise directory structure of the **FinXSystems Knowledge Intelligence Platform (FKIP)** repository.

---

## Directory Tree Overview

```text
FKIP/
├── backend/                  # FastAPI Application Microservice
│   ├── app/                  # Application Core Modules
│   │   ├── api/              # API Endpoint Routers (auth, search, copilot, oracle, dna, etc.)
│   │   │   ├── admin.py
│   │   │   ├── auth.py
│   │   │   ├── copilot.py
│   │   │   ├── dna.py
│   │   │   ├── docs.py
│   │   │   ├── innovation.py
│   │   │   ├── knowledge_graph.py
│   │   │   ├── oracle.py
│   │   │   ├── reports.py
│   │   │   ├── search.py
│   │   │   └── sql_writer.py
│   │   ├── db/               # Database Models & SQLAlchemy Session Setup
│   │   │   ├── models.py
│   │   │   └── session.py
│   │   ├── docs_seed/        # Core Seed Specifications for Ingestion
│   │   ├── services/         # Business Logic (RAG, cache, LLM, Oracle, vector)
│   │   │   ├── cache.py
│   │   │   ├── clustering.py
│   │   │   ├── grounding.py
│   │   │   ├── ingestion.py
│   │   │   ├── llm_service.py
│   │   │   ├── oracle_service.py
│   │   │   └── vector.py
│   │   ├── config.py         # Application Settings & Pydantic Environment Config
│   │   └── main.py           # FastAPI Application Entrypoint & Middleware
│   ├── Dockerfile            # Backend Container Build Definition
│   └── requirements.txt      # Python Dependencies Manifest
│
├── frontend/                 # React 18 Single Page Application (Vite + Vanilla CSS)
│   ├── src/                  # React Source Code
│   │   ├── components/       # Reusable UI Components, Modals & Navigation Shell
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── PaginationControls.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SkeletonLoader.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   ├── ToastContext.jsx
│   │   │   └── TopNavbar.jsx
│   │   ├── context/          # React Context State Providers
│   │   ├── pages/            # Page Views
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AiCopilot.jsx
│   │   │   ├── AnalyticsReports.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DnaCatalog.jsx
│   │   │   ├── DocGenerator.jsx
│   │   │   ├── InnovationPipeline.jsx
│   │   │   ├── KnowledgeGraph.jsx
│   │   │   ├── KnowledgeSearch.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── OracleIntelligence.jsx
│   │   │   └── SqlWriter.jsx
│   │   ├── services/         # Axios / Fetch API Client Utilities (api.js)
│   │   ├── App.jsx           # Application Router & Layout Shell
│   │   └── index.css         # Styling System & Glassmorphism Design Tokens
│   ├── public/               # Static Public Assets
│   ├── Dockerfile            # Frontend Vite / Node Container Build
│   ├── package.json          # Node.js Dependencies Manifest
│   └── vite.config.js        # Vite Build Configuration
│
├── tests/                    # Consolidated Pytest Automated Test Suite
│   ├── api/                  # 13 REST API Endpoint Test Modules (54 tests)
│   │   ├── test_admin_api.py
│   │   ├── test_auth_api.py
│   │   ├── test_copilot_api.py
│   │   ├── test_dashboard_api.py
│   │   ├── test_dna_api.py
│   │   ├── test_doc_generator_api.py
│   │   ├── test_documents_api.py
│   │   ├── test_innovation_api.py
│   │   ├── test_knowledge_graph_api.py
│   │   ├── test_oracle_api.py
│   │   ├── test_reports_api.py
│   │   ├── test_search_api.py
│   │   └── test_sql_writer_api.py
│   ├── security/             # Security, RBAC & SQL Guardrails Suites (13 tests)
│   │   ├── test_auth_rbac_security.py
│   │   └── test_sql_guardrail_security.py
│   ├── integration/          # Multi-Service & Cross-Pipeline Integration Suites (9 tests)
│   │   ├── test_cache_service.py
│   │   ├── test_multi_model_copilot.py
│   │   ├── test_oracle_impact_simulation.py
│   │   ├── test_rag_ingestion_pipeline.py
│   │   ├── test_redis_cache_integration.py
│   │   └── test_sql_writer_workflow.py
│   ├── performance/          # Performance & Large Dataset Benchmark Suites (3 tests)
│   │   ├── test_large_dataset_performance.py
│   │   └── test_search_cache_benchmarks.py
│   ├── e2e/                  # SPA Client Routing Availability Suite (2 tests)
│   │   └── test_ui_workflows.py
│   ├── fixtures/             # Centralized Mock Data & Auth Role Helpers
│   │   ├── auth_fixtures.py
│   │   └── test_data.py
│   ├── conftest.py           # Pytest Session Fixtures & Base HTTP Client
│   └── run_all_tests.py      # Master Consolidated Test Suite Runner
│
├── scripts/                  # Operational, Seeding, and Verification Scripts
│   ├── verification/         # Standalone Live CLI Verification Utilities
│   │   ├── test_all_copilot_models.py
│   │   ├── test_doc_uniqueness.py
│   │   ├── test_format.py
│   │   ├── test_format_api.py
│   │   ├── test_oracle_impact.py
│   │   ├── test_phase2_performance.py
│   │   ├── test_search_chat_debug.py
│   │   ├── test_sql_workflow.py
│   │   ├── test_sql_writer.py
│   │   ├── test_validation_suite.py
│   │   └── validate_models.py
│   ├── audit_runner.py       # Automated AI Accuracy Audit Runner
│   ├── bootstrap_db.sql      # Database Schema Initialization DDL
│   ├── cleanup_demo.py       # Demo Data Purge Script
│   ├── e2e_test.py           # Standalone E2E System Test Script
│   ├── phase2_test.py        # Standalone Phase 2 Verification Script
│   ├── phase3_test.py        # Standalone Phase 3 Verification Script
│   ├── populate_demo_data.py # Demo Data Ingestion & Seeding Script
│   ├── reseed_fresh_data.py  # Full Database & Vector Reseed Utility
│   ├── run_accuracy_audit.py # LLM Accuracy Audit Benchmark Script
│   ├── run_local.ps1         # Windows PowerShell Local Quickstart Script
│   ├── run_local.sh          # Linux Bash Local Quickstart Script
│   └── setup_weaviate.py     # Weaviate Vector Schema Generator
│
├── demo_data/                # Sample Enterprise Test Files & Catalogs
│   ├── core_banking_catalog.json          # Core Banking Software Capability Specifications
│   ├── core_banking_schema.sql            # Core Banking Schema Definition
│   ├── customer_onboarding_process.txt    # Banking Process Specification
│   ├── enterprise_security_policy.txt     # Enterprise Security Policy Spec
│   ├── financial_reporting_architecture.txt# Financial Reporting Blueprint
│   ├── fkip_system_architecture_spec.txt  # System Architecture Specification
│   ├── high_throughput_tx_engine.txt      # Transaction Engine Specification
│   ├── hr_schema.sql                      # Oracle HR Database DDL Script
│   ├── international_payment_spec.txt     # Payment Rails Specification
│   ├── microservices_governance_doc.txt   # Microservices Governance Guidelines
│   ├── payment_gateway_integration.txt    # Payment Gateway Interface Blueprint
│   ├── retail_loan_servicing_spec.txt     # Loan Servicing System Blueprint
│   ├── risk_compliance_framework.txt      # Risk Compliance Architecture
│   ├── sample_banking_api_spec.txt        # Banking API Technical Specification
│   ├── sample_spec_logs.txt               # Sample Application Log Output
│   └── treasury_management_system.txt     # Treasury Management System Spec
│
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
├── .vscode/                  # Shared IDE Configuration
│   └── settings.json         # VSCode Pytest Discovery Settings
├── docker-compose.yml        # Multi-Container Orchestration (Postgres, Redis, Weaviate, Ollama, Backend, Frontend)
├── .env.example              # Environment Variable Template (No Secrets)
├── .gitignore                # Standardized Git Ignore Rules
├── pytest.ini                # Pytest Configuration & Test Markers
└── README.md                 # Project Overview & Architecture Guide
```

---

## Directory Responsibilities

### `/backend`
Contains the Python FastAPI backend microservice application. Implements all REST and SSE API routers, SQLAlchemy database models, background ingestion tasks, vector search adapters, Redis caching, Ollama multi-model inference orchestration, and Oracle schema dependency analysis.

### `/frontend`
Contains the React 18 Single Page Application (SPA) built with Vite, Vanilla CSS design tokens, Lucide React icons, and Recharts. Implements all 12 page views, navigation layout shell, toast alerts, theme switching, and interactive visual components.

### `/tests`
Contains the production-grade Pytest automated test framework organized into 5 layered test suites: API unit tests, security & guardrail tests, multi-service integration tests, performance/latency benchmarks, and E2E route accessibility tests.

### `/scripts`
Contains database bootstrap scripts, Weaviate initialization, demo data population utilities, quickstart scripts (`run_local.ps1`, `run_local.sh`), and the `scripts/verification/` directory housing standalone live CLI validation tools.

### `/demo_data`
Contains 16 active sample specifications, Oracle SQL DDL scripts, banking contracts, and JSON application catalogs used for testing, RAG ingestion, and demonstration.

### `/docs`
Contains comprehensive technical documentation including the Software Requirements Specification (SRS), system architecture, database design, API reference, user manual, administrator guide, deployment manual, development roadmap, and standardized test reports under `docs/testing/`.
