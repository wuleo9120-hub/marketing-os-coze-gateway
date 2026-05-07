# ADR 0027: Coze Frontend Gateway

## Status

Accepted

## Context

The built-in Marketing OS console exposes many operational panels and is useful for debugging, but it is too complex as a daily operator interface. Coze is better suited for conversational frontend workflows, while Marketing OS should retain control of data, memory, approvals, tool budgets, and external automation.

## Decision

Add a dedicated `/api/coze/*` gateway:

- Coze acts as the frontend bot/workflow/plugin layer.
- Marketing OS remains the backend operating system.
- Coze receives only curated low-risk tools.
- All Coze requests require `COZE_PLUGIN_ENABLED=true` and a valid `x-coze-token`.
- Coze requests are workspace-aware through `x-workspace-id` or `workspace_id`.
- High-risk actions stay behind Marketing OS approval and are not exposed through the Coze gateway.

## Consequences

- The operator can use a simpler Coze UI.
- The project keeps its own durable memory, governance, and execution records.
- Coze cannot directly trigger live publishing, personal WeChat messaging, Hermes, or OpenClaw.
- Public deployment must use HTTPS, a strong Coze token, and workspace-bound credentials before production use.
