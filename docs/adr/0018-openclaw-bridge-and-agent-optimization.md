# ADR 0018: OpenClaw Bridge And Agent Optimization Loop

## Status

Accepted

## Context

The marketing system has a connector contract for OpenClaw using HTTP endpoints:

- `GET /health`
- `POST /tasks`

The installed OpenClaw runtime exposes a local CLI and WebSocket gateway. The system
needs a narrow HTTP adapter so the connector can submit bounded, approval-gated tasks
without giving OpenClaw open-ended autonomy.

The system also needs an explicit self-optimization loop. Hermes/OpenClaw may discover
improvements, but those improvements must become structured recommendations, low-risk
experiments, and approval-gated changes.

## Decision

Add `apps/api/src/bridges/openclaw-http-bridge.mjs`.

The bridge:

- exposes `/health` and `/tasks`,
- probes OpenClaw through the installed CLI,
- defaults to dry-run task acceptance,
- returns AgentResult-shaped artifacts,
- requires `OPENCLAW_BRIDGE_AGENT_EXECUTION=true` before it attempts local agent CLI
  execution,
- keeps publishing, messaging, credential, and customer-contact actions behind the
  existing approval gates.

Add `agent-optimizer.mjs`.

The optimizer:

- reads tasks, approvals, tool calls, memories, knowledge, config, and governance usage,
- writes a strategy memory with diagnostics and recommendations,
- creates low-risk experiment hypotheses automatically,
- marks high-risk or account-affecting improvements as requiring approval.

## Consequences

- The main API can set `OPENCLAW_BASE_URL=http://127.0.0.1:9292`.
- OpenClaw can be connected without changing task-executor internals.
- Self-learning becomes an auditable optimization loop rather than uncontrolled
  self-modification.
- Production live automation still requires authenticated connectors, platform-specific
  permission boundaries, and audit logs.
