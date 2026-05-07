# ADR 0017: Local API Security

## Status

Accepted

## Context

The MVP exposes a local HTTP API for the web console and agent orchestration. Even when
the service binds to `127.0.0.1`, local browser pages and other local processes can try
to call write endpoints. Large request bodies can also exhaust memory.

## Decision

Harden the local API with default protections:

- bind to `127.0.0.1` by default,
- restrict write requests to local host origins,
- optionally require `LOCAL_API_WRITE_TOKEN` through `x-api-token`,
- reject JSON bodies larger than `MAX_JSON_BODY_BYTES` (default 1 MB),
- return `400` for invalid JSON instead of `500`,
- use no-store and nosniff response headers,
- prevent static file path traversal with resolved-path checks,
- redact secret-like values from JSON responses.

## Consequences

- The web console still works locally without extra setup.
- Setting `LOCAL_API_WRITE_TOKEN` enables a stronger local operator mode.
- Remote deployment must add real authentication, TLS, rate limiting, audit logs, and a
  production database before live customer or platform integrations are enabled.
