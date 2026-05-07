# ADR 0006: Hermes Gateway Connector

## Status

Accepted.

## Context

Hermes Agent is intended to handle long-running, memory-oriented agent execution. The current environment may not have Hermes credentials or a running gateway yet.

## Decision

Add a Hermes connector:

```text
apps/api/src/core/connectors/hermes-gateway.mjs
```

The connector supports:

- `getHermesStatus`
- `runHermesTask`

If `HERMES_GATEWAY_URL` is not configured, the connector runs in stub mode and returns an AgentResult-shaped response. If configured, it calls the gateway over HTTP.

## API

```text
GET /api/hermes/status
```

## Consequences

- Hermes can be wired into the system before credentials are available.
- Tasks using `hermes_gateway` are auditable through tool calls.
- The executor can route selected Agent work to Hermes without changing the Orchestrator.
- Real gateway endpoints may need adjustment once the deployed Hermes gateway contract is finalized.

