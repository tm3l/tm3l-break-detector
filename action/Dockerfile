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
COPY action/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

