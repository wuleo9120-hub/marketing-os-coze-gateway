# ADR 0003: Model Provider and Task Executor

## Status

Accepted.

## Context

The system needs to continue construction before real model credentials are configured. It also needs a stable interface for future OpenAI, Hermes, and other providers.

## Decision

Add two boundaries:

- Model Provider Adapter: `apps/api/src/core/providers`
- Task Executor: `apps/api/src/core/task-executor.mjs`

The executor runs queued low-risk tasks automatically. High-risk tasks are moved to approval instead of being executed.

## Current Behavior

- `stub` provider returns deterministic AgentResult-shaped output.
- `openai` provider is available behind `OPENAI_API_KEY`.
- If OpenAI execution fails and the route allows fallback, execution falls back to `stub`.
- L3/L4 tasks or tasks marked `approval_required` are not executed automatically.

## Consequences

- The system can keep building without API keys.
- Agent task execution is now testable.
- Future Hermes and OpenClaw connectors can use the same task and tool-call audit boundaries.

