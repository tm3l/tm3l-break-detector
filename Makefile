.PHONY: db-up db-down test-engine test-api clean

db-up:
	@echo "Starting PostgreSQL (OrbStack/Docker)..."
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be healthy..."
	@sleep 3

db-down:
	@echo "Stopping Database..."
	docker compose down -v

test-engine:
	@echo "Running Rust engine tests..."
	cd engine && cargo test

test-api:
	@echo "Running Go server tests..."
	cd server && DATABASE_URL="postgres://tm3l_user:tm3l_password@localhost:5432/tm3l_break_detector?sslmode=disable" go test -v ./...

clean:
	@echo "Cleaning build artifacts..."
	rm -rf engine/target server/bin viewer/dist
