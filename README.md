# AI Marketing Agents

多 Agent 自动化营销系统 MVP。当前版本不依赖真实模型 API，可以先跑通系统地基：

- 对话式总控台
- 多 Agent 任务拆解
- 共同记忆写入
- 审批中心
- 本地 JSON 持久化
- 模型路由占位
- 模型 Provider Adapter
- 低风险 Agent 任务自动执行
- 审批通过后恢复执行
- 工具注册中心与风险分级
- Hermes Gateway Connector stub/real gateway boundary
- OpenClaw Connector stub/real gateway boundary
- Platform Connector stub/real gateway boundary
- WeCom Connector stub/real gateway boundary
- 个人微信辅助承接模式，支持二维码留资、AI 回复草稿和人工确认
- 运行配置注册表与敏感值遮罩
- 本地知识库文档写入、chunk 和检索
- Agent 执行前自动检索知识库
- 线索 CRM、AI 客服回复和高意向转人工
- 内容资产和多平台发布包
- 指标记录、实验假设和策略复盘记忆
- Agent 自我复盘优化记忆和低风险实验建议
- OpenClaw HTTP Bridge，用于把系统 connector 接到本机 OpenClaw CLI/Gateway
- 真实平台接口准备度检查，标出官方接入、缺失密钥和替代执行路径

## 当前阶段

这是第一阶段工程骨架，不是完整生产系统。它用于先确定核心边界：

- 业务状态必须落库，当前先用内存模拟。
- 当前开发环境用 `data/dev-store.json` 做轻量持久化，后续替换为 PostgreSQL。
- Agent 输出必须结构化。
- 高风险动作必须进入审批。
- 模型供应商通过 Model Router 统一接入。
- OpenClaw 只作为受控工具执行器，不作为业务状态来源。

详细进度和下一步路线图见：

```text
docs/current-progress-and-roadmap.md
```

也可以通过 API 查看：

```text
GET /api/project/status
```

## 启动

```bash
node apps/api/src/server.mjs
```

如果普通终端找不到 `node`，使用项目脚本：

```bash
./scripts/dev-server.sh
```

也可以指定端口：

```bash
./scripts/dev-server.sh 8791
```

Codex 沙箱可能会拦截本机端口监听。更安全的权限做法是只批准 `./scripts/dev-server.sh` 这个项目固定脚本，而不是开放任意 `node` 或 shell 执行权限。

然后打开：

```text
http://localhost:8787
```

## 部署给 Coze 调用

Coze 云端不能访问本机 `127.0.0.1`，需要一个公网 HTTPS 地址。项目已内置 Render/Docker 部署包：

```text
Dockerfile
render.yaml
docs/deployment-render-guide.md
integrations/coze/openapi.yaml
```

部署后，在 Coze Plugin 中导入：

```text
https://你的公网域名/api/coze/openapi.yaml
```

并配置鉴权 header：

```text
x-coze-token: <COZE_PLUGIN_TOKEN>
```

## OpenClaw Bridge

启动桥接服务：

```bash
./scripts/openclaw-bridge.sh
```

默认监听：

```text
http://127.0.0.1:9292
```

主 API 使用：

```text
OPENCLAW_BASE_URL=http://127.0.0.1:9292
```

Bridge 默认 dry-run，不会直接发布、私信、加微信或改账号。只有显式设置
`OPENCLAW_BRIDGE_AGENT_EXECUTION=true` 后，才会尝试调用 OpenClaw agent CLI；高风险动作仍然受审批中心控制。

## 检查

```bash
node --check apps/api/src/server.mjs
node scripts/smoke-test.mjs
node scripts/approval-flow-test.mjs
node scripts/tool-registry-test.mjs
node scripts/hermes-connector-test.mjs
node scripts/openclaw-connector-test.mjs
node scripts/knowledge-base-test.mjs
node scripts/agent-knowledge-test.mjs
node scripts/customer-service-test.mjs
node scripts/content-ops-test.mjs
node scripts/analytics-review-test.mjs
node scripts/platform-wecom-connector-test.mjs
node scripts/config-registry-test.mjs
node scripts/openclaw-bridge-test.mjs
node scripts/agent-optimization-test.mjs
```

## 运行配置

当前支持：

```text
GET /api/config
GET /api/production/readiness
```

该接口只返回配置状态和脱敏值，不返回明文密钥。当前读取的环境变量：

```text
OPENAI_API_KEY=
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-M2.7
CODEX_GATEWAY_URL=
CODEX_GATEWAY_TOKEN=
CODEX_MODEL=gpt-5.5
HERMES_GATEWAY_URL=
OPENCLAW_BASE_URL=http://127.0.0.1:9292
OPENCLAW_BRIDGE_HOST=127.0.0.1
OPENCLAW_BRIDGE_PORT=9292
OPENCLAW_BRIDGE_AGENT_EXECUTION=false
PLATFORM_CONNECTOR_URL=
WECOM_CONNECTOR_URL=
```

模型分配：

```text
Codex GPT-5.5 supervised:
- orchestrator
- brand_strategy
- data_review
- sales_assist

MiniMax-M2.7:
- platform_research
- content_creation
- video_production
- publishing_ops
- customer_service
```

Codex GPT-5.5 当前不是普通后台 API。没有 `CODEX_GATEWAY_URL` 时，系统会为相关 Agent 生成 `codex_supervised:*` 接管 artifact，由 Codex 会话处理；配置 gateway 后再自动提交。

## 平台 / 企微 Connector

当前支持：

```text
GET  /api/platforms/status
POST /api/platforms/publishing-jobs/:id/submit
POST /api/platforms/metrics/sync
GET  /api/wecom/status
POST /api/wecom/leads
POST /api/wecom/leads/:id/messages
```

没有配置外部网关时，以上接口只会走本地 stub：发布任务会写入模拟平台回执，指标会回流到 analytics，企微消息会进入现有 AI 客服和转人工流程。

## 指标复盘 / 实验

当前支持：

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

内容发布后的播放、互动、线索、成交等指标会记录到 performance metrics。Data Review Agent 会基于这些指标写入 strategy memory，供后续营销计划、内容生成和客服话术继续使用。
Agent Optimizer 会基于任务、审批、工具调用、治理预算和连接器状态写入优化记忆，并自动创建低风险实验假设。
Autonomous Cycle 会把“生成低风险建设任务、执行队列、自我优化、写循环报告”合并为一次可审计循环。
Demo Merchant Flow 会用虚拟商家数据跑通资料、知识库、内容资产、发布包、模拟指标、线索、AI 客服、转人工、复盘和自主循环。
First Marketing Plan 会基于最新商家入驻资料生成首周计划、内容资产、发布包、客服话术、指标模板和实验假设。
Metric Review Loop 会基于已发布内容和真实指标生成复盘记忆、下一轮优化建议、实验假设和任务队列。
Execute Next Round 会执行复盘循环创建的下一轮任务，并为新内容资产自动生成发布包。

## 真实接口准备度

```text
GET /api/integrations/readiness
```

该接口用于检查真实平台接入条件，当前覆盖抖音、小红书、视频号和企业微信。它不会返回明文密钥，只会返回缺失项、官方获取路径和没有官方接口时的替代路径。

更完整的申请步骤见 `docs/platform-api-access-guide.md`。

优先接入顺序：

- 企业微信：用于留资、加微、AI 客服、转人工，是合规自动化的第一优先级。
- 个人微信：可以作为早期承接方式，但只做二维码留资、线索记录、回复草稿和人工确认，不做无人值守自动加人或自动私信。
- 抖音开放平台：有官方内容发布能力，适合做真实发布 connector。
- 小红书：先走发布包、人工发布或官方服务商/小程序生态，避免绕过平台规则。
- 视频号：先走发布包和视频号助手人工发布，用微信生态能力承接转化。

新增环境变量见 `.env.example`：

```text
DOUYIN_CLIENT_KEY=
DOUYIN_CLIENT_SECRET=
DOUYIN_REDIRECT_URI=
XHS_APP_ID=
XHS_APP_SECRET=
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECOM_CORP_ID=
WECOM_AGENT_ID=
WECOM_EXTERNAL_CONTACT_SECRET=
WECOM_CALLBACK_TOKEN=
WECOM_ENCODING_AES_KEY=
WEIXIN_PERSONAL_QR_URL=
WEIXIN_PERSONAL_ACCOUNT_LABEL=
```

## 虚拟商家流程

```bash
node scripts/demo-merchant-flow.mjs
```

默认使用“云朵烘焙工作室”作为虚拟商家，写入：

- 品牌资料和客服 FAQ
- 抖音 / 小红书 / 视频号内容资产
- 多平台发布包和 dry-run 发布回执
- 模拟平台指标
- 虚拟客户线索、AI 客服回复和转人工
- 策略复盘记忆、Agent 优化记忆和自主循环记忆

## 内容资产 / 发布包

当前支持：

```text
GET  /api/content/assets
POST /api/content/assets
POST /api/content/publishing-packages
GET  /api/publishing/review
POST /api/publishing/jobs/:id/manual-publish
```

内容 Agent 会自动生成 draft asset；发布 Agent 审批通过后会生成平台发布包和 publishing jobs。
发布审核支持人工确认发布、回填平台链接和初始指标，适合没有真实平台 API 前的半自动执行。

## CRM / AI 客服

当前支持：

```text
GET  /api/crm/leads
POST /api/crm/leads
GET  /api/crm/leads/:id/conversation
POST /api/crm/leads/:id/conversation
GET  /api/weixin-personal/status
POST /api/weixin-personal/leads
POST /api/weixin-personal/leads/:id/messages
```

第一版会基于知识库生成 stub 客服回复，并在识别到报价、签约、合同、付款等高意向信号时创建转人工记录。
个人微信承接面板会展示二维码状态，支持记录个微线索和生成回复草稿；最终加好友和发送仍由人工确认。

## 知识库

当前支持：

```text
POST /api/merchant/onboarding
GET  /api/knowledge/documents
POST /api/knowledge/documents
GET  /api/knowledge/search?q=关键词
```

商家资料提交会把品牌、产品、客户画像、FAQ、禁用词、平台账号和微信承接方式写入共同记忆和知识库，后续 Agent 会自动检索使用。
第一版使用本地关键词检索。后续会接 embedding 和 pgvector。

如果你的环境有 `npm`，也可以使用 `npm run dev` 和 `npm run check`。

## 自动执行构建任务

```bash
node scripts/run-build-tasks.mjs
```

也可以传入自定义构建指令：

```bash
node scripts/run-build-tasks.mjs "继续构建知识库上传模块，并自动执行低风险任务"
```

执行规则：

- L0-L2 任务会自动执行。
- L3-L4 或显式 `approval_required` 的任务会进入审批中心。
- 审批通过后，关联任务会继续执行。
- 审批拒绝后，关联任务会标记为 rejected。
- 所有工具调用都先经过 Tool Registry。
- MiniMax 未配置时，高频执行 Agent 会回退到 stub provider。
- Codex GPT-5.5 未配置 gateway 时，高推理 Agent 会生成 supervised handoff artifact。

## API

```text
GET  /api/health
GET  /api/snapshot
GET  /api/messages
GET  /api/memories
POST /api/memories
GET  /api/tasks
GET  /api/approvals
POST /api/chat
```

## 后续接入

### 数据库

当前 schema 草案在：

```text
db/migrations/0001_core_schema.sql
```

生产目标是 PostgreSQL + pgvector。当前 MVP 会先把状态保存到 `data/dev-store.json`，方便在没有数据库服务时继续开发。

### 模型

后续在 `.env` 中配置：

```text
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimax.io/v1
MINIMAX_MODEL=MiniMax-M2.7
CODEX_GATEWAY_URL=
CODEX_GATEWAY_TOKEN=
CODEX_MODEL=gpt-5.5
HERMES_GATEWAY_URL=
OPENCLAW_BASE_URL=http://127.0.0.1:9292
OPENCLAW_BRIDGE_HOST=127.0.0.1
OPENCLAW_BRIDGE_PORT=9292
OPENCLAW_BRIDGE_AGENT_EXECUTION=false
PLATFORM_CONNECTOR_URL=
WECOM_CONNECTOR_URL=
```

MiniMax 是普通后台模型 Provider。Codex GPT-5.5 是 supervised Provider：没有 Codex gateway 时不会后台自动调用，只会生成接管任务。

Hermes 和 OpenClaw 不属于模型分配表：Hermes 是长任务 Agent runtime，OpenClaw 是外部浏览器/工具执行器。它们分别通过 `HERMES_GATEWAY_URL` 和 `OPENCLAW_BASE_URL` 配置。

当前 provider 入口在：

```text
apps/api/src/core/providers
```

### Hermes Agent

Hermes 适合作为长期运行的 Agent 执行器。后续接入点：

- Orchestrator 创建任务后，把复杂任务交给 Hermes session。
- Hermes 返回结构化 AgentResult。
- 系统将结果写回 task、memory、approval、tool_calls。

当前 Hermes connector 已经在：

```text
apps/api/src/core/connectors/hermes-gateway.mjs
```

状态 API：

```text
GET /api/hermes/status
```

未配置 `HERMES_GATEWAY_URL` 时使用 stub 模式。

### OpenClaw

OpenClaw 适合作为受控外部动作执行器。后续接入点：

- 平台研究 Agent 的受控浏览。
- 发布运营 Agent 的草稿创建。
- 内部后台操作。

高风险动作仍然要经过审批中心。

当前 OpenClaw connector 已经在：

```text
apps/api/src/core/connectors/openclaw-connector.mjs
```

状态 API：

```text
GET /api/openclaw/status
```

未配置 `OPENCLAW_BASE_URL` 时使用 stub 模式，不会执行真实浏览器动作。配置为 `http://127.0.0.1:9292` 后，会走本项目的 OpenClaw HTTP Bridge；Bridge 默认 dry-run，除非显式启用 `OPENCLAW_BRIDGE_AGENT_EXECUTION=true`。

## 推荐下一步

1. 把内存 store 替换为 PostgreSQL schema。
2. 增加 model provider adapter。
3. 实现知识库上传和向量检索。
4. 接入 Hermes gateway。
5. 接入 OpenClaw 沙盒执行器。
6. 增加真实审批动作和审计日志。
