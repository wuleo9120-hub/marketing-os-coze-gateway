# ADR 0026: Workspace Isolation

## Status

Accepted

## Context

The system needs to serve multiple merchants without mixing memories, content assets, leads, metrics, and knowledge documents. The MVP previously used one implicit `default` workspace.

## Decision

Introduce application-level `workspace_id` isolation as the first productionization step:

- `store.mjs` now keeps a `workspaces` registry.
- State-changing records are created with `workspace_id`.
- List and search methods default to `DEFAULT_WORKSPACE_ID` or `default`.
- API callers can select a workspace with `workspace_id` query parameter or `x-workspace-id` header.
- Merchant onboarding, knowledge search, content assets, leads, metrics, and first marketing plans are workspace-aware.
- Existing flows remain compatible because missing `workspace_id` still maps to `default`.

## Consequences

- Multiple merchants can now coexist in one local store without ordinary list/search leakage.
- PostgreSQL persistence stores the `workspaces` registry as part of state.
- This is not yet a full production security boundary. Production still needs operator auth, user-to-workspace authorization, database row-level policies or scoped repository queries, and connector credentials bound per workspace.
