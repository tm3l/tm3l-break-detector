# TM3L Break Detector — Operational Runbook & Disaster Recovery

## 1. Quick Start & Service Triage

```bash
# Check service health across DB, API, and UI
just health

# Inspect live container logs
just logs

# Restart the full stack cleanly
just restart
```

## 2. Port & Service Architecture

| Service | Container Name | Internal Port | Host Port | Protocol |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `break-detector-db` | 5432 | 5432 | PostgreSQL Wire |
| **Go Server** | `break-detector-server` | 8080 | 8081 | HTTP / SSE / REST |
| **React Viewer** | `break-detector-viewer` | 5173 | 5173 | HTTP / Vite HMR |

## 3. Incident Playbooks

### A. Database Connection Failures
1. Verify container status: `docker compose ps`
2. Test PostgreSQL ping: `docker compose exec break-detector-db pg_isready -U tm3l_user -d tm3l_break_detector`
3. If migrations are out of sync:
   ```bash
   docker compose exec -T break-detector-db psql -U tm3l_user -d tm3l_break_detector < server/migrations/001_initial_schema.sql
   docker compose exec -T break-detector-db psql -U tm3l_user -d tm3l_break_detector < server/migrations/002_add_gin_index.sql
   docker compose exec -T break-detector-db psql -U tm3l_user -d tm3l_break_detector < server/migrations/003_audit_ledger.sql
   ```

### B. Worker Pool Starvation / Stalled Diff Jobs
1. Check Go server stderr logs: `docker compose logs break-detector-server | grep -E "Engine failed|DB Error"`
2. Verify Rust engine binary execution:
   ```bash
   docker compose exec break-detector-server ./break-detector-engine --help
   ```

### C. SSE Broker Connection Drops
1. The React Viewer automatically attempts reconnection on stream interruptions.
2. Confirm the `/api/events?project_id=<id>` route returns `Content-Type: text/event-stream`.

## 4. Key Lifecycle & Token Rotation
- **JWT Secret**: Configured via `TM3L_JWT_SECRET`. Rotate by setting the variable in `.env` and running `just restart`.
- **CI Token**: Configured via `TM3L_CI_TOKEN`. Used by automated GitHub Actions pipelines.


## 1. Context & Problem Statement
Operational incidents require rapid triage and remediation. Without a standardized runbook, operators waste critical time attempting to diagnose database connection failures, worker starvation, or SSE connection drops. A centralized operational runbook is required to streamline disaster recovery.

## 2. Decision Options & Alternatives Considered
- Option A: Rely on tribal knowledge and ad-hoc troubleshooting during incidents.
- Option B: Store runbooks in an external service like Confluence.
- Option C: Embed a `RUNBOOK.md` directly into the repository, utilizing `just` commands for executable triage.

## 3. Selected Decision
Option C. We chose to embed `RUNBOOK.md` in the repository, making it highly accessible and actionable through predefined `just` commands.

## 4. Consequences & Trade-offs
Operators must ensure they are looking at the correct version of the runbook for their specific release tier. Keeping the runbook up-to-date as the architecture evolves requires strict documentation hygiene during code changes, but the immediate availability of recovery steps during an outage heavily outweighs this cost.
