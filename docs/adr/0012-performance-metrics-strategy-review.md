# ADR 0012: Performance Metrics And Strategy Review

## Status

Accepted.

## Context

The system can now generate content assets, publishing packages, leads, and customer-service handoffs. To improve over time, agents need a shared feedback layer that records what happened after content is distributed and converts that evidence into reusable strategy memory.

Without this layer, the planning agents can only rely on static brand material and prior drafts. That is enough for a demo, but not enough for an AI-native marketing system whose main value is continuous execution and optimization.

## Decision

Add two durable data concepts:

- `performance_metrics`: normalized metric events for assets, publishing jobs, leads, handoffs, or future platform entities.
- `experiments`: lightweight hypotheses tied to content or workflow entities.

Add `analytics-review` as the service boundary that:

- records metric events,
- produces an analytics overview,
- ranks entities by weighted business signal,
- writes `strategy` memories during reviews,
- runs automatically when a `data_review` Agent task executes.

The first implementation uses local JSON storage and PostgreSQL schema definitions in parallel. Later, platform connectors can write real metrics into the same boundary without changing Agent task semantics.

## Consequences

Positive:

- Agents gain a shared memory of content performance, not only generated plans.
- Data review becomes an executable Agent role instead of a document-only activity.
- Experiments create a place for optimization hypotheses before full A/B testing exists.

Tradeoffs:

- Early scoring is heuristic. Metric weights should become configurable once real platform data arrives.
- The system currently stores aggregate metric events, not a complete warehouse model.
- Real platform APIs will require connector-specific normalization and reconciliation.
