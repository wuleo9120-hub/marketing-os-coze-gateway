# Data Architecture

This system keeps business state outside model context. Agents can reason and execute, but the durable source of truth is the application data layer.

## Current MVP Store

The current implementation uses a local JSON store at:

```text
data/dev-store.json
```

It persists:

- workspace metadata
- shared memory
- agent tasks
- approvals
- messages
- knowledge documents and chunks
- CRM leads and customer conversations
- content assets and publishing jobs
- performance metrics and experiments

The JSON store is intentionally simple and dependency-free. It lets us keep building before PostgreSQL and model credentials are configured.

## Production Store

The production target is PostgreSQL with pgvector:

```text
db/migrations/0001_core_schema.sql
```

Core tables:

- `workspaces`
- `users`
- `memory_items`
- `agents`
- `agent_tasks`
- `agent_messages`
- `approvals`
- `tool_calls`
- `leads`
- `customer_conversations`
- `sales_handoffs`
- `content_assets`
- `publishing_jobs`
- `performance_metrics`
- `experiments`

## Memory Rules

Agent memory is not raw chat history. Each memory item has:

- type
- title
- content
- summary
- source
- visibility
- confidence
- importance
- created_by_agent

Later, embeddings will be added to `memory_items.embedding` for retrieval.

## Migration Path

1. Keep current repository API stable.
2. Replace JSON file internals with PostgreSQL queries.
3. Add vector search behind `listMemories` or a new `searchMemories` method.
4. Add row-level workspace permissions.
5. Add tool call audit events for Hermes and OpenClaw execution.
