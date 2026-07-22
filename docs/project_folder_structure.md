# FKIP Project Folder Structure

This document details the enterprise directory structure of the **FinXSystems Knowledge Intelligence Platform (FKIP)** repository.

---

## Directory Tree Overview

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
│   │   ├── components/       # Reusable UI Components & Navigation Layouts
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

## Directory Responsibilities

### `/backend`
Contains the Python 3.11 FastAPI backend microservice application. All endpoints, DB models, vector search integration, and background ingestion tasks reside here.

### `/frontend`
Contains the React SPA frontend application built with Vite, Tailwind CSS, Lucide React icons, and Recharts. All user interfaces and interactive dashboards reside here.

### `/scripts`
Contains setup, operational, maintenance, database bootstrap, and automated test execution scripts.

### `/demo_data`
Contains sample data files, Oracle DDL scripts, system specifications, and JSON application catalogs used for testing and demonstration.

### `/docs`
Contains comprehensive technical documentation including SRS, system architecture diagrams, database schema designs, API contracts, deployment guides, user manuals, and admin guides.
