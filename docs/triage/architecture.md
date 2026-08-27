# Break Detector Architecture

Break Detector is an automated API compatibility and contract validation platform designed to detect breaking changes across OpenAPI specifications.

```
                    ┌─────────────────────────┐
                    │     OpenAPI Specs       │
                    │   (Base & Target v2)    │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │    Rust Diff Engine     │
                    │ (break-detector-engine) │
                    │   High-performance AST   │
                    │   semantic comparison   │
                    └───────────┬─────────────┘
                                │ JSON Report
                                ▼
                    ┌─────────────────────────┐
                    │      Go API Server      │
                    │   (cmd/server/main.go)  │
                    │  - REST API & Storage   │
                    │  - templ/HTMX Admin UI  │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   React Diff Viewer     │
                    │  (@tm3l/break-detector- │
                    │         viewer)         │
                    │  Interactive visualizer │
                    └─────────────────────────┘
```

---

## 🧩 Core Components

### 1. Rust Diff Engine (`engine/`)
The engine is a compiled, standalone Rust binary and library responsible for parsing and analyzing OpenAPI specifications:
- **AST Parsing**: Validates and transforms OpenAPI 3.0 / 3.1 definitions into a normalized internal schema representation.
- **Semantic Diffing**: Traverses endpoints, operations, path parameters, request bodies, query parameters, headers, responses, and schemas.
- **Impact Classification**:
  - 🔴 **Breaking**: Changes that break existing API consumers (e.g., removing an endpoint, adding required request fields, changing response schema types).
  - 🟡 **Risky**: Changes with potential behavioral side-effects (e.g., deprecations, loosened constraints, status code alterations).
  - 🟢 **Safe**: Non-breaking, backward-compatible additions (e.g., new optional parameters, new endpoints, new response status codes).
- **Output**: Generates structured, schema-compliant JSON diff summaries as well as formatted CLI/Markdown reports.

### 2. Go API Server (`server/`)
The server orchestrates API workflows, persistence, and admin interfaces:
- **Subprocess Bridge (`internal/engine`)**: Invokes the compiled Rust diff engine binary via standard I/O pipes for isolated, fault-tolerant execution.
- **REST API (`internal/api`)**: Exposes endpoints (`/api/v1/diff`, `/api/v1/specs`, `/api/v1/reports`) to ingest specifications and query historical diff results.
- **Persistence (`internal/store`)**: Connects to PostgreSQL to store spec versions, diff metadata, and CI run records.
- **Admin Dashboard (`internal/web`)**: Lightweight administrative screens powered by [templ](https://templ.guide) and [HTMX](https://htmx.org) for rapid spec management and audit tracking without client-side framework overhead.

### 3. React Interactive Diff Viewer (`viewer/`)
The viewer provides an intuitive, rich client experience for developers and API architects:
- **Side-by-Side & Unified Spec Views**: Visualizes side-by-side JSON/YAML diffs paired with rendered OpenAPI documentation.
- **Filterable Impact Tree**: Allows engineers to group and filter changes by severity (breaking vs. risky vs. safe), HTTP path, and tag.
- **Integration**: Communicates with the Go server over REST/JSON or runs standalone loaded with exported static diff payloads.

---

## 🔄 Inter-Component Communication

1. **Go Server ↔ Rust Engine**:
   - The Go backend manages execution using `os/exec`, piping JSON/YAML spec payloads into `stdin` of `break-detector-engine` and reading structured diff output from `stdout`.
   - Isolates CPU-intensive parsing and memory allocation from the web server runtime.

2. **React Viewer ↔ Go Server**:
   - Standard RESTful JSON communication over HTTP (`/api/v1/diff`).
   - Supports both on-demand asynchronous diff generation and retrieval of persisted reports.

3. **CI/CD Integration**:
   - The GitHub Action (`action/action.yml`) packages the Rust engine to evaluate pull request changes directly against the base branch, failing builds or commenting Markdown summaries on pull requests.
