# FKIP Production Deployment & Staging Guide

This document outlines deployment architectures, configuration setup, and operational commands for hosting the **FinXSystems Knowledge Intelligence Platform (FKIP)**.

---

## 1. System Topology Overview

FKIP is deployed on-premise in a containerized environment to ensure absolute compliance and data privacy. Services communicate across an internal Docker bridge network:

```text
                       [ HTTPS Client (Browser) ]
                                   │
                                   ▼
                      [ Reverse Proxy / Port 5173 ]
                                   │
          ┌────────────────────────┴────────────────────────┐
          ▼ (Port 5173)                                     ▼ (Port 8000)
    [ React SPA SPA ]                                [ FastAPI Backend ]
                                                           │
          ┌───────────────────┬───────────────────┬────────┴────────┐
          ▼                   ▼                   ▼                 ▼
   [ PostgreSQL ]       [ Redis Cache ]     [ Weaviate DB ]   [ Ollama AI Engine ]
    (Port 5432)          (Port 6379)         (Port 8081)      (Port 11434 / GPU)
```

---

## 2. Prerequisites & Environment Configuration

### Prerequisites
* **Docker Engine**: v24.0+
* **Docker Compose**: v2.20+
* **Node.js**: v18+ (for local frontend build verification)
* **Python**: v3.11+ (for local test suite execution)

### Environment File (`.env`)
Create `.env` in the repository root based on `.env.example`:
```ini
# Database Configuration
POSTGRES_USER=fkip_user
POSTGRES_PASSWORD=fkip_password
POSTGRES_DB=fkip_db
POSTGRES_HOST=fkip-postgres
POSTGRES_PORT=5432

# Redis Cache
REDIS_HOST=fkip-redis
REDIS_PORT=6379

# Vector DB
WEAVIATE_URL=http://fkip-weaviate:8080

# AI / LLM Engine
OLLAMA_BASE_URL=http://fkip-ollama:11434
DEFAULT_LLM_MODEL=qwen2.5:latest

# Security & JWT Secrets
SECRET_KEY=change_this_to_a_secure_random_secret_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

---

## 3. Deployment Steps

### Step 1: Launch Container Stack
```bash
# Build and start all 6 containers in detached mode
docker compose up -d --build
```

### Step 2: Verify Container Health
```bash
docker compose ps
```
Ensure the following 6 services are up:
* `fkip-backend`: FastAPI application on port `8000`
* `fkip-frontend`: React SPA on port `5173`
* `fkip-postgres`: PostgreSQL database on port `5432`
* `fkip-redis`: Redis cache on port `6379`
* `fkip-weaviate`: Weaviate vector engine on port `8081`
* `fkip-ollama`: Ollama AI model server on port `11434`

### Step 3: Populate Demo Data (Optional)
```bash
python scripts/populate_demo_data.py
```

---

## 4. Verification & Testing Commands

### Automated Test Suite Execution
```bash
# Run Master Test Suite (All 81 Pytest test cases)
python tests/run_all_tests.py

# Run Individual Pytest Suites
python -m pytest tests/api/ -v
python -m pytest tests/security/ -v
python -m pytest tests/integration/ -v
python -m pytest tests/performance/ -v
python -m pytest tests/e2e/ -v
```

### Frontend Production Build Verification
```bash
cd frontend
npm run build
```
Verify that the build outputs production assets to `dist/` with 0 errors.

---

## 5. Default Role Credentials

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@finxsystems.com` | `password123` | Full administrative governance & monitoring |
| **Creator** | `creator@finxsystems.com` | `password123` | Upload docs, SQL writer, specs drafting, innovation |
| **Consumer** | `user@finxsystems.com` | `password123` | Read-only search and catalog exploration |
