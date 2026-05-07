import {
  getConfigForTool,
  isRuntimeConfigConfigured
} from "./config-registry.mjs";

const TOOL_DEFINITIONS = [
  {
    name: "memory",
    display_name: "Shared Memory",
    category: "knowledge",
    risk_level: "L0",
    requires_approval: false,
    configured: true,
    allowed_agents: ["*"],
    description: "Read and write structured workspace memory."
  },
  {
    name: "task_board",
    display_name: "Task Board",
    category: "workflow",
    risk_level: "L0",
    requires_approval: false,
    configured: true,
    allowed_agents: ["orchestrator"],
    description: "Create and update agent tasks."
  },
  {
    name: "approval_gate",
    display_name: "Approval Gate",
    category: "governance",
    risk_level: "L0",
    requires_approval: false,
    configured: true,
    allowed_agents: ["*"],
    description: "Pause high-risk work until a human decision is recorded."
  },
  {
    name: "governance_guard",
    display_name: "Governance Guard",
    category: "governance",
    risk_level: "L0",
    requires_approval: false,
    configured: true,
    allowed_agents: ["*"],
    description:
      "Enforce project scope, tool autonomy limits, daily budgets, and safe memory writes before agent execution."
  },
  {
    name: "model:stub",
    display_name: "Stub Model Provider",
    category: "model",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: ["*"],
    description: "Deterministic local provider used before real model keys exist."
  },
  {
    name: "model:openai",
    display_name: "OpenAI Provider",
    category: "model",
    risk_level: "L1",
    requires_approval: false,
    configured: isRuntimeConfigConfigured("openai"),
    allowed_agents: ["*"],
    description: "OpenAI Responses API provider for model-backed agent work."
  },
  {
    name: "model:minimax",
    display_name: "MiniMax Provider",
    category: "model",
    risk_level: "L1",
    requires_approval: false,
    configured: isRuntimeConfigConfigured("minimax"),
    allowed_agents: ["*"],
    description: "MiniMax-M2.7 provider for high-throughput content, research, customer service, and execution agents."
  },
  {
    name: "model:codex_supervised",
    display_name: "Codex GPT-5.5 Supervised Provider",
    category: "model",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: ["orchestrator", "brand_strategy", "data_review", "sales_assist"],
    description: "Codex GPT-5.5 supervision boundary. Uses gateway when configured; otherwise creates a supervised Codex handoff artifact."
  },
  {
    name: "browser_research_stub",
    display_name: "Browser Research Stub",
    category: "research",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: ["platform_research"],
    description: "Placeholder for approved public research workflows."
  },
  {
    name: "content_generator_stub",
    display_name: "Content Generator Stub",
    category: "content",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: ["content_creation"],
    description: "Placeholder for content generation workflows."
  },
  {
    name: "asset_library_stub",
    display_name: "Asset Library Stub",
    category: "asset",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: ["video_production"],
    description: "Placeholder for media asset search and retrieval."
  },
  {
    name: "video_generator_stub",
    display_name: "Video Generator Stub",
    category: "video",
    risk_level: "L2",
    requires_approval: false,
    configured: true,
    allowed_agents: ["video_production"],
    description: "Placeholder for draft video generation."
  },
  {
    name: "analytics_stub",
    display_name: "Analytics Stub",
    category: "analytics",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: ["data_review"],
    description: "Placeholder for campaign metrics and learning analysis."
  },
  {
    name: "platform_metrics_stub",
    display_name: "Platform Metrics Stub",
    category: "analytics",
    risk_level: "L2",
    requires_approval: false,
    configured: true,
    allowed_agents: ["data_review", "publishing_ops"],
    description: "Normalize platform performance metrics into the analytics layer."
  },
  {
    name: "knowledge_base",
    display_name: "Knowledge Base",
    category: "knowledge",
    risk_level: "L1",
    requires_approval: false,
    configured: true,
    allowed_agents: [
      "brand_strategy",
      "platform_research",
      "content_creation",
      "video_production",
      "customer_service",
      "sales_assist"
    ],
    description: "Retrieve approved product, brand, and policy knowledge."
  },
  {
    name: "crm_stub",
    display_name: "CRM Stub",
    category: "crm",
    risk_level: "L2",
    requires_approval: false,
    configured: true,
    allowed_agents: ["customer_service", "sales_assist"],
    description: "Placeholder for lead creation and customer stage updates."
  },
  {
    name: "wecom_stub",
    display_name: "WeCom Stub",
    category: "messaging",
    risk_level: "L3",
    requires_approval: true,
    configured: true,
    allowed_agents: ["customer_service"],
    description: "Placeholder for Enterprise WeChat customer messaging."
  },
  {
    name: "wecom_connector",
    display_name: "WeCom Connector",
    category: "messaging",
    risk_level: "L3",
    requires_approval: true,
    configured: isRuntimeConfigConfigured("wecom_connector"),
    allowed_agents: ["customer_service", "sales_assist"],
    description: "Gateway for Enterprise WeChat lead intake and customer messages."
  },
  {
    name: "weixin_personal_assist",
    display_name: "Personal WeChat Assisted Mode",
    category: "messaging",
    risk_level: "L3",
    requires_approval: true,
    configured: true,
    allowed_agents: ["customer_service", "sales_assist"],
    description:
      "Human-in-the-loop personal WeChat workflow for QR intake, reply drafts, and manual confirmation. It does not perform unattended friend requests or messages."
  },
  {
    name: "platform_api_stub",
    display_name: "Platform Publish API Stub",
    category: "publishing",
    risk_level: "L3",
    requires_approval: true,
    configured: true,
    allowed_agents: ["publishing_ops"],
    description: "Placeholder for Douyin/Xiaohongshu/Video Account publishing APIs."
  },
  {
    name: "platform_connector",
    display_name: "Platform Connector",
    category: "publishing",
    risk_level: "L3",
    requires_approval: true,
    configured: isRuntimeConfigConfigured("platform_connector"),
    allowed_agents: ["publishing_ops", "data_review"],
    description: "Gateway for platform publishing receipts and metric ingestion."
  },
  {
    name: "openclaw_stub",
    display_name: "OpenClaw Stub",
    category: "automation",
    risk_level: "L3",
    requires_approval: true,
    configured: isRuntimeConfigConfigured("openclaw"),
    allowed_agents: ["publishing_ops", "platform_research"],
    description: "Controlled external browser/tool automation executor."
  },
  {
    name: "hermes_gateway",
    display_name: "Hermes Gateway",
    category: "agent_runtime",
    risk_level: "L2",
    requires_approval: false,
    configured: isRuntimeConfigConfigured("hermes"),
    allowed_agents: [
      "orchestrator",
      "brand_strategy",
      "platform_research",
      "data_review"
    ],
    description: "Long-running agent runtime and memory-oriented execution."
  }
];

const RISK_ORDER = ["L0", "L1", "L2", "L3", "L4"];

export function listTools() {
  return TOOL_DEFINITIONS.map((tool) => ({ ...tool }));
}

export function getTool(name) {
  const tool = TOOL_DEFINITIONS.find((item) => item.name === name);
  return tool ? { ...tool } : null;
}

export function evaluateTaskTools(task) {
  const assignedTools = task.assigned_tools ?? [];
  const evaluations = assignedTools.map((toolName) =>
    evaluateToolUse({
      tool_name: toolName,
      agent_type: task.agent_type
    })
  );

  return {
    evaluations,
    max_risk_level: maxRisk([
      task.risk_level,
      ...evaluations.map((evaluation) => evaluation.risk_level)
    ]),
    requires_approval: evaluations.some(
      (evaluation) => evaluation.requires_approval
    ),
    blocked: evaluations.filter((evaluation) => !evaluation.allowed),
    unconfigured: evaluations.filter(
      (evaluation) => evaluation.required_for_execution && !evaluation.configured
    )
  };
}

export function evaluateToolUse({ tool_name, agent_type }) {
  const tool = getTool(tool_name);
  if (!tool) {
    return {
      tool_name,
      agent_type,
      allowed: false,
      configured: false,
      risk_level: "L4",
      requires_approval: true,
      required_for_execution: true,
      reason: "Tool is not registered."
    };
  }

  const allowed =
    tool.allowed_agents.includes("*") || tool.allowed_agents.includes(agent_type);
  const config = getConfigForTool(tool_name);

  return {
    ...tool,
    tool_name,
    agent_type,
    allowed,
    config,
    required_for_execution: tool.category !== "model",
    reason: allowed
      ? "Tool is allowed for this agent."
      : "Tool is not allowed for this agent."
  };
}

export function maxRisk(levels) {
  return levels.reduce((highest, current) => {
    if (!current) return highest;
    return RISK_ORDER.indexOf(current) > RISK_ORDER.indexOf(highest)
      ? current
      : highest;
  }, "L0");
}
