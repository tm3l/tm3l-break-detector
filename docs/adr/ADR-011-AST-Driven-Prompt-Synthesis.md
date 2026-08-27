---
id: ADR-011
title: AST-Driven LLM Prompt Synthesis
status: "ACCEPTED"
type: Architecture Decision Record
authors:
  - Antigravity AI
  - TM3L Team
created: 2026-08-26
updated: 2026-08-26
tags: [architecture, rust, ast, llm]
version: "1.0.0"
---

# ADR-011: AST-Driven LLM Prompt Synthesis

## 1. Context
We need to provide compilation instructions for arbitrary user code. Executing arbitrary code or running heavy compilation toolchains (e.g., GCC, PyInstaller) on the TM3L Go servers introduces severe security vulnerabilities and bloats the container footprint.

## 2. Decision
We will NOT build a compilation engine. We will build a **Prompt Synthesis Engine**.
1. **Static Analysis over Execution:** The Rust engine will parse the incoming source code into an Abstract Syntax Tree (AST) using `tree-sitter`.
2. **Fact Extraction:** Rust will traverse the AST to extract imports, system calls, and syntax versions.
3. **Template Injection:** The Go backend will receive these extracted facts and inject them into a rigorous Prompt Template.

## 3. Consequences
- **Positive:** Zero remote-code-execution (RCE) risk. The TM3L servers never execute the user's code.
- **Positive:** Infinite scalability. We offload the actual compilation logic and heavy lifting to the user's local machine and their chosen LLM provider.
- **Negative:** The user still has to manually run the final commands, meaning the UX is not fully automated ("push button compile"). However, this trade-off is acceptable for an enterprise governance tool where humans must remain in the loop.

## 4. Architectural Visualizations

To establish TM3L Platform Law and explicitly mandate our security posture, this diagram contrasts the extreme risk of remote code execution against our zero-risk static analysis pipeline. By refusing to execute untrusted code and instead utilizing Rust for read-only AST traversal, we achieve infinite scalability and perfect isolation.

```mermaid
flowchart TD
    %% Styling
    classDef danger fill:#ffcccc,stroke:#ff0000,stroke-width:2px;
    classDef safe fill:#ccffcc,stroke:#00aa00,stroke-width:2px;
    classDef core fill:#00ADD8,stroke:#fff,stroke-width:2px,color:#fff;
    classDef rust fill:#DEA584,stroke:#fff,stroke-width:2px,color:#1a1a1a;
    
    UserCode([Untrusted User Source Code])
    
    subgraph RejectedPattern["Rejected: Cloud Execution (High Risk)"]
        direction TB
        Compiler["Cloud Compiler / VM"]:::danger
        RCE["Remote Code Execution Vulnerability!"]:::danger
        Compiler -.-> RCE
    end
    
    subgraph ApprovedPattern["Approved: Static AST Analysis (Zero RCE Risk)"]
        direction TB
        Rust["Rust Engine (tree-sitter)
Read-only AST Parsing"]:::rust
        Facts["Extracted Facts
(Imports, Types, OS)"]
        Go["Go Template Engine
(Prompt Injection)"]:::core
        
        Rust -->|Outputs| Facts
        Facts -->|Injects into| Go
    end
    
    UserCode -.->|Blocked| RejectedPattern
    UserCode -->|Safe Read| Rust
    
    Output([Optimized Markdown Prompt]):::safe
    Go --> Output
```
