# ADR 0016: Agent Governance And Memory Control

## Status

Accepted

## Context

Hermes and OpenClaw increase the system's execution power. Hermes can run long-lived,
memory-oriented sessions, while OpenClaw can drive external browser and tool actions.
That power needs a control layer so agents stay inside this marketing project, do not
spend unlimited tokens, and do not start unrelated autonomous work.

Hermes permanent memory and self-learning are useful, but they must not become raw,
unreviewed self-modification. The safe version is structured project memory: campaign
strategy, workflow learnings, customer patterns, content learnings, and tool outcomes.

## Decision

Add a `governance_guard` that runs before each task calls a model, Hermes, OpenClaw,
or any external connector.

The guard enforces:

- project-scoped agent types only,
- registered tool and agent permissions,
- daily model call budget,
- daily external tool call budget,
- per-task input token estimate,
- Hermes autonomy restrictions,
- OpenClaw approval-gated execution,
- memory update validation before writing durable memory.

Hermes is allowed to write durable structured memories when those memories are inside
the project scope and do not contain credentials. Hermes is not allowed to publish,
message customers, quote prices, collect payment, sign agreements, or add contacts.

OpenClaw remains an execution tool, not an independent planner. It receives bounded
tasks after approval and returns auditable results.

Hermes and OpenClaw may both participate in system improvement. The allowed pattern is:

- observe prior tasks, tool calls, failures, approvals, and memories,
- produce an optimization proposal,
- execute only low-risk analysis and memory updates automatically,
- require human approval before changing prompts, tool connectors, platform actions,
  customer-contact behavior, pricing behavior, or account credentials.

## Runtime Controls

The default policy is enforced. It can be tuned with environment variables:

- `AGENT_GOVERNANCE_MODE=enforced`
- `MAX_DAILY_MODEL_CALLS=200`
- `MAX_DAILY_EXTERNAL_TOOL_CALLS=40`
- `MAX_TASK_INPUT_TOKENS=12000`
- `MAX_MEMORY_UPDATE_CHARS=4000`
- `MAX_HERMES_PROMPT_CHARS=16000`
- `MAX_OPENCLAW_PAYLOAD_CHARS=16000`
- `HERMES_AUTONOMY_MODE=supervised_memory`
- `HERMES_PERMANENT_MEMORY=enabled`
- `HERMES_SELF_LEARNING=enabled`
- `OPENCLAW_AUTONOMY_MODE=approval_gated`
- `REQUIRE_APPROVAL_FOR_EXTERNAL_AUTOMATION=true`

## Consequences

- Agents cannot silently bypass the project scope or tool permissions.
- Token and external tool usage have explicit daily ceilings.
- Hermes permanent memory and learning are enabled as controlled project memory.
- Hermes/OpenClaw can recommend improvements without becoming unbounded autonomous
  operators.
- High-risk actions still require human approval before execution.
- Future production work should persist governance events in a database and expose
  per-agent cost dashboards.
