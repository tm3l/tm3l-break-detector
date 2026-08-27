# LOCAL.md (Local Model / DeepSeek / Llama Context)

This file contains concise instructions optimized for local coding models (DeepSeek-Coder, Llama-3, Qwen) operating in the TM3L repository.

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

## 🤖 Local Model Execution Rules
* **Token Conservation**: Keep code edits minimal and precise. Avoid generating redundant text or unnecessary explanations. Make single-file changes when possible.
* **Simplicity First**: Avoid complex nested logic. Write flat, clean functions with explicit error returns.
* **Dependency Constraints**: Use the standard library or existing modules in `go.mod` / `Cargo.toml`. Never generate or introduce new third-party dependencies without explicit user instruction.
* **State Management**: Keep context state clean; delete temporary build artifacts using `make clean`.
