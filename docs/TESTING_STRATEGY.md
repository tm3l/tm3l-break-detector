# Testing Strategy

## Core Principles
1. **No flaky tests.** Any flaky test must be quarantined or deleted immediately.
2. **Local parity.** Tests must run locally inside OrbStack/Docker with the exact same DB engine versions as production (PostgreSQL 17, PocketBase 0.25).
3. **Behavior over implementation.** Test the public API of a package, not the internal unexported state.

## Layers
- **Unit Tests**: Standard Go/Rust tests. No database connections. Fast.
- **Integration Tests**: Spin up ephemeral PostgreSQL/PocketBase instances (via Testcontainers or Compose). Test the actual database schema and queries.
- **End-to-End**: Playwright tests against the React frontend and Go API.


## 1. Context & Problem Statement
To maintain high confidence in the TM3L Break Detector's deterministic parsing and governance workflows, a robust testing strategy is essential. Flaky tests, environment inconsistencies, and lack of clarity on testing boundaries compromise deployment reliability.

## 2. Decision Options & Alternatives Considered
- Option A: Rely primarily on manual testing and end-to-end (E2E) suites.
- Option B: Focus entirely on unit tests, mocking all external services like the database.
- Option C: Implement a multi-layered testing strategy (Unit, Integration, E2E) with strict rules against flaky tests and a requirement for local parity using Docker/OrbStack.

## 3. Selected Decision
Option C. We selected a multi-layered strategy prioritizing local parity and strict test quarantine protocols for flaky tests.

## 4. Consequences & Trade-offs
Running full integration and E2E tests locally requires more computing resources (e.g., running PostgreSQL and Playwright via Docker). It slows down the local test feedback loop slightly but guarantees that tests running locally will reliably pass in the CI/CD pipeline, preventing "works on my machine" issues.
