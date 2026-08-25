# 🔍 tm3l-break-detector

> **Drop in any two versions of an API spec and instantly see what broke, what's risky, and what's safe.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.23-00ADD8.svg)](go.mod)
[![Rust Version](https://img.shields.io/badge/Rust-2024-F46623.svg)](engine/Cargo.toml)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](viewer/package.json)

---

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Architecture](#-architecture)
3. [Tech Stack](#-tech-stack)
4. [Getting Started](#-getting-started)
5. [Documentation](#-documentation)

---

## 🌟 Overview
Every engineering team has been burned by an API breaking change nobody caught. **Break Detector** is a semantic AST diffing engine that analyzes OpenAPI 3.0/3.1 specifications to instantly highlight breaking vs. additive changes. 

## 📊 Architecture

```mermaid
graph LR
    subgraph "Client Tier"
        UI[React 19 Diff Viewer]
        Admin[Go templ + HTMX Admin]
    end

    subgraph "API & Orchestration"
        Server[Go 1.23 API Server]
    end

    subgraph "Compute Engine"
        Rust[Rust AST Diff Engine]
    end

    subgraph "Data & Real-time"
        PG[(PostgreSQL 17)]
        
    end

    UI -- "JSON / REST" --> Server
    UI -- "SSE Subscriptions" --> Server
    Admin -- "HTML over the wire" --> Server
    Server -- "Subprocess / IPC" --> Rust
    Server -- "ACID Transactions" --> PG
    
```

## 🛠 Tech Stack
- **Engine**: Rust 2024 (Strict AST validation & semantic diffing)
- **API**: Go 1.23 + `templ` + `HTMX`
- **UI**: React 19 + TypeScript + Vite 6 + Tailwind CSS
- **Databases**: PostgreSQL 17 (Primary)

## 🚀 Getting Started
```bash
git clone https://github.com/tm3l/tm3l-break-detector.git
cd tm3l-break-detector
make docker-up
```
Visit `http://localhost:5173` for the interactive diff viewer.

## 📚 Documentation
See [`docs/architecture.md`](docs/architecture.md) for detailed internals.
