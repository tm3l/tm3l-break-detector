# Testing Strategy

## Core Principles
1. **No flaky tests.** Any flaky test must be quarantined or deleted immediately.
2. **Local parity.** Tests must run locally inside OrbStack/Docker with the exact same DB engine versions as production (PostgreSQL 17, PocketBase 0.25).
3. **Behavior over implementation.** Test the public API of a package, not the internal unexported state.

## Layers
- **Unit Tests**: Standard Go/Rust tests. No database connections. Fast.
- **Integration Tests**: Spin up ephemeral PostgreSQL/PocketBase instances (via Testcontainers or Compose). Test the actual database schema and queries.
- **End-to-End**: Playwright tests against the React frontend and Go API.
