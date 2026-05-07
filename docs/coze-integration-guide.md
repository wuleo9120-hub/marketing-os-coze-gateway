# Coze Frontend Integration Guide

## Architecture

Coze is the frontend agent and conversation workspace. Marketing OS remains the backend operating system:

```text
Coze Bot / Workflow / Plugin
  -> /api/coze/* gateway
  -> Marketing OS orchestrator, memory, CRM, publishing review, governance
  -> Hermes / OpenClaw only through Marketing OS approval and budget controls
```

Do not give Coze direct Hermes, OpenClaw, MiniMax, or Codex credentials.

## Enable Gateway

Set these environment variables in the Marketing OS deployment:

```bash
COZE_PLUGIN_ENABLED=true
COZE_PLUGIN_TOKEN=replace-with-a-long-random-token
COZE_PUBLIC_BASE_URL=https://your-public-marketing-os-host
LOCAL_API_WRITE_TOKEN=optional-local-token
```

Use HTTPS for any real Coze connection. Localhost is fine only for local manual testing.

For a step-by-step first deployment path, use:

```text
docs/deployment-render-guide.md
```

## Coze Plugin

Use `integrations/coze/openapi.yaml` as the plugin/tool OpenAPI description.

Before importing, replace:

```yaml
https://YOUR_PUBLIC_MARKETING_OS_HOST
```

with your deployed `COZE_PUBLIC_BASE_URL`.

Configure authentication as an API key header:

```text
x-coze-token: <COZE_PLUGIN_TOKEN>
```

For multi-merchant isolation, pass either:

```text
x-workspace-id: merchant_workspace_id
```

or include `workspace_id` in the JSON body.

## Recommended Coze Bot Design

Create one main bot:

```text
自动化营销总控
```

System behavior:

- Collect merchant background before planning.
- Always call `onboardMerchant` before `generateFirstMarketingPlan` for a new merchant.
- Use `runMarketingOrchestrator` for open-ended marketing requests.
- Use `searchKnowledge` before answering merchant-specific questions.
- Use `createLead` and `draftCustomerReply` for customer-service intake.
- Use `getPublishingReviewQueue` only to show review status. Do not claim that content has been published.
- Tell the operator that publishing, private messaging, pricing, payment, contracts, and account actions remain approval-gated in Marketing OS.

## Tool Mapping

| Coze Action | Marketing OS Tool |
| --- | --- |
| Create merchant workspace | `createWorkspace` |
| Submit merchant materials | `onboardMerchant` |
| Generate first plan | `generateFirstMarketingPlan` |
| Free-form instruction | `runMarketingOrchestrator` |
| Knowledge Q&A | `searchKnowledge` |
| Lead intake | `createLead` |
| Customer-service draft | `draftCustomerReply` |
| Publishing review status | `getPublishingReviewQueue` |
| Metric review | `runMetricReviewLoop` |

## Safety Boundary

The Coze gateway intentionally does not expose live publishing, approval decisions, direct Hermes execution, direct OpenClaw execution, or personal WeChat automation.

High-risk actions must stay inside Marketing OS:

- publishing to Douyin/Xiaohongshu/WeChat Channels,
- adding WeChat friends or sending private messages,
- bulk messaging,
- quoting final prices,
- taking payment,
- signing contracts,
- changing platform account credentials,
- changing global model/tool budgets.

## Local Smoke Test

With the API running locally:

```bash
COZE_PLUGIN_ENABLED=true \
COZE_PLUGIN_TOKEN=test-token \
PORT=8791 \
./scripts/dev-server.sh 8791
```

Then call:

```bash
curl -s \
  -H "x-coze-token: test-token" \
  -H "x-workspace-id: demo_merchant" \
  http://127.0.0.1:8791/api/coze/health
```
