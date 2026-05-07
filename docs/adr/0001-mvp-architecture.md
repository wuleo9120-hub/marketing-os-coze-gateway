# ADR 0001: MVP Architecture

## Status

Accepted.

## Context

The system needs to become a multi-agent marketing automation platform, but model API keys and platform API credentials are not configured yet.

## Decision

Start with a dependency-light local MVP:

- Node.js built-in HTTP server.
- Static web workspace.
- In-memory data store.
- Explicit interfaces for memory, tasks, approvals, model routing, and tool execution.
- Stub model provider that can be replaced by OpenAI, Hermes, or other providers later.

## Consequences

- The MVP can run without network access or API keys.
- Business concepts are testable immediately.
- Persistence, authentication, queue workers, PostgreSQL, pgvector, Hermes, and OpenClaw can be added behind existing boundaries.

