# 🔍 Break Detector

**Drop in any two versions of an API spec and instantly see what broke, what's risky, and what's safe.**

---

### Project Status: 🚧 Under Construction

Break Detector is an automated API compatibility and breaking change detection tool designed for modern API governance and CI/CD pipelines. It parses OpenAPI specifications, analyzes structural and semantic differences, classifies the impact of changes, and presents the results through an interactive web UI, API, or CLI.

---

## ✨ Features

- **OpenAPI 3.0 & 3.1 Diffing**: High-performance semantic comparison powered by a dedicated Rust engine.
- **Breaking Change Classification**: Categorizes modifications into breaking (fatal), risky (deprecations, loosened constraints), and safe (additive enhancements).
- **Interactive Diff Viewer**: Visual, side-by-side spec comparison and change inspector built with React and Tailwind CSS.
- **Admin Dashboard & API**: Server built in Go with templ and HTMX for admin views and REST endpoints for programmatic diffing.
- **CI/CD Ready**: First-class GitHub Action and standalone CLI for gating pull requests on breaking API changes.

---

## 🏛️ Architecture

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

For full architectural details and design decisions, see [docs/architecture.md](docs/architecture.md).

---

## 🧰 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Engine** | Rust (Edition 2024) | High-speed AST parsing and semantic diff computation |
| **Server** | Go 1.23, templ, HTMX | REST API, database storage, and lightweight server-rendered admin views |
| **Viewer** | React 19, TypeScript, Vite 6, Tailwind CSS | Standalone rich web viewer for interactive spec diffing |
| **Database** | PostgreSQL 16 | Persistent storage for spec versions, diff reports, and audit trails |
| **CI / Automation** | GitHub Actions, Docker | Containerized CI workflows and container builds |

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Make](https://www.gnu.org/software/make/) (optional)

### Running with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/tm3l/tm3l-break-detector.git
   cd break-detector
   ```

2. Start the services:
   ```bash
   docker compose up --build
   ```

3. Access the services:
   - **Admin Dashboard / API**: [http://localhost:8080](http://localhost:8080)
   - **Interactive Diff Viewer**: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Development & Makefile Commands

```bash
# Build the Rust diff engine
make build-engine

# Build the Go API server
make build-server

# Build the React viewer
make build-viewer

# Run all test suites
make test

# Start Docker environment
make docker-up

# Tear down Docker environment
make docker-down
```

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
