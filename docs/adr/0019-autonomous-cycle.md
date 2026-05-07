# ADR 0019: Autonomous Cycle

## Status

Accepted

## Context

The system can already create agent tasks, execute low-risk work, write strategy
memories, and create optimization experiments. Operators still had to trigger those
steps separately.

## Decision

Add an autonomous cycle service boundary:

- creates a project-scoped low-risk planning instruction,
- runs the resulting queued tasks,
- executes any remaining queued low-risk tasks,
- runs the agent optimizer,
- writes a durable workflow memory containing before/after state, execution results,
  recommendations, experiments, and approval requirements.

The cycle is exposed through:

```text
POST /api/agents/autonomous-cycle
```

It remains governed by the existing task executor, tool registry, approval gates, and
memory review rules.

## Consequences

- The user can trigger a bounded autonomous work cycle from the API or web console.
- The cycle is auditable through tasks, tool calls, memories, and experiments.
- High-risk actions still stop at approval instead of executing automatically.
