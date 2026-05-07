import { getSnapshot } from "../data/store.mjs";
import { getConfigOverview } from "./config-registry.mjs";
import { getGovernanceOverview } from "./governance.mjs";
import { getIntegrationReadiness } from "./integration-readiness.mjs";
import { listTools } from "./tool-registry.mjs";

const PHASES = [
  {
    id: "foundation",
    name: "系统地基",
    status: "done",
    items: [
      "本地 API 和前端中控台",
      "JSON 持久化开发存储",
      "多 Agent 任务板和审批中心",
      "共同记忆和知识库"
    ]
  },
  {
    id: "agent_runtime",
    name: "Agent 协作与模型路由",
    status: "done",
    items: [
      "Orchestrator 拆解任务",
      "九类营销 Agent 分工",
      "MiniMax 与 Codex supervised 路由",
      "Hermes 长期记忆边界",
      "OpenClaw 外部工具边界"
    ]
  },
  {
    id: "safety",
    name: "治理与安全",
    status: "done",
    items: [
      "高风险动作审批",
      "Agent 预算和外部工具预算",
      "密钥脱敏和本地写入保护",
      "Hermes/OpenClaw 自主性限制"
    ]
  },
  {
    id: "marketing_workflow",
    name: "营销闭环 MVP",
    status: "done",
    items: [
      "内容资产",
      "多平台发布包",
      "虚拟商家流程",
      "模拟指标回流",
      "线索 CRM、AI 客服和转人工"
    ]
  },
  {
    id: "wechat_intake",
    name: "微信承接",
    status: "partial",
    items: [
      "企业微信 connector stub",
      "个人微信辅助承接模式",
      "AI 回复草稿和转人工",
      "真实微信接口仍需官方能力或人工确认"
    ]
  },
  {
    id: "real_integrations",
    name: "真实平台接入",
    status: "blocked",
    items: [
      "抖音开放平台权限待获取",
      "小红书建议先走发布包/服务商/小程序生态",
      "视频号建议先走发布包和微信生态承接",
      "企业微信/个微承接配置待补齐"
    ]
  },
  {
    id: "productionization",
    name: "生产化",
    status: "partial",
    items: [
      "PostgreSQL/pgvector schema 和迁移 runner",
      "PostgreSQL Store Adapter SQL 读写",
      "workspace_id 多商家数据隔离第一阶段",
      "后台任务队列",
      "部署、日志、告警、成本统计"
    ]
  }
];

const NEXT_TASKS = [
  {
    id: "service_restart_permission",
    priority: "P0",
    title: "固定脚本端口权限",
    owner: "user+codex",
    status: "waiting_permission",
    outcome:
      "批准 ./scripts/dev-server.sh 后，新版进度面板和接口准备度面板可以在浏览器验证。"
  },
  {
    id: "wechat_intake_ui",
    priority: "P0",
    title: "个人微信承接前端面板",
    owner: "codex",
    status: "done",
    outcome:
      "在中控台展示个微二维码、创建个微线索、生成 AI 回复草稿和转人工提示。"
  },
  {
    id: "wechat_trial_workflow",
    priority: "P0",
    title: "个人微信真实试用流程",
    owner: "user+codex",
    status: "ready_to_try",
    outcome:
      "配置个人微信二维码后，用真实客户咨询跑一轮线索记录、草稿生成和人工确认。"
  },
  {
    id: "merchant_onboarding_wizard",
    priority: "P1",
    title: "商家资料提交向导",
    owner: "codex",
    status: "done",
    outcome:
      "把商家资料、产品、客户画像、禁用词、二维码、平台账号信息结构化写入知识库和共同记忆。"
  },
  {
    id: "merchant_first_plan",
    priority: "P1",
    title: "基于商家资料生成首轮营销计划",
    owner: "codex",
    status: "done",
    outcome:
      "商家资料提交后，一键生成首周选题、内容资产、发布包、客服话术和复盘指标。"
  },
  {
    id: "first_plan_execution",
    priority: "P1",
    title: "首轮计划执行和人工确认",
    owner: "user+codex",
    status: "done",
    outcome:
      "在内容资产和发布包中审核首轮计划，人工确认后发布并回填真实指标。"
  },
  {
    id: "metric_review_loop",
    priority: "P1",
    title: "真实指标复盘循环",
    owner: "user+codex",
    status: "done",
    outcome:
      "真实发布 24 小时后回填指标，触发策略复盘并生成下一轮优化计划。"
  },
  {
    id: "next_round_task_execution",
    priority: "P1",
    title: "下一轮内容任务执行",
    owner: "codex",
    status: "done",
    outcome:
      "复盘循环生成任务后，一键执行队列并产出下一轮内容资产和发布包。"
  },
  {
    id: "real_connector_or_production_choice",
    priority: "P1",
    title: "真实 connector 或生产化路线选择",
    owner: "user+codex",
    status: "ready_to_decide",
    outcome:
      "根据当前是否已拿到平台资质，选择先接抖音/企微真实接口，或先做数据库和部署。"
  },
  {
    id: "douyin_connector_design",
    priority: "P1",
    title: "抖音真实 connector 设计",
    owner: "user+codex",
    status: "blocked_by_credentials",
    outcome:
      "拿到抖音开放平台应用信息后，实现 OAuth、发布 dry-run、发布状态和指标同步。"
  },
  {
    id: "storage_upgrade_plan",
    priority: "P2",
    title: "数据库升级方案",
    owner: "codex",
    status: "done",
    outcome:
      "从 data/dev-store.json 迁移到 PostgreSQL + pgvector，支持多商家和长期运行。"
  },
  {
    id: "production_readiness_panel",
    priority: "P2",
    title: "生产化准备度面板",
    owner: "codex",
    status: "done",
    outcome:
      "展示数据库、队列、对象存储、认证、监控、成本和多商家隔离的缺失项。"
  },
  {
    id: "storage_adapter_migration",
    priority: "P2",
    title: "存储适配器迁移",
    owner: "codex",
    status: "done",
    outcome:
      "把当前 JSON store 抽象成 Store Adapter，为 PostgreSQL 实现做准备。"
  },
  {
    id: "postgres_adapter",
    priority: "P2",
    title: "PostgreSQL Store Adapter",
    owner: "codex",
    status: "done",
    outcome:
      "已实现 PostgreSQL Store Adapter 的 SQL-backed load/persist，并保留 JSON adapter 作为本地开发模式。"
  },
  {
    id: "workspace_isolation",
    priority: "P2",
    title: "多商家 Workspace 隔离",
    owner: "codex",
    status: "done",
    outcome:
      "已支持 workspace_id 写入、列表过滤、知识库搜索隔离、商家入驻隔离和首轮营销计划隔离。"
  },
  {
    id: "workspace_switcher_ui",
    priority: "P2",
    title: "前端商家切换器",
    owner: "codex",
    status: "done",
    outcome:
      "中控台已支持新增/切换商家空间，所有主要 API 请求自动绑定当前 workspace。"
  },
  {
    id: "coze_frontend_gateway",
    priority: "P1",
    title: "Coze 前台网关",
    owner: "codex",
    status: "done",
    outcome:
      "已新增 /api/coze/* 受控网关、OpenAPI 插件描述和 Coze 配置指南，Coze 可作为简单前台接入后台操作系统。"
  }
];

export function getProjectStatus() {
  const snapshot = getSnapshot();
  const integrations = getIntegrationReadiness();
  const config = getConfigOverview();
  const governance = getGovernanceOverview();
  const tools = listTools();
  const progress = calculateProgress(PHASES);

  return {
    generated_at: new Date().toISOString(),
    summary: {
      stage: "MVP 可跑通，真实外部平台接入准备中",
      progress_percent: progress.percent,
      completed_phases: progress.done,
      total_phases: PHASES.length,
      primary_blocker:
        "本机端口监听需要批准固定启动脚本；真实平台发布和微信自动化需要官方权限或人工确认。",
      usable_now: [
        "虚拟商家全链路演示",
        "多 Agent 任务拆解和执行",
        "共同记忆、知识库和 AI 客服草稿",
        "发布包生成、模拟指标回流和策略复盘",
        "个人微信辅助承接"
      ],
      not_ready_yet: [
        "无人值守真实发布到抖音/小红书/视频号",
        "无人值守个人微信加好友或发私信",
        "生产级多商家隔离、队列和部署"
      ]
    },
    counts: {
      memories: snapshot.memories.length,
      tasks: snapshot.tasks.length,
      approvals_pending: snapshot.approvals.filter(
        (approval) => approval.status === "pending"
      ).length,
      tools: tools.length,
      configured_tools: tools.filter((tool) => tool.configured).length,
      knowledge_documents: snapshot.knowledge_documents.length,
      content_assets: snapshot.content_assets.length,
      publishing_jobs: snapshot.publishing_jobs.length,
      metrics: snapshot.performance_metrics.length,
      leads: snapshot.leads.length,
      handoffs_pending: snapshot.sales_handoffs.filter(
        (handoff) => handoff.status === "pending"
      ).length
    },
    phases: PHASES,
    next_tasks: NEXT_TASKS,
    readiness: {
      config,
      integrations: integrations.summary,
      governance_mode: governance.policy.mode,
      hermes_mode: governance.policy.hermes.autonomy_mode,
      openclaw_mode: governance.policy.openclaw.autonomy_mode
    }
  };
}

function calculateProgress(phases) {
  const weights = {
    done: 1,
    partial: 0.65,
    blocked: 0.35,
    next: 0.1
  };
  const score = phases.reduce(
    (sum, phase) => sum + (weights[phase.status] ?? 0),
    0
  );

  return {
    done: phases.filter((phase) => phase.status === "done").length,
    percent: Math.round((score / phases.length) * 100)
  };
}
