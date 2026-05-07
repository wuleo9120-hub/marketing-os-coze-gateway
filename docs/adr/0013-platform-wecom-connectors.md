# ADR 0013: Platform And WeCom Connectors

## Status

Accepted.

## Context

The system can create publishing packages, record metrics, and handle CRM/customer-service flows. The next production boundary is external execution: platforms need publishing receipts and performance metrics, while Enterprise WeChat needs lead intake and customer messages.

These integrations touch real accounts and customers, so they must be connector-driven and approval-aware instead of being called directly from Agent prompts.

## Decision

Add two connector boundaries:

- `platform-connector`: submits publishing jobs, stores platform responses, and normalizes metric sync into `performance_metrics`.
- `wecom-connector`: ingests Enterprise WeChat leads and routes customer messages through the existing AI customer-service workflow.

Both connectors support:

- stub mode when gateway URLs are absent,
- gateway mode when environment URLs are configured,
- structured return objects that can be stored or audited,
- no real external action in stub mode.

The API exposes:

```text
GET  /api/platforms/status
POST /api/platforms/publishing-jobs/:id/submit
POST /api/platforms/metrics/sync
GET  /api/wecom/status
POST /api/wecom/leads
POST /api/wecom/leads/:id/messages
```

## Consequences

Positive:

- Publishing jobs can now move from package creation into a platform execution boundary.
- Platform performance can flow back into strategy memory through the analytics layer.
- WeCom lead intake reuses CRM and customer-service logic instead of creating a separate customer path.

Tradeoffs:

- Stub mode creates simulated receipts and metrics, so production dashboards must clearly show connector mode.
- Live publishing still needs a stronger approval and credential model before real account actions are enabled.
- Real WeCom messaging will require webhook signature validation and idempotency keys.
