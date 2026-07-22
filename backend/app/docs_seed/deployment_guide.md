# FKIP Production Deployment & Staging Guide

This document outlines deployment architectures, security hardening protocols, and operation scripts for staging and production hosting of the **FinXSystems Knowledge Intelligence Platform (FKIP)**.

---

## 1. System Topology Overview
In a production deployment, FKIP is hosted on a private cloud environment to ensure absolute compliance and data privacy. Services are separated as follows:

```
                      [ HTTPS Client (Browser) ]
                                  │
                                  ▼
                     [ Nginx Reverse Proxy / SSL ]
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼ (Port 5173)                                     ▼ (Port 8000)
    [ React SPA SPA ]                                [ FastAPI Backend ]
                                                           │
              ┌───────────────────┬────────────────────────┤
              ▼                   ▼                        ▼
      [ PostgreSQL ]       [ Weaviate DB ]        [ Ollama AI Engine ]
       (Port 5432)          (Port 8081)           (Port 11434 / GPU)
```

---

## 2. Production Security Hardening

### A. Environment Secret Management
- **Never check passwords or secret keys into source repositories.**
- Store secrets using secure environment vaults (e.g., HashiCorp Vault, AWS Secrets Manager, Azure Key Vault).
- **Required Staging Variables**:
  ```ini
  POSTGRES_USER=prod_admin_user
  POSTGRES_PASSWORD=secure_generated_database_password_101
  POSTGRES_DB=fkip_production
  SECRET_KEY=long_high_entropy_alphanumeric_jwt_signing_key_secret_256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
  ```

### B. JWT & Authentication Rotation
- Session tokens are signed using the **HS256** algorithm with a private secret key.
- Production access token expiry time must be restricted to **30 minutes** or less (`ACCESS_TOKEN_EXPIRE_MINUTES=30`).
- Implement cookie-based token refreshes or secure local storage practices in web browsers.

### C. Role-Based Access Control (RBAC) Enforcement
API endpoints enforce three role access tiers:
1. **CONSUMER** (Viewer): Allowed to read search queries and browse metrics. Restricted from uploads, deletions, gap discoveries, and specifications drafting.
2. **CREATOR** (Developer/Operator): Full access to upload documents, parse Oracle SQL databases, ingest Core Banking specification catalogs, run gap analysis, and generate blueprints.
3. **ADMIN** (Administrator): Access to system health telemetries, infrastructure status checks, database metrics, and user profile management logs.

### D. Reverse Proxy SSL Termination
SSL termination must be handled by Nginx before routing queries to the FastAPI container. Example `/etc/nginx/conf.d/fkip.conf` config:

```nginx
server {
    listen 443 ssl http2;
    server_name fkip.finxsystems.internal;

    ssl_certificate /etc/ssl/certs/fkip.crt;
    ssl_certificate_key /etc/ssl/private/fkip.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:5173; # Route to Frontend container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000/api; # Route to Backend API
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 3. Hardware Acceleration for local LLM (Ollama)
Running inference on CPU causes document auto-generation requests to run slowly (up to 120 seconds).
In production staging, deploy on a GPU-enabled node and pass the graphics hardware resource into Docker Compose:

```yaml
  fkip-ollama:
    image: ollama/ollama:latest
    container_name: fkip-ollama
    restart: always
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

---

## 4. Database Backups & Snapshots

### A. PostgreSQL Backups
Configure a cron job to perform nightly pg_dump exports:
```bash
docker exec -t fkip-postgres pg_dumpall -U fkip_user > /var/backups/fkip_db_$(date +%F).sql
```

### B. Weaviate Snapshots
To back up vector chunks indices, perform Weaviate backups utilizing the snapshot API endpoint:
```bash
curl -X POST \
  http://localhost:8081/v1/backups/local \
  -H 'Content-Type: application/json' \
  -d '{"id": "snapshot-backup-001"}'
```
