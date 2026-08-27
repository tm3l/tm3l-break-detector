---
id: UXR-001
title: Diff Governance Dashboard UI/UX
status: "ACCEPTED"
type: User Experience Record
authors:
  - Antigravity AI
  - TM3L Team
created: 2026-08-26
updated: 2026-08-26
depends_on:
  - PDR-001
  - ADR-010
tags: [ui, ux, dashboard, governance, cyberpunk]
version: "1.0.0"
---

# UXR-001: Diff Governance Dashboard UI/UX

## 1. Context & Purpose
This document defines the user interface layout, component hierarchy, and user journeys for the TM3L Break Detector governance dashboard. It serves as the absolute source of truth for front-end developers implementing the React UI.

## 2. Core User Journeys & Modes
The dashboard supports two distinct primary modes, toggleable by the user:

### Mode A: CI/CD Monitor (Passive)
The dashboard operates as a real-time **Command Center** listening to live Server-Sent Event (SSE) streams. Alerts appear instantly as CI/CD pipelines hit the backend, turning the dashboard RED globally to immediately flag a breaking API change.

### Mode B: Interactive Sandbox (Active)
A manual testing playground where developers can paste raw OpenAPI JSON/YAML directly into a dual-pane editor (Base Spec vs. Target Spec). Executing the diff allows engineers to test and validate their API changes against the semantic RFC rules *before* ever pushing code to CI.

## 3. Data Visualization
When the Rust AST engine emits a `raw_diff_payload`, the UI handles the data via a hybrid approach:
- **Default View (Flattened Alert Cards):** Each breaking change is rendered as a discrete, actionable card highlighting the exact path, the RFC citation, and the proposed fix. 
- **Drill-down View (Visual JSON Tree Explorer):** Users can toggle an optional "Expand JSON" button to open a syntax-highlighted, collapsible tree viewer to inspect the raw schema differences exactly where they occurred.

## 4. The Governance Workflow
When an operator chooses to unblock a CI/CD pipeline, the UX enforces rigorous governance.
- Clicking **"Acknowledge & Override"** triggers a strict modal form.
- The operator MUST provide a text-based justification note.
- The operator MUST check specific mandatory checkboxes confirming compliance.
- Only when all validations pass does the UI submit the authenticated JWT request to the backend.

## 5. Design System & Theming
By explicit design, the aesthetic will invoke a **Soft Cyberpunk / Modern Hacker** aesthetic.
- **Vibe:** A tongue-in-cheek blend of 90s hacker culture combined with sleek, highly polished modern developer tooling.
- **Styling:** Deep slate/charcoal backgrounds (`bg-[#0d1117]`), muted neon text (`text-emerald-400`, `cyan-400`, `rose-400`), monospaced fonts (`font-mono`), rounded borders, syntax-highlighted JSON, and custom scrollbars.
- This serves as a humorous juxtaposition to the highly advanced, rigid Rust AST semantic logic powering the backend.

## 2. Decision Options & Alternatives Considered
- Option A: A purely utilitarian, bootstrap-style interface optimized solely for density.
- Option B: A "Soft Cyberpunk / Modern Hacker" aesthetic with real-time SSE listening capabilities and drill-down JSON exploration.

## 3. Selected Decision
Option B. We opted for the "Soft Cyberpunk / Modern Hacker" theme to juxtapose the rigid backend logic while providing critical features like real-time CI/CD monitoring and interactive AST diff sandboxing.

## 4. Consequences & Trade-offs
The chosen aesthetic (dark mode, neon highlights, custom scrollbars) may not align with traditional corporate UI standards and could require slightly more CSS maintenance (via Tailwind). The dual-mode nature (Monitor vs Sandbox) also increases React state complexity.
