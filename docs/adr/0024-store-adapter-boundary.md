# 0024 Store Adapter Boundary

## Status

Accepted

## Context

The MVP uses `data/dev-store.json` for local persistence. Production will need PostgreSQL and pgvector, but rewriting all business modules at once would be risky.

## Decision

Introduce a Store Adapter boundary.

Current implementation:

```text
apps/api/src/data/adapters/json-store-adapter.mjs
apps/api/src/data/adapters/store-adapter.mjs
apps/api/src/data/adapters/postgres-store-adapter.mjs
```

The existing `store.mjs` still exposes the same functions to the rest of the system, but loading, persisting, and store metadata now go through the adapter.

`STORE_ADAPTER=json` is the default. `STORE_ADAPTER=postgres` is intentionally protected by `ENABLE_POSTGRES_STORE_ADAPTER=true`. The PostgreSQL adapter now supports SQL-backed load/persist through `psql`, but it should be enabled only after migrations have been applied against the target database.

## Consequences

- Existing business modules do not change.
- Tests continue to use isolated `STORE_PATH` JSON files.
- PostgreSQL can be enabled behind the same boundary after migration verification.
- The next storage step is moving from whole-state transactional refresh to individual SQL repository methods and merchant-scoped queries.
