import { listToolCalls } from "../data/store.mjs";

const PROJECT_AGENT_TYPES = [
  "orchestrator",
  "brand_strategy",
  "platform_research",
  "content_creation",
  "video_production",
  "publishing_ops",
  "customer_service",
  "data_review",
  "sales_assist"
];

const EXTERNAL_TOOL_NAMES = [
  "hermes_gateway",
  "openclaw_stub",
  "platform_api_stub",
  "platform_connector",
  "wecom_stub",
  "wecom_connector"
];

const HERMES_BLOCKED_KEYWORDS = [
  "发布",
  "群发",
  "添加微信",
  "加微信",
  "报价",
  "收款",
  "签约",
  "成交"
];

const ALLOWED_MEMORY_TYPES = [
  "brand",
  "workflow",
  "strategy",
  "customer",
  "content",
  "tool"
];

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{16,}/,
  /api[_-]?key/i,
  /token/i,
  /password/i,
  /secret/i
];

export function getGovernancePolicy() {
  return {
    mode: process.env.AGENT_GOVERNANCE_MODE ?? "enforced",
    scope: {
      project: "AI automated marketing system",
      allowed_agent_types: PROJECT_AGENT_TYPES,
      external_tools: EXTERNAL_TOOL_NAMES
    },
    budgets: {
      max_daily_model_calls: numberFromEnv("MAX_DAILY_MODEL_CALLS", 200),
      max_daily_external_tool_calls: numberFromEnv(
        "MAX_DAILY_EXTERNAL_TOOL_CALLS",
        40
      ),
      max_task_input_tokens: numberFromEnv("MAX_TASK_INPUT_TOKENS", 12000),
      max_memory_update_chars: numberFromEnv("MAX_MEMORY_UPDATE_CHARS", 4000)
    },
    hermes: {
      autonomy_mode: process.env.HERMES_AUTONOMY_MODE ?? "supervised_memory",
      permanent_memory: process.env.HERMES_PERMANENT_MEMORY ?? "enabled",
      self_learning: process.env.HERMES_SELF_LEARNING ?? "enabled",
      rules: [
        "Hermes may write structured project memories.",
        "Hermes may propose optimizations from prior task outcomes and execute low-risk analysis tasks under the governance guard.",
        "Hermes may not apply system, prompt, connector, publishing, or customer-contact changes without a recorded approval.",
        "Hermes may not publish, message customers, price, sign, collect payment, or add contacts.",
        "Hermes tasks must remain tied to an approved project task."
      ]
    },
    openclaw: {
      autonomy_mode: process.env.OPENCLAW_AUTONOMY_MODE ?? "approval_gated",
      require_approval: booleanFromEnv(
        "REQUIRE_APPROVAL_FOR_EXTERNAL_AUTOMATION",
        true
      ),
      rules: [
        "OpenClaw may suggest workflow and selector optimizations from observed automation results.",
        "OpenClaw may execute external browser/tool actions only after approval.",
        "OpenClaw receives task-bounded prompts, not open-ended autonomy."
      ]
    }
  };
}

export function getGovernanceOverview() {
  return {
    policy: getGovernancePolicy(),
    usage: getUsageSnapshot()
  };
}

export function reviewTaskExecution({
  task,
  model_route,
  tool_evaluation,
  approval_id
}) {
  const policy = getGovernancePolicy();
  const usage = getUsageSnapshot();
  const assignedTools = task.assigned_tools ?? [];
  const violations = [];
  const warnings = [];

  if (!PROJECT_AGENT_TYPES.includes(task.agent_type)) {
    violations.push(`Agent is outside project scope: ${task.agent_type}`);
  }

  const blockedTools = tool_evaluation.blocked ?? [];
  if (blockedTools.length > 0) {
    violations.push(
      `Disallowed tools: ${blockedTools
        .map((tool) => tool.tool_name)
        .join(", ")}`
    );
  }

  const inputTokenEstimate = estimateTokens(
    JSON.stringify({
      objective: task.objective,
      input_context: task.input_context,
      assigned_tools: assignedTools,
      model_route
    })
  );

  if (inputTokenEstimate > policy.budgets.max_task_input_tokens) {
    violations.push(
      `Task input budget exceeded: ${inputTokenEstimate}/${policy.budgets.max_task_input_tokens}`
    );
  }

  if (
    model_route.provider !== "stub" &&
    usage.today_model_calls >= policy.budgets.max_daily_model_calls
  ) {
    violations.push(
      `Daily model call budget exceeded: ${usage.today_model_calls}/${policy.budgets.max_daily_model_calls}`
    );
  }

  const externalToolCount = assignedTools.filter((toolName) =>
    EXTERNAL_TOOL_NAMES.includes(toolName)
  ).length;
  if (
    externalToolCount > 0 &&
    usage.today_external_tool_calls + externalToolCount >
      policy.budgets.max_daily_external_tool_calls
  ) {
    violations.push(
      `Daily external tool budget exceeded: ${usage.today_external_tool_calls}/${policy.budgets.max_daily_external_tool_calls}`
    );
  }

  if (assignedTools.includes("hermes_gateway")) {
    const riskyHermesObjective = HERMES_BLOCKED_KEYWORDS.some((word) =>
      task.objective.includes(word)
    );
    if (riskyHermesObjective) {
      violations.push(
        "Hermes is restricted to memory, strategy, research, and long-running analysis; high-risk execution must use dedicated approval-gated agents."
      );
    }
  }

  if (
    assignedTools.some((toolName) => ["openclaw_stub", "platform_api_stub", "platform_connector", "wecom_stub", "wecom_connector"].includes(toolName)) &&
    policy.openclaw.require_approval &&
    !approval_id
  ) {
    warnings.push("External automation is approval-gated.");
  }

  return {
    allowed: policy.mode !== "enforced" || violations.length === 0,
    mode: policy.mode,
    violations,
    warnings,
    budget: {
      input_token_estimate: inputTokenEstimate,
      today_model_calls: usage.today_model_calls,
      today_external_tool_calls: usage.today_external_tool_calls
    }
  };
}

export function reviewMemoryUpdate({ task, memory_update }) {
  const policy = getGovernancePolicy();
  const violations = [];
  const memoryType = memory_update.type;
  const content = `${memory_update.title ?? ""}\n${memory_update.content ?? ""}`;

  if (!ALLOWED_MEMORY_TYPES.includes(memoryType)) {
    violations.push(`Unsupported memory type: ${memoryType}`);
  }

  if (content.length > policy.budgets.max_memory_update_chars) {
    violations.push(
      `Memory update is too large: ${content.length}/${policy.budgets.max_memory_update_chars}`
    );
  }

  if (SECRET_PATTERNS.some((pattern) => pattern.test(content))) {
    violations.push("Memory update appears to contain a secret or credential.");
  }

  if (!PROJECT_AGENT_TYPES.includes(task.agent_type)) {
    violations.push(`Memory writer is outside project scope: ${task.agent_type}`);
  }

  return {
    allowed: policy.mode !== "enforced" || violations.length === 0,
    violations
  };
}

function getUsageSnapshot() {
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayToolCalls = listToolCalls({ limit: 500 }).filter((toolCall) =>
    toolCall.created_at?.startsWith(todayPrefix)
  );

  return {
    today_model_calls: todayToolCalls.filter((toolCall) =>
      toolCall.tool_name.startsWith("model:")
    ).length,
    today_external_tool_calls: todayToolCalls.filter((toolCall) =>
      EXTERNAL_TOOL_NAMES.includes(toolCall.tool_name)
    ).length,
    today_blocked_calls: todayToolCalls.filter(
      (toolCall) => toolCall.status === "blocked"
    ).length
  };
}

function estimateTokens(text) {
  return Math.ceil(String(text ?? "").length / 4);
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function booleanFromEnv(name, fallback) {
  if (process.env[name] === "true") return true;
  if (process.env[name] === "false") return false;
  return fallback;
}
