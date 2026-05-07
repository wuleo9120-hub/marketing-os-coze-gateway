# ADR 0010: Customer Service CRM

## Status

Accepted.

## Context

The original product goal includes customer inquiries, AI-guided qualification, contact capture, WeChat/WeCom follow-up, and human handoff when purchase intent is high.

## Decision

Add a local CRM/customer service layer:

- leads
- customer conversations
- sales handoffs

Implementation:

```text
apps/api/src/core/customer-service.mjs
apps/api/src/data/store.mjs
```

API:

```text
GET  /api/crm/leads
POST /api/crm/leads
GET  /api/crm/leads/:id/conversation
POST /api/crm/leads/:id/conversation
```

## Behavior

- Customer messages are stored.
- The AI service retrieves relevant knowledge.
- A grounded stub reply is generated.
- High-intent messages create a sales handoff.

## Future Upgrade

- Connect Enterprise WeChat / WeChat Customer Service APIs.
- Add human operator assignment.
- Add SLA, tags, lead source attribution, and full CRM timeline.
- Replace stub reply with model provider plus strict knowledge citations.

