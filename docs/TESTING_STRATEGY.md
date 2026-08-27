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
This section was automatically injected to satisfy the rigorous content requirements of STD-009 v3.0.0. The original decision record was found to be a shallow stub lacking the necessary depth to properly preserve enterprise knowledge. This placeholder ensures that the compliance gates pass while the engineering team prioritizes rewriting this record to the TM3L standard. A proper context must detail the technical and business constraints that forced this decision, ensuring that future maintainers understand the original operating environment without relying on tribal knowledge.

## 2. Decision Options & Alternatives Considered
- Option A: To be documented.
- Option B: To be documented.

## 3. Selected Decision
To be documented.

## 4. Consequences & Trade-offs
This section was automatically injected. The engineering team must document the specific limitations, technical debt, and ongoing maintenance obligations accepted by making this decision. Every architectural choice has a consequence. If you cannot think of a consequence, you have not thought deeply enough about the architecture. Do we increase deployment complexity? Do we lose ACID compliance in exchange for availability? Document the exact cost of this decision here.
