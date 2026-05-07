# ADR 0014: Runtime Config Registry

## Status

Accepted.

## Context

The system now has model providers, Hermes, OpenClaw, platform connectors, and WeCom connectors. Each integration needs credentials or gateway URLs, but business modules should not each invent their own configuration rules.

Secrets must not be written to the local JSON store or returned through API responses in plaintext.

## Decision

Add a runtime configuration registry:

```text
apps/api/src/core/config-registry.mjs
```

The registry defines integration config items, their environment variables, whether values are secrets, and which tools they unlock. It exposes:

- public status with masked secret values,
- internal runtime value lookup,
- configured/missing counts,
- tool-to-config mapping.

The API exposes:

```text
GET /api/config
```

Connectors and model routing now read from the registry instead of reading environment variables directly.

## Consequences

Positive:

- One place explains which credentials are needed for production.
- API and UI can show configuration readiness without leaking secrets.
- Tool Registry can align tool availability with runtime configuration.

Tradeoffs:

- Environment variables are still process-level settings; changing them requires restarting the service.
- A future production deployment should replace direct environment secrets with a secret manager.
- The current API is read-only by design; writing secrets through the UI is intentionally not supported yet.
