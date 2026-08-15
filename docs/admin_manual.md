# FKIP Administrator Console Operations Manual

This operations guide is intended for system administrators managing the **FinXSystems Knowledge Intelligence Platform (FKIP)** deployment, auditing user permissions, and monitoring infrastructure health pulse metrics.

---

## 1. Administrator Authentication

* **Default Admin Account**:
  * Email: `admin@finxsystems.com`
  * Password: `password123`
  * Role: `ADMIN`
* Logging in with the `ADMIN` role unlocks the **Admin Console** in the sidebar navigation. Non-admin users attempting to access admin endpoints receive `403 Forbidden`.

---

## 2. User Management & Role Governance

Navigate to **Admin Console** (`/admin`) → **User Management**:
* **User Search & Listing**: Search registered users by email or name.
* **Role Modification**: Modify access levels dynamically:
  * `CONSUMER` (Viewer): Read-only search, DNA catalog browsing, and dashboard telemetry viewing.
  * `CREATOR` (Developer / BA): Document uploads, SQL Writer generation/execution, Oracle DDL imports, specification drafting, and innovation backlog creation.
  * `ADMIN` (Administrator): Full platform governance, user role modification, and infrastructure monitoring.

---

## 3. Infrastructure Health Monitoring

The **Infrastructure Pulse** dashboard (`GET /api/admin/monitoring`) performs live checks across all containerized services:

1. **PostgreSQL Relational DB**: Validates database connectivity, active transactions, and table row counts.
2. **Redis In-Memory Cache**: Verifies cache connectivity, ping latency, and memory utilization.
3. **Weaviate Vector DB**: Confirms vector search availability and object indexing status on port `8081`.
4. **Ollama AI Engine**: Confirms endpoint responsiveness on port `11434` and lists loaded inference models (`qwen2.5`, `llama3.1`, `mistral`, `gemma:2b`, `deepseek-r1`).
5. **Host CPU & Memory**: Tracks real-time CPU percentage and host RAM usage.

---

## 4. Search Log Audits & Analytics

Administrators have access to transaction-level audit logs under **Analytics & Reports** (`/reports`):
* **Query Latency Trends**: Monitors average inference processing durations across models and search queries.
* **Audit Registry Table**: Displays historical search entries, showing query text, synthesized response, latency in milliseconds, and hallucination flags.
* **User Feedback Ratings**: Averages 1–5 star ratings submitted by users to identify areas for knowledge base expansion.

---

## 5. Maintenance & Service Operations

### Restarting Services
If an individual container requires a restart, execute the corresponding Docker Compose command:
```bash
# Restart backend API server
docker compose restart fkip-backend

# Restart Ollama AI engine
docker compose restart fkip-ollama

# Restart Redis cache
docker compose restart fkip-redis
```

### Database Seeding & Reseeding
To reseed the platform with fresh demo data and specifications:
```bash
# Reseed fresh database and vector store
python scripts/reseed_fresh_data.py
```
