# 0022 Personal WeChat Assisted Mode

## Status

Accepted

## Context

Some merchants prefer to use personal WeChat for early customer conversion. Personal WeChat is familiar and has high trust, but it does not provide the same official customer-contact automation surface as WeCom. Unattended friend requests, private messages, or bulk messaging through unofficial automation would create account, compliance, and customer-experience risk.

## Decision

Support personal WeChat as an assisted, human-in-the-loop channel:

- Show a configured QR code or account label.
- Record leads after customers voluntarily add the account.
- Generate reply drafts, conversation summaries, and sales handoff signals.
- Require human confirmation for friend acceptance and outbound messages.
- Block unattended friend adding, unattended private messaging, and bulk messaging.

OpenClaw can assist with controlled drafts or operator-facing preparation. Hermes can retain long-term customer memory and propose workflow improvements. Neither is allowed to directly operate the personal WeChat account without supervision.

## Consequences

- The system can support merchants who start with personal WeChat.
- The safer long-term path remains WeCom or official WeChat customer-service capabilities.
- Messaging actions stay inside the governance and approval model.
