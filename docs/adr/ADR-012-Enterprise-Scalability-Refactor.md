---
id: ADR-012
title: Enterprise Scalability & Security Refactor
status: "ACCEPTED"
type: Architecture Decision Record
authors:
  - Antigravity AI
  - TM3L Team
created: 2026-08-26
updated: 2026-08-26
tags: [architecture, scalability, security, go, webhooks]
version: "1.0.0"
---

# ADR-012: Enterprise Scalability & Security Refactor

## 1. Context & Identified Gaps
During a comprehensive architectural audit, four critical enterprise gaps were identified in the TM3L Break Detector's baseline implementation:
1. **Synchronous Execution Bottleneck:** The Go API blocks HTTP threads while waiting for the Rust AST engine, risking CPU/RAM exhaustion under high CI/CD load.
2. **Missing Loop Closure (Webhooks):** CI/CD pipelines hang indefinitely waiting for manual overrides because there is no mechanism to signal the pipeline to resume.
3. **SSE Broadcast Leak:** The Server-Sent Events broker broadcasts all alerts to all clients, lacking multi-tenant isolation by `project_id`.
4. **Lack of Non-Repudiation:** The Postgres ledger tracks that a break was overridden, but does not cryptographically record the identity of the specific human operator.

## 2. Architectural Decisions

### 2.1 Native Go Worker Pool (Async Queueing)
To resolve the synchronous bottleneck without bloating our infrastructure with external message brokers (e.g., Redis/Kafka), we will leverage native Go concurrency. 
- Incoming OpenAPI payloads will be saved to temporary storage.
- The request will be dispatched to a buffered Go Channel (`chan DiffJob`).
- The API will immediately return `202 Accepted`.
- A dedicated Goroutine Worker Pool will pull jobs from the channel and execute the Rust binaries asynchronously.

### 2.2 Webhook Dispatcher
When a manual override is approved via `POST /override`, the Go backend will asynchronously dispatch an HTTP POST request (Webhook) to the registered CI/CD provider (e.g., GitHub Actions `repository_dispatch`) to unblock the pipeline.

### 2.3 Topic-Based Pub/Sub (Multi-Tenant SSE)
The SSE Broker will be refactored from a global broadcast channel to a mapped Pub/Sub model (`map[string]map[chan]bool` keyed by `project_id`). The React UI must authenticate and subscribe only to its authorized project streams.

### 2.4 Cryptographic Non-Repudiation (JWT Ledger)
The `RequireJWT` middleware will inject the authenticated user's identity claims into the Go request context. The Postgres `diffs` table will be migrated to include an `overridden_by_user_id` column, which will be strictly populated during an override event.

## 3. Consequences
- **Positive:** The system can now handle massive CI/CD concurrency via the worker pool.
- **Positive:** Strict enterprise compliance is achieved via true multi-tenant data isolation and immutable non-repudiation.
- **Negative:** Increased complexity in the Go backend state management (handling goroutine lifecycles and channel memory leaks).

## 4. Architectural Visualizations

This macro-architecture diagram illustrates the convergence of the four distinct enterprise scalability and security upgrades. It maps the asynchronous lifecycle of a CI/CD diff request, from non-blocking worker pools to multi-tenant SSE delivery, and finally to cryptographically secure webhook unblocking.

```mermaid
flowchart TD
    %% Styling
    classDef ci fill:#f9a03f,stroke:#fff,stroke-width:2px,color:#fff;
    classDef core fill:#00ADD8,stroke:#fff,stroke-width:2px,color:#fff;
    classDef auth fill:#ccffcc,stroke:#00aa00,stroke-width:2px;
    classDef db fill:#336791,stroke:#fff,stroke-width:2px,color:#fff;
    
    CI([CI/CD Pipeline]):::ci
    React([React Dashboard]):::ci
    
    subgraph GoBackend["TM3L Go Backend (Enterprise Scale)"]
        direction TB
        Ingress["API Ingress"]:::core
        Channel{"Buffered Channel
(chan DiffJob)"}
        Workers["Goroutine Worker Pool
(Async Execution)"]:::core
        SSE["Topic-Based Pub/Sub
(Multi-Tenant SSE)"]:::core
        Override["POST /override
(RequireJWT Middleware)"]:::auth
        Webhook["Webhook Dispatcher"]:::core
    end
    
    PG[(PostgreSQL
Ledger & Non-Repudiation)]:::db
    
    %% Async Job Flow
    CI -->|Submit Diff| Ingress
    Ingress -->|202 Accepted| CI
    Ingress -->|Enqueue| Channel
    Channel -->|Consume| Workers
    Workers -->|Save Result| PG
    Workers -->|Broadcast to project_id| SSE
    SSE -.->|Real-time Alert| React
    
    %% Override Flow
    React -->|Approve (with JWT cookie)| Override
    Override -->|Verify Claim & Log user_id| PG
    Override -->|Trigger Resume| Webhook
    Webhook -->|HTTP POST| CI
```
