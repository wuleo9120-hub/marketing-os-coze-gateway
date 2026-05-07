# Implementation Roadmap

## Phase 1: Local MVP

- Static web console.
- Node API service.
- JSON-backed local store.
- Orchestrator task decomposition.
- Memory, task, approval primitives.
- Model router stub.
- Model provider adapter.
- Automatic execution for low-risk tasks.

## Phase 2: Persistence

- PostgreSQL schema.
- pgvector or Qdrant for memory retrieval.
- Tool call audit log.
- Approval decision records.

## Phase 3: Real Models

- Provider adapter interface.
- OpenAI Responses API adapter.
- Cost/latency tracking.
- Prompt versioning.
- Model fallback and escalation rules.
- Runtime config registry for model and gateway credentials.

## Phase 4: Knowledge Base

- Document upload.
- Chunking.
- Embeddings.
- Retrieval API.
- Brand memory and customer memory permissions.

## Phase 5: Agent Runtime

- Hermes gateway connection.
- Long-running task sessions.
- AgentResult validation.
- Memory writeback.

## Phase 6: External Execution

- OpenClaw sandbox connector.
- Browser task permissions.
- Platform publishing package generator.
- Human approval before live actions.
- Platform connector for publishing receipts and metric sync.

## Phase 7: Customer Conversion

- WeCom / WeChat customer service integration.
- Lead CRM.
- Conversation summarization.
- Human handoff.
- WeCom connector for lead intake and message routing.

## Phase 8: Performance Learning

- Platform metric ingestion.
- Experiment tracking.
- Strategy review memory.
- Content and funnel optimization recommendations.
