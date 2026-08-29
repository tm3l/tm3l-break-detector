# GEMINI.md (Gemini / Google / Antigravity Agent Context)

This file contains system instructions, context mappings, and coding conventions optimized for Google Gemini, Vertex AI, and Antigravity agents operating in the TM3L repository.

## ⚠️ STRICT RULE: Agent Contract & Authority
Before performing any task, read and comply with [AGENTS.md](AGENTS.md).
* **Live Operations**: Strictly **READ_ONLY_OBSERVER**. Do not mutate live databases, apply Terraform/Kubernetes configs, or execute production deployments.
* **Repository Development**: You are authorized to generate and modify Go, Rust, React, and Python code, run tests locally, and scaffold decision records.

## 🛠️ CLI Commands & Verification
* Run compliance audits and verification tests: `make test` (runs the repository scanner `./scripts/audit_repo.sh`)
* Run formatting checks: `make lint`
* Clean compilation cache and temporary files: `make clean`

## 📦 Core Architecture & Tech Stack
* **Primary Role**: Abstract Syntax Tree (AST) parsing and breaking change detection engine.
* **Backend / Orchestration**: Go (1.23+). Statically compile (`CGO_ENABLED=0`) and use `log/slog` for structured logging.
* **Parsing Engine**: Rust (for memory-safe, high-performance AST diffing and codebase traversal).
* **Frontend (Viewer)**: React / TypeScript for visualizing code diffs and breaking change reports.
## 📄 TM3L Decision Lifecycle Taxonomy (STD-009)
Documentation in this repo is version-controlled and categorized under `docs/` using the 11-Tier Taxonomy:
* `adr` (Architecture), `bdr` (Business), `cdr` (Component), `edr` (Engineering), `ldr` (Legal), `mdr` (Model), `odr` (Operations), `pdr` (Product), `rfc` (RFCs), `sdr` (Security), `uxr` (User Experience).

### Document Rigor Requirements:
* Minimum body word count: **150 words** (strictly checked by `audit_repo.py`).
* Required sections: `## 1. Context & Problem Statement`, `## 2. Decision Options & Alternatives Considered`, `## 3. Selected Decision`, and `## 4. Consequences & Trade-offs`.
* `adr` and `pdr` documents **must** include a ````mermaid```` sequence or flowchart diagram.
* **No placeholders or stubs**: Do not write placeholder text. If information is missing, ask the user to explain the trade-offs first via an interactive alignment session ("grill me").

## 🤖 Gemini-Specific Execution Rules
* **XML Tag Wrapper Style**: Wrap key execution thoughts, reasoning steps, and outputs in clear, standard XML tags (e.g. `<reasoning>`, `<task_plan>`, `<diff_block>`) to leverage Gemini's structured output capability.
* **Leverage Long Context**: Gemini possesses a massive context window. Read full source files and cross-reference dependencies across the repository before implementing changes to guarantee architectural alignment.
* **Verify System Invariants**: Before concluding any task, always execute the local compliance auditor via `make test`. Ensure that all 10 standards (`STD-001` to `STD-010`) pass with a Platinum Quality Tier score.
