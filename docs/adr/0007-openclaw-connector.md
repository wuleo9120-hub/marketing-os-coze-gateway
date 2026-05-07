# ADR 0007: OpenClaw Connector

## Status

Accepted.

## Context

OpenClaw is intended to execute controlled external browser/tool workflows. These actions can touch platform accounts, publishing surfaces, and research pages, so they must remain sandboxed and approval-gated.

## Decision

Add an OpenClaw connector:

```text
apps/api/src/core/connectors/openclaw-connector.mjs
```

The connector supports:

- `getOpenClawStatus`
- `runOpenClawTask`

If `OPENCLAW_BASE_URL` is not configured, it returns a local stub result and does not operate a browser. If configured, it submits sandboxed tasks to the configured endpoint.

## API

```text
GET /api/openclaw/status
```

## Safety

- `openclaw_stub` is registered as L3.
- L3 tasks require approval before execution.
- Approved executions are recorded in `tool_calls`.
- No real account or platform action is executed in stub mode.

