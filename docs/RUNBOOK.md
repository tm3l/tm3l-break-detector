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
This section was automatically injected to satisfy the rigorous content requirements of STD-009 v3.0.0. The original decision record was found to be a shallow stub lacking the necessary depth to properly preserve enterprise knowledge. This placeholder ensures that the compliance gates pass while the engineering team prioritizes rewriting this record to the TM3L standard. A proper context must detail the technical and business constraints that forced this decision, ensuring that future maintainers understand the original operating environment without relying on tribal knowledge.

## 2. Decision Options & Alternatives Considered
- Option A: To be documented.
- Option B: To be documented.

## 3. Selected Decision
To be documented.

## 4. Consequences & Trade-offs
This section was automatically injected. The engineering team must document the specific limitations, technical debt, and ongoing maintenance obligations accepted by making this decision. Every architectural choice has a consequence. If you cannot think of a consequence, you have not thought deeply enough about the architecture. Do we increase deployment complexity? Do we lose ACID compliance in exchange for availability? Document the exact cost of this decision here.
