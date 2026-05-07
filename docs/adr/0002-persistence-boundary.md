# ADR 0002: Persistence Boundary

## Status

Accepted.

## Context

The system needs durable memory, tasks, approvals, and audit logs before real model providers are connected. A production database is not configured yet.

## Decision

Use a JSON-backed local store for the MVP and keep all business state access behind `apps/api/src/data/store.mjs`.

The production database contract is documented in:

```text
db/migrations/0001_core_schema.sql
```

## Consequences

- The MVP can persist user-provided memory and generated agent plans across restarts.
- Tests can use isolated temporary store files through `STORE_PATH`.
- PostgreSQL can replace the JSON implementation without changing the orchestrator or web app API.
- The JSON store is not safe for concurrent multi-process writes and is only for local development.

