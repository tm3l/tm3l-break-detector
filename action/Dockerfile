# Build Stage
FROM rust:1.83-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /app
COPY engine/Cargo.toml engine/Cargo.lock* ./
COPY engine/src ./src

RUN cargo build --release

# Runtime Stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/target/release/break-detector-engine /usr/local/bin/break-detector-engine

ENTRYPOINT ["/usr/local/bin/break-detector-engine"]
