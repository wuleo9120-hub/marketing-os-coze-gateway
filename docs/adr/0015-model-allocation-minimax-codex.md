# ADR 0015: Model Allocation For MiniMax And Codex GPT-5.5

## Status

Accepted.

## Context

The system now needs two model lanes:

- MiniMax-M2.7 as a normal background API provider for high-throughput agents.
- Codex GPT-5.5 as a high-reasoning supervised lane for strategic work.

Codex GPT-5.5 in this workspace is not the same as an OpenAI API model key. It cannot be called by the background application unless a Codex gateway is explicitly provided.

Hermes and OpenClaw remain separate from model routing: Hermes is an agent runtime, and OpenClaw is a controlled external action executor.

## Decision

Add:

- `minimax-provider.mjs`
- `codex-supervised-provider.mjs`
- model route rules in `model-router.mjs`

Agent allocation:

- `orchestrator`: `codex_supervised` / GPT-5.5
- `brand_strategy`: `codex_supervised` / GPT-5.5
- `data_review`: `codex_supervised` / GPT-5.5
- `sales_assist`: `codex_supervised` / GPT-5.5
- `platform_research`: `minimax` / MiniMax-M2.7
- `content_creation`: `minimax` / MiniMax-M2.7
- `video_production`: `minimax` / MiniMax-M2.7
- `publishing_ops`: `minimax` / MiniMax-M2.7
- `customer_service`: `minimax` / MiniMax-M2.7

When `CODEX_GATEWAY_URL` is absent, `codex_supervised` creates a handoff artifact instead of pretending a background Codex call happened.

## Required Environment Variables

```text
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-M2.7
CODEX_GATEWAY_URL=
CODEX_GATEWAY_TOKEN=
CODEX_MODEL=gpt-5.5
```

`CODEX_GATEWAY_URL` is optional until a real gateway exists.

## Consequences

Positive:

- High-level strategic agents are kept on the strongest reasoning lane.
- High-frequency execution agents can run through MiniMax-M2.7.
- The system is honest about Codex GPT-5.5 availability.

Tradeoffs:

- Codex-supervised tasks are not fully automatic until a gateway exists.
- MiniMax output quality still needs prompt tuning and JSON validation hardening.
- Some `data_review` tasks may later split between daily MiniMax summaries and critical GPT-5.5 reviews.
