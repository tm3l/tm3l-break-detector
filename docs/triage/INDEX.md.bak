# TM3L Break Detector — Master Specification & Architectural Index

Welcome to the central architectural documentation index for the **TM3L Break Detector** semantic API and code migration governance platform.

This repository adheres to **Specification-Driven Development (SDD)** with formal records governing every product, architectural, user experience, and operational decision.

---

## 📚 Master Documentation Taxonomy

```
docs/
├── adr/          # Architecture Decision Records (Technical System Architecture)
├── pdr/          # Product Design Records (Product Specs & Capabilities)
├── uxr/          # User Experience Records (UI/UX Hierarchy & Workflows)
├── openapi.yaml  # Formal OpenAPI 3.1 REST API Specification
├── RUNBOOK.md    # Operational Runbook & Disaster Recovery Procedures
├── STATUS.md     # Current Multi-Tier Implementation Status
└── TESTING_STRATEGY.md # Polyglot Testing Methodology
```

---

## 📑 Complete Document Directory

### 1. Architecture Decision Records (ADR)
* **[ADR-010: API Authentication & Governance](adr/ADR-010-api-authentication.md)** — Hybrid authentication model: API Key for CI pipelines and HttpOnly JWT for operator overrides.
* **[ADR-011: AST-Driven LLM Prompt Synthesis](adr/ADR-011-AST-Driven-Prompt-Synthesis.md)** — Deterministic static analysis pipeline decoupling prompt engineering from server-side compilation.
* **[ADR-012: Enterprise Scalability & Security Refactor](adr/ADR-012-Enterprise-Scalability-Refactor.md)** — Native Go channel worker pool, webhook dispatchers, multi-tenant SSE pub/sub, and cryptographic non-repudiation.

### 2. Product Design Records (PDR)
* **[PDR-001: Diff Explorer & CI/CD Governance](pdr/PDR-001-diff-explorer.md)** — Core product requirements for semantic contract diffing and pipeline enforcement.
* **[PDR-002: Deterministic Prompt Generator](pdr/PDR-002-Deterministic-Prompt-Generator.md)** — "Prompt Engineering as a Service" product definition and multi-target compilation synthesis.

### 3. User Experience Records (UXR)
* **[UXR-001: Diff Governance Dashboard UI/UX](uxr/UXR-001-diff-governance-dashboard.md)** — Soft Cyberpunk Command Center layout, live SSE streams, and dual-mode interactive sandbox.
* **[UXR-002: LLM Prompt Compiler UI Design](uxr/UXR-002-Prompt-Compiler-UI.md)** — 3rd tab specification with build-target toggles, syntax validation, and Markdown export.

### 4. Operations & Contracts
* **[OpenAPI 3.1 Specification](openapi.yaml)** — Definitive REST API contract for all server endpoints.
* **[Operational Runbook](RUNBOOK.md)** — Emergency diagnostics, port mappings, and database triage procedures.
* **[Implementation Status](STATUS.md)** — Verified multi-tier operational status and CI matrix.
* **[Testing Strategy](TESTING_STRATEGY.md)** — Polyglot testing strategy across Rust, Go, and React.
