# ADR 0004: Approval Decision Flow

## Status

Accepted.

## Context

High-risk actions such as publishing, batch outreach, pricing, and customer contact must not execute automatically. The system already creates approval records for those tasks, but approvals need a decision path.

## Decision

Add approval decisions:

- `approved`: the related task can resume execution.
- `rejected`: the related task is marked rejected and will not run.

The HTTP API exposes:

```text
POST /api/approvals/:id/decision
```

The web console renders approve/reject controls for pending approvals.

## Consequences

- Low-risk tasks still execute automatically.
- High-risk tasks are resumable only after explicit approval.
- Rejected tasks are auditable and remain in the task board.
- Future OpenClaw and platform API execution can reuse this approval gate.

