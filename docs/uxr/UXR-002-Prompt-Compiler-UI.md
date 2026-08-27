---
id: UXR-002
title: LLM Prompt Compiler UI Design
status: "ACCEPTED"
type: User Experience Record
authors:
  - Antigravity AI
  - TM3L Team
created: 2026-08-26
updated: 2026-08-26
depends_on:
  - UXR-001
tags: [ui, ux, prompt, markdown]
version: "1.0.0"
---

# UXR-002: LLM Prompt Compiler UI Design

## 1. Context & Purpose
This document extends the overarching design authority established in `UXR-001`. It dictates the user interface for the new "Prompt Compiler" feature, allowing users to generate optimized LLM compilation instructions.

## 2. Global Navigation
A third mode toggle will be added to the primary header:
- `[ CI/CD Monitor ]`
- `[ Interactive Sandbox ]`
- **`[ LLM Prompt Compiler ]`** (New)

## 3. Component Layout (Compiler Mode)
When the user switches to the LLM Prompt Compiler, the UI will render:
1. **Source Code Input:** A large, syntax-highlighted textarea for the user to paste their raw source code (e.g., Python, Go).
2. **Target Parameters (Checkboxes):** A form allowing the user to explicitly define what the LLM should generate:
   - `[ ] Generate Local CLI Build Commands`
   - `[ ] Generate Dockerfile`
   - `[ ] Generate GitHub Actions Pipeline`
3. **Action Button:** `[ Synthesize System Prompt ]`

## 4. Delivery & Export UX
When synthesis is complete, the resulting prompt will be displayed in a distinct, visually elevated Markdown viewer.
- The viewer must support raw text copying via a **"Copy to Clipboard"** button.
- A **"Download .md"** button must be provided to save the prompt locally.
- The aesthetic must strictly adhere to the Soft Cyberpunk/Hacker design system established in `UXR-001`.

## 2. Decision Options & Alternatives Considered
- Option A: Embed the Prompt Compiler inside the existing Interactive Sandbox mode.
- Option B: Create a distinct third global mode ("LLM Prompt Compiler") specifically tailored to code input and generation parameters.

## 3. Selected Decision
Option B. Creating a dedicated global mode ensures the UI remains uncluttered and the user's intent is clearly separated from governance and AST diff monitoring.

## 4. Consequences & Trade-offs
Adding a third mode to the top-level navigation requires users to understand the conceptual difference between the sandbox and the prompt compiler. Furthermore, supporting robust syntax highlighting in a large textarea introduces additional bundle size overhead (e.g., loading Monaco or similar editors).
