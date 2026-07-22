# FKIP Administrator Console Operations Manual

This operations guide is intended for system administrators managing the **FinXSystems Knowledge Intelligence Platform (FKIP)** deployment, auditing search logs, and monitoring infrastructure health pulse metrics.

---

## 1. Administrator Authentication
- **Admin account**:
  * Email: `admin@finxsystems.com`
  * Password: `password123`
- Logging in as an **ADMIN** role enables the **Admin Console** link in the sidebar menu.

---

## 2. Infrastructure Health Monitoring

Navigate to the **Admin Console** (`/admin`). The screen queries live hardware states and connection handshakes:
1. **CPU & Memory Load**: Dials tracking current container resource usage percentages.
2. **PostgreSQL Health**: Confirms database connection and displays database size on disk in Megabytes (MB).
3. **Weaviate Health**: Validates vector indexing search response and counts current indexed objects.
4. **Ollama Health**: Confirms the local LLM endpoint is active and lists model types loaded inside the container memory.

---

## 3. Search Log Audits & Analytics

Administrators have access to transaction-level logs under the dashboard and `/reports` sections:
- **Search latency histograms**: Monitors average inference processing durations.
- **Average Relevance & Faithfulness Scores**: Visualizes LLM generation quality metrics to verify responses are grounded and clean.
- **Audit Registry logs table**: Lists historical search entries, showing:
  * Prompt query string.
  * Generated response.
  * Execution latency in milliseconds.
  * Hallucination indicators.
- **Top Queries Analysis**: Lists most frequently searched terms to locate popular knowledge gaps.

---

## 4. Troubleshooting & Maintenance

### Restarting Services
If a database connection fails or Ollama is unresponsive, restart individual services using Docker Compose:
```bash
# Restart backend API server
docker compose restart fkip-backend

# Restart Ollama AI engine
docker compose restart fkip-ollama
```

### Clearing Cache & Resetting Data
To purge all uploaded files, vector indexes, and chat sessions back to a clean state without destroying Postgres user tables:
1. Log in to the web app using `admin@finxsystems.com`.
2. Navigate to the **Admin Console**.
3. Under the **Maintenance** panel, click **Purge Indexed Knowledge & Reset Logs**. (Alternatively, run the database reset script under `./scripts/cleanup_demo.sql` inside PostgreSQL).
