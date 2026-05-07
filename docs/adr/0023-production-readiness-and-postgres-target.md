# 0023 Production Readiness And Postgres Target

## Status

Accepted

## Context

The MVP now runs the core marketing loop locally using `data/dev-store.json`. That is useful for rapid iteration, but production use needs durable storage, merchant isolation, background workers, observability, authentication, cost controls, and a migration path for semantic memory.

## Decision

Add a production readiness layer:

```text
GET /api/production/readiness
```

The readiness check covers:

- PostgreSQL / pgvector
- Redis-backed job queue
- Object storage
- Operator auth
- Logs, metrics, and alerts
- Cost controls
- Multi-merchant isolation

Add a target PostgreSQL schema blueprint at:

```text
infra/postgres/schema.sql
```

The schema keeps the current local data model but makes `workspace_id` mandatory and adds vector columns for memory and knowledge chunks.

## Consequences

- The MVP remains runnable without external dependencies.
- Production gaps are visible in the UI and API.
- The next implementation step is a Store Adapter boundary, then a PostgreSQL implementation.
