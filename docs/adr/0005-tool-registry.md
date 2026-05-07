# ADR 0005: Tool Registry

## Status

Accepted.

## Context

The system will eventually call Hermes, OpenClaw, platform APIs, CRM, WeCom, video generation, and model providers. Directly invoking tools from agent prompts would make risk control and auditing fragile.

## Decision

Create a central Tool Registry:

```text
apps/api/src/core/tool-registry.mjs
```

Every tool has:

- name
- display name
- category
- risk level
- approval requirement
- configuration status
- allowed agents
- description

The task executor evaluates all assigned tools before execution.

## Consequences

- L0-L2 tools can run automatically when allowed.
- L3-L4 tools require approval before execution.
- Tool calls are recorded for audit.
- OpenClaw and platform publishing are treated as high-risk executors.
- The UI can show which tools are configured or missing.

