# 0021 Platform Integration Readiness

## Status

Accepted

## Context

The system needs to move from simulated platform workflows to real merchant integrations, but the target platforms do not expose the same level of public API access. Douyin and WeCom have clearer official developer paths, while Xiaohongshu and WeChat Channels often require partner, mini-program, shop, service-provider, or manual publishing workflows.

## Decision

Add an integration readiness registry that records each platform's official path, required environment variables, acquisition steps, fallback paths, and source URLs.

Expose it through:

```text
GET /api/integrations/readiness
```

The frontend shows readiness in the operations console so the operator can see which interfaces are ready, which credentials are missing, and which substitute workflow should be used before official access is granted.

## Consequences

- Real integration work can progress one platform at a time.
- The system avoids unsafe browser automation that bypasses platform rules.
- OpenClaw remains an assisted execution layer for drafts and controlled tasks, not an uncontrolled publisher.
- WeCom can be prioritized for customer acquisition and handoff even before every content platform supports direct publishing.
