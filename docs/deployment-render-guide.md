# Render Deployment Guide

This is the easiest first deployment path for connecting Coze to Marketing OS.

## What This Deploys

- Marketing OS API
- Built-in debug console
- Coze gateway under `/api/coze/*`
- Dynamic Coze OpenAPI at `/api/coze/openapi.yaml`

Coze becomes the simple frontend. Marketing OS remains the backend operating system.

## Before You Start

Generate one long token:

```bash
node scripts/generate-deploy-token.mjs
```

Use the same value for:

```text
COZE_PLUGIN_TOKEN
LOCAL_API_WRITE_TOKEN
```

Keep it private. Coze will use `x-coze-token`.

## Deploy On Render

1. Create or log in to a Render account.
2. Create a new Blueprint or Web Service from this repository.
3. Use the included `render.yaml` or Dockerfile.
4. Set these environment variables in Render:

```text
COZE_PLUGIN_ENABLED=true
COZE_PLUGIN_TOKEN=<generated token>
LOCAL_API_WRITE_TOKEN=<generated token>
MINIMAX_API_KEY=<your MiniMax key, optional for first smoke test>
```

5. Deploy the service.
6. Copy the public HTTPS URL, for example:

```text
https://marketing-os-coze-gateway.onrender.com
```

7. Set `COZE_PUBLIC_BASE_URL` in Render to that URL and redeploy.

## Verify

Open:

```text
https://your-render-url/api/coze/openapi.yaml
```

Then test:

```bash
curl -s \
  -H "x-coze-token: <generated token>" \
  -H "x-workspace-id: demo" \
  https://your-render-url/api/coze/health
```

Expected:

```json
{
  "ok": true,
  "service": "marketing-os-coze-gateway"
}
```

## Connect Coze

In Coze, create a plugin/tool from OpenAPI.

Use this OpenAPI URL:

```text
https://your-render-url/api/coze/openapi.yaml
```

Set authentication header:

```text
x-coze-token: <generated token>
```

For each merchant, pass:

```text
x-workspace-id: merchant_workspace_id
```

or include `workspace_id` in the request body.

## Important Limits

The first Render deployment uses JSON file storage inside the container. It is suitable for Coze integration testing and early demos.

For real production, switch to PostgreSQL:

```text
DATABASE_URL=
STORE_ADAPTER=postgres
ENABLE_POSTGRES_STORE_ADAPTER=true
```

Run migrations first:

```bash
node scripts/postgres-migrate.mjs --apply
```

Do not expose direct Hermes, OpenClaw, model, or platform credentials to Coze.
