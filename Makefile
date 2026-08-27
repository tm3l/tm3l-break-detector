.PHONY: all build test lint run build-engine build-go test-viewer test-server

test-server:
	go test -v ./internal/...

test-viewer:
	cd viewer && npx playwright test



all: build

build: build-engine build-go

build-engine:
	cd engine && cargo build --release
	cp engine/target/release/break-detector-engine ./break-detector-engine

build-go:
	go build -o bin/server ./cmd/server

test:
	go test -v ./...
	cd engine && cargo test

lint:
	golangci-lint run

run: build
	./bin/server
