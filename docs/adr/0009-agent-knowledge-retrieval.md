# ADR 0009: Agent Knowledge Retrieval

## Status

Accepted.

## Context

The system can store and search knowledge base documents. Agents now need to use that knowledge during execution so content, strategy, service, and sales outputs are grounded in user-provided material.

## Decision

Add an Agent Context builder:

```text
apps/api/src/core/agent-context.mjs
```

The task executor calls it before model/provider/connector execution. The resulting context includes:

- retrieval query
- matching knowledge chunks
- compact knowledge summary

The context is passed to:

- stub provider
- OpenAI provider
- Hermes connector
- OpenClaw connector

## Retrieval Policy

Different agents receive different limits and context scopes. Publishing and external automation agents receive smaller, safer context. Content, customer service, and sales agents receive broader knowledge results.

## Future Upgrade

- Replace keyword retrieval with embeddings.
- Add per-document visibility scopes.
- Require citations in customer-facing replies.
- Add retrieval evaluation metrics.

