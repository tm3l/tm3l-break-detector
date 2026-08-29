# Phase 1: ADR-014 Rust gRPC Microservice Refactor
- [x] 1. Define Protobuf (`proto/analyzer.proto`) and generate Go client bindings.
- [x] 2. Update `engine/` to be a `tonic` gRPC Server (modify `Cargo.toml`, `build.rs`, `src/main.rs`).
- [x] 3. Update Go Backend (`internal/analyzer/ast.go`) to use the gRPC client instead of `exec.Command`.
- [x] 4. Update Docker setup (`deploy/Dockerfile.engine`, `compose.yaml`) to run the Rust engine as an independent microservice container on port 50051.
