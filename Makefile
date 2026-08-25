.PHONY: all build build-engine build-server build-viewer test test-engine test-server test-viewer docker-up docker-down clean

all: build

build: build-engine build-server build-viewer

build-engine:
	@echo "Building Rust diff engine..."
	cd engine && cargo build --release

build-server:
	@echo "Building Go API server..."
	cd server && go build -o bin/server cmd/server/main.go

build-viewer:
	@echo "Building React diff viewer..."
	cd viewer && npm install && npm run build

test: test-engine test-server test-viewer

test-engine:
	@echo "Running Rust engine tests..."
	cd engine && cargo test

test-server:
	@echo "Running Go server tests..."
	cd server && go test ./...

test-viewer:
	@echo "Running React viewer tests..."
	cd viewer && npm test --if-present

docker-up:
	@echo "Starting Docker Compose services..."
	docker compose up --build -d

docker-down:
	@echo "Stopping Docker Compose services..."
	docker compose down -v

clean:
	@echo "Cleaning build artifacts..."
	rm -rf engine/target server/bin viewer/dist
