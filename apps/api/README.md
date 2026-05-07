# API App

当前 API 使用 Node.js 内置 HTTP 服务实现，方便在没有安装依赖、没有模型 Key 的情况下先跑通 Agent 系统地基。

核心文件：

- `src/server.mjs`：HTTP API 和静态文件服务。
- `src/core/orchestrator.mjs`：总控 Agent 骨架。
- `src/core/model-router.mjs`：模型路由器。
- `src/core/task-executor.mjs`：自动任务执行器。
- `src/core/tool-registry.mjs`：工具注册中心与风险策略。
- `src/core/connectors/hermes-gateway.mjs`：Hermes Gateway Connector。
- `src/core/connectors/openclaw-connector.mjs`：OpenClaw Connector。
- `src/core/connectors/platform-connector.mjs`：平台发布回执和指标同步 Connector。
- `src/core/connectors/wecom-connector.mjs`：企微线索和客户消息 Connector。
- `src/core/connectors/weixin-personal-connector.mjs`：个人微信辅助承接 Connector，只做二维码留资、线索记录、回复草稿和人工确认。
- `src/core/knowledge-base.mjs`：知识库文档写入、chunk 和检索。
- `src/core/customer-service.mjs`：线索、AI 客服回复和销售转人工。
- `src/core/content-ops.mjs`：内容资产和发布包。
- `src/core/analytics-review.mjs`：指标记录、实验假设和策略复盘记忆。
- `src/core/agent-optimizer.mjs`：Agent 运行复盘、优化建议和低风险实验创建。
- `src/bridges/openclaw-http-bridge.mjs`：OpenClaw CLI/Gateway 的 HTTP 桥接服务。
- `src/core/config-registry.mjs`：运行配置状态、环境变量映射和敏感值遮罩。
- `src/core/integration-readiness.mjs`：真实平台接口准备度、资质路径和替代执行路径。
- `src/core/merchant-onboarding.mjs`：商家资料入驻、结构化共同记忆和知识库生成。
- `src/core/first-marketing-plan.mjs`：基于商家资料生成首轮营销计划、内容资产、发布包和指标模板。
- `src/core/publishing-review.mjs`：发布审核队列、人工发布确认和初始指标回填。
- `src/core/metric-review-loop.mjs`：真实指标复盘、下一轮优化建议、实验假设和任务创建。
- `src/core/next-round-execution.mjs`：执行复盘循环生成的下一轮任务并创建发布包。
- `src/core/production-readiness.mjs`：生产化准备度检查，覆盖数据库、队列、对象存储、认证、监控、成本和多商家隔离。
- `src/core/project-status.mjs`：项目进度、阶段、阻塞点和下一步任务安排。
- `src/core/agent-context.mjs`：Agent 执行前的知识检索上下文。
- `src/core/providers`：模型供应商适配层。
- `src/data/store.mjs`：本地 JSON 持久化数据存储。
- `src/data/adapters/json-store-adapter.mjs`：Store Adapter 边界的 JSON 实现，后续替换 PostgreSQL。
- `src/data/adapters/store-adapter.mjs`：根据 `STORE_ADAPTER` 选择 JSON/PostgreSQL adapter。
- `src/data/adapters/postgres-store-adapter.mjs`：PostgreSQL adapter，需迁移后显式设置 `ENABLE_POSTGRES_STORE_ADAPTER=true` 才会启用。
- `src/data/postgres-connection.mjs`：PostgreSQL `psql` 执行边界，负责连接配置、超时和敏感信息遮罩。
- `src/data/postgres-migrations.mjs`：PostgreSQL migration runner，先支持 dry-run 和首版 schema 应用。

审批 API：

```text
POST /api/approvals/:id/decision
```

请求示例：

```json
{
  "status": "approved",
  "decided_by": "user",
  "decision_note": "Approved after review."
}
```

指标复盘 API：

```text
GET  /api/analytics
POST /api/analytics/metrics
POST /api/analytics/experiments
POST /api/analytics/review
POST /api/agents/optimize
POST /api/agents/autonomous-cycle
POST /api/demo/merchant-flow
POST /api/marketing/first-plan
POST /api/marketing/metric-review-loop
POST /api/marketing/execute-next-round
```

OpenClaw Bridge：

```text
GET  http://127.0.0.1:9292/health
POST http://127.0.0.1:9292/tasks
```

启动：

```bash
./scripts/openclaw-bridge.sh
```

平台 / 企微 Connector API：

```text
GET  /api/platforms/status
POST /api/platforms/publishing-jobs/:id/submit
POST /api/platforms/metrics/sync
GET  /api/wecom/status
POST /api/wecom/leads
POST /api/wecom/leads/:id/messages
GET  /api/weixin-personal/status
POST /api/weixin-personal/leads
POST /api/weixin-personal/leads/:id/messages
```

运行配置 API：

```text
GET /api/config
GET /api/workspaces
POST /api/workspaces
GET /api/coze/health
POST /api/coze/chat
GET /api/integrations/readiness
GET /api/project/status
GET /api/production/readiness
```

`/api/integrations/readiness` 会检查抖音、小红书、视频号和企业微信的接入条件，并返回缺失环境变量、官方申请步骤、替代路径和来源链接。该接口用于指导后续真实 connector 的配置，不泄露密钥明文。
`/api/project/status` 会返回当前建设阶段、完成度、主要阻塞点、可用能力、未就绪能力和下一步任务。
`/api/production/readiness` 会返回生产化准备度，覆盖数据库、队列、对象存储、认证、观测、成本控制和多商家隔离。

多商家隔离：

- API 支持通过 `workspace_id` 查询参数或 `x-workspace-id` 请求头选择商家空间。
- 不传 `workspace_id` 时默认使用 `DEFAULT_WORKSPACE_ID`，未配置则使用 `default`。
- 商家入驻、记忆、知识库、内容资产、线索、指标和首轮营销计划已按 `workspace_id` 隔离。
- 前端中控台已提供商家切换器，切换后主要 GET/POST 请求会自动绑定当前 `workspace_id`。

Coze 前台接入：

- `/api/coze/*` 是给 Coze Bot/Workflow/Plugin 使用的受控网关。
- 启用需要 `COZE_PLUGIN_ENABLED=true` 和 `COZE_PLUGIN_TOKEN`。
- OpenAPI 描述在 `integrations/coze/openapi.yaml`。
- 配置说明在 `docs/coze-integration-guide.md`。
- Coze 不直接获得 Hermes、OpenClaw、模型 API 或平台账号密钥。

PostgreSQL migration dry-run：

```bash
node scripts/postgres-migrate.mjs --dry-run
```

应用迁移需要先设置 `DATABASE_URL`：

```bash
node scripts/postgres-migrate.mjs --apply
```

模型 Provider：

- `minimax`：读取 `MINIMAX_API_KEY`，默认 `MINIMAX_BASE_URL=https://api.minimax.io/v1`、`MINIMAX_MODEL=MiniMax-M2.7`。
- `codex_supervised`：用于 Codex GPT-5.5。没有 `CODEX_GATEWAY_URL` 时只创建 supervised handoff artifact；有 gateway 时提交到 `/agent-tasks`。

默认 Agent 分配：

```text
codex_supervised: orchestrator, brand_strategy, data_review, sales_assist
minimax: platform_research, content_creation, video_production, publishing_ops, customer_service
```

后续替换方向：

- HTTP 服务可迁移到 FastAPI、NestJS 或 Hono。
- JSON 存储替换为 PostgreSQL + pgvector。
- 模型路由器接入 OpenAI、Claude、Gemini、国产模型和本地模型。
- 工具执行层接入 Hermes、OpenClaw、企业微信、平台 API。
