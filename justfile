# TM3L Break Detector — Polyglot Task Runner

set shell := ["bash", "-c"]

default:
	@just --list

up:
	./scripts/up.sh

down:
	./scripts/down.sh

restart:
	./scripts/restart.sh

logs:
	docker compose logs -f

health:
	./scripts/healthcheck.sh

preflight:
	./scripts/preflight.sh

gen-secrets:
	./scripts/generate-secrets.sh

test: test-engine test-server test-viewer
	@echo "All Break Detector test suites passed successfully."

test-engine:
	@echo "==> Running Rust Engine tests..."
	cd engine && cargo test

test-server:
	@echo "==> Running Go Server tests..."
	cd server && go test -v ./...

test-viewer:
	@echo "==> Building React Viewer..."
	cd viewer && npm run build

lint: lint-engine lint-server lint-viewer
	@echo "All Break Detector lint checks passed."

lint-engine:
	@echo "==> Linting Rust Engine..."
	cd engine && cargo fmt --check && cargo clippy --all-targets --all-features -- -D warnings

lint-server:
	@echo "==> Linting Go Server..."
	cd server && go vet ./...

lint-viewer:
	@echo "==> Typechecking React Viewer..."
	cd viewer && npx tsc -b --noEmit

build:
	@echo "==> Building Rust Engine..."
	cd engine && cargo build --release
	@echo "==> Building Go Server..."
	cd server && go build -o bin/server cmd/server/main.go
	@echo "==> Building Viewer UI..."
	cd viewer && npm run build
