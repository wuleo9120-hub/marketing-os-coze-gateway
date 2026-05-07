# ADR 0020: Demo Merchant Flow

## Status

Accepted

## Context

Before connecting real merchants, platform accounts, and customer channels, the system
needs realistic synthetic data to validate the end-to-end marketing loop.

## Decision

Add a demo merchant flow using the virtual merchant `云朵烘焙工作室`.

The flow creates:

- brand memory,
- approved knowledge documents,
- platform content assets,
- Douyin/Xiaohongshu/Video Account publishing packages,
- dry-run publishing receipts,
- synthetic platform metrics,
- customer leads,
- AI customer-service conversations,
- high-intent sales handoffs,
- strategy review memory,
- agent optimization memory,
- autonomous cycle memory.

The flow is available through:

```text
POST /api/demo/merchant-flow
node scripts/demo-merchant-flow.mjs
```

## Consequences

- The core marketing loop can be tested without real merchant data.
- The demo remains dry-run and does not publish, message real customers, or touch real
  platform accounts.
- Real merchant onboarding can replace this data source while preserving the same
  execution pipeline.
