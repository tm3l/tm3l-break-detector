# CLAUDE.md (Claude Code Context)

This file provides system instructions and behavior rules optimized for Claude Code and Claude-based agents operating in the TM3L repository.

## ⚠️ STRICT RULE: Agent Contract & Authority
Before performing any task, read and comply with [AGENTS.md](AGENTS.md).
* **Live Operations**: Strictly **READ_ONLY_OBSERVER**. Do not mutate live databases, apply Terraform/Kubernetes configs, or execute production deployments.
* **Repository Development**: You are authorized to generate and modify Go, Rust, React, and Python code, run tests locally, and scaffold decision records.

## 🛠️ CLI Commands & Verification
* Run compliance audits and verification tests: `make test` (runs the repository scanner `./scripts/audit_repo.sh`)
* Run formatting checks: `make lint`
* Clean compilation cache and temporary files: `make clean`

## 📦 Core Architecture & Tech Stack
* **Backend**: Go (1.23+). Statically compile (`CGO_ENABLED=0`) and use `log/slog` for structured logging.
* **Frontend**: HTMX + React. Compile-time HTML via `templ`.
* **Database**: PostgreSQL storage. Database calls must run via type-safe generated queries using `sqlc` and `pgxpool`.
* **Polyglot Subsystems**: Rust for AST diffing (Break Detector) and memory-intensive traversal (Dep Radar). Python for LLM text analysis (Postmortem Machine).

## 📄 TM3L Decision Lifecycle Taxonomy (STD-009)
Documentation in this repo is version-controlled and categorized under `docs/` using the 11-Tier Taxonomy:
* `adr` (Architecture), `bdr` (Business), `cdr` (Component), `edr` (Engineering), `ldr` (Legal), `mdr` (Model), `odr` (Operations), `pdr` (Product), `rfc` (RFCs), `sdr` (Security), `uxr` (User Experience).

### Document Rigor Requirements:
* Minimum body word count: **150 words** (strictly checked by `audit_repo.py`).
* Required sections: `## 1. Context & Problem Statement`, `## 2. Decision Options & Alternatives Considered`, `## 3. Selected Decision`, and `## 4. Consequences & Trade-offs`.
* `adr` and `pdr` documents **must** include a ````mermaid```` sequence or flowchart diagram.
* **No placeholders or stubs**: Do not write placeholder text. If information is missing, ask the user to explain the trade-offs first via an interactive alignment session ("grill me").

## 🤖 Claude-Specific Execution Rules
* **Zero-Trust Secrets**: Never commit `.env` files, credentials, or embed API keys in code or decision records.
* **Test Isolation**: All test suites must run locally. Do not add hard dependencies on external cloud APIs without explicitly mocking them.
* **Analytical Reasoning**: Break down complex problems step-by-step. If architectural invariants conflict with the user request, pause execution and ask the human operator for direction.
