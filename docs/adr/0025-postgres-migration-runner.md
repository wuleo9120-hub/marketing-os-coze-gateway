# ADR 0025: PostgreSQL Migration Runner

## Status

Accepted

## Context

The MVP currently persists data through the JSON Store Adapter. Production deployment needs PostgreSQL plus pgvector, but switching storage directly would make the system harder to verify and rollback. We need a small migration boundary that can inspect and apply schema changes before the SQL Store Adapter is enabled.

## Decision

Add a dependency-light migration runner using the local `psql` CLI:

- `apps/api/src/data/postgres-connection.mjs` owns PostgreSQL execution, timeout handling, and credential redaction.
- `apps/api/src/data/postgres-migrations.mjs` owns migration planning and application.
- `scripts/postgres-migrate.mjs --dry-run` is the default safe command.
- `scripts/postgres-migrate.mjs --apply` executes only when `DATABASE_URL` is configured.

The first migration is `infra/postgres/schema.sql` with id `0001_initial_schema`. Applied migrations are tracked in `schema_migrations`.

## Consequences

- The system can prepare a real database without adding npm dependencies.
- Secrets remain masked in command results and readiness output.
- The JSON adapter remains the default until the SQL Store Adapter methods are implemented.
- Future migrations should be added as explicit files or ids instead of mutating applied SQL silently.
