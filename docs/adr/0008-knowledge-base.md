# ADR 0008: Knowledge Base

## Status

Accepted.

## Context

Marketing, content, customer service, and sales agents need grounded context from user-provided materials. Raw chat memory is not enough for product facts, FAQ, cases, compliance rules, and sales scripts.

## Decision

Add a local Knowledge Base layer:

- `knowledge_documents`: document metadata and summaries.
- `knowledge_chunks`: chunked text for retrieval.
- Keyword retrieval for the MVP.
- Memory summary writeback when a document is added.

Implementation:

```text
apps/api/src/core/knowledge-base.mjs
apps/api/src/data/store.mjs
```

API:

```text
GET  /api/knowledge/documents
POST /api/knowledge/documents
GET  /api/knowledge/search?q=...
```

## Future Upgrade

- Add embeddings.
- Store chunks in PostgreSQL + pgvector.
- Add source citations to agent outputs.
- Add permission scopes for customer/private documents.

