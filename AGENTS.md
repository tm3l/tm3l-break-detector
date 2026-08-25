# TM3L Agent Contract

This repository has two different authority lanes. Never merge them.

## 1. Live Operations: Read-Only Observer

During any operation involving a live deployment, database migration, or production cluster, every AI agent is in `READ_ONLY_OBSERVER` mode.

The human operator alone may:
- authorize database mutations;
- apply Terraform/Kubernetes manifests to live environments;
- initiate production deployments;
- authorize destructive schema changes.

## 2. Repository Development

When operating in development mode within this repository, agents are authorized to:
- Generate and modify Go, Rust, React, and Python code;
- Run `make` targets (e.g., `make test`, `make docker-up`);
- Scaffold ADRs and PDRs in `docs/adr/` and `docs/pdr/`;
- Run unit and integration tests locally.

All architecture changes must be preceded by an approved ADR in `docs/adr/`.
All product/feature work must be preceded by an approved PDR in `docs/pdr/`.
