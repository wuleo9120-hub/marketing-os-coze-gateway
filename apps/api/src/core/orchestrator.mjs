import {
  addMessage,
  createApproval,
  createMemory,
  createTask,
  listMemories,
  updateTask
} from "../data/store.mjs";
import { routeModel } from "./model-router.mjs";
import { runPendingTasks } from "./task-executor.mjs";

const HIGH_RISK_KEYWORDS = [
  "发布",
  "群发",
  "报价",
  "收款",
  "签约",
  "添加微信",
  "加微信",
  "成交",
  "删除"
];

export async function handleUserInstruction(content, options = {}) {
  const workspaceId = options.workspace_id;
  addMessage({ workspace_id: workspaceId, role: "user", content });

  const plan = buildPlan(content);
  const rootTask = createTask({
    workspace_id: workspaceId,
    agent_type: "orchestrator",
    objective: content,
    input_context: {
      intent: plan.intent,
      memory_count: listMemories({ workspace_id: workspaceId, limit: 20 }).length
    },
    risk_level: plan.risk_level,
    approval_required: plan.approval_required,
    assigned_tools: ["memory", "task_board", "approval_gate"]
  });

  updateTask(rootTask.id, {
    status: "running",
    started_at: new Date().toISOString()
  });

  const modelRoute = routeModel({
    agent_type: "orchestrator",
    task_type: plan.intent,
    risk_level: plan.risk_level
  });

  const childTasks = plan.steps.map((step) =>
    createTask({
      workspace_id: workspaceId,
      parent_task_id: rootTask.id,
      agent_type: step.agent_type,
      objective: step.objective,
      input_context: {
        user_instruction: content,
        expected_output: step.expected_output
      },
      risk_level: step.risk_level,
      approval_required: step.approval_required,
      assigned_tools: step.tools
    })
  );

  const memory = createMemory({
    workspace_id: workspaceId,
    memory_type: "workflow",
    title: `Instruction plan: ${content.slice(0, 48)}`,
    content: JSON.stringify(
      {
        instruction: content,
        plan,
        child_task_ids: childTasks.map((task) => task.id),
        model_route: modelRoute
      },
      null,
      2
    ),
    source_type: "agent_task",
    source_id: rootTask.id,
    created_by_agent: "orchestrator",
    importance: plan.approval_required ? 4 : 3
  });

  let approval = null;
  if (plan.approval_required) {
    approval = createApproval({
      workspace_id: workspaceId,
      task_id: rootTask.id,
      title: "High-risk action requires confirmation",
      description:
        "The instruction may involve publishing, customer outreach, pricing, payment, signing, or account-sensitive actions.",
      risk_level: plan.risk_level
    });
  }

  const result = {
    task_summary: "Created a structured multi-agent execution plan.",
    key_findings: [
      `Intent: ${plan.intent}`,
      `Risk level: ${plan.risk_level}`,
      `Model route: ${modelRoute.provider}/${modelRoute.selected_model}`
    ],
    artifacts: [rootTask.id, memory.id],
    memory_updates: [
      {
        type: "workflow",
        title: memory.title,
        content: "Stored the user's instruction and decomposed agent plan.",
        importance: plan.approval_required ? 4 : 3
      }
    ],
    next_actions: plan.next_actions,
    risk_flags: plan.risk_flags
  };

  updateTask(rootTask.id, {
    status: approval ? "waiting_approval" : "completed",
    output_result: result,
    finished_at: approval ? null : new Date().toISOString()
  });

  const executionSummary =
    options.auto_execute === false
      ? null
      : await runPendingTasks({
          workspace_id: workspaceId,
          parent_task_id: rootTask.id
        });

  if (executionSummary) {
    updateTask(rootTask.id, {
      output_result: {
        ...result,
        execution_summary: executionSummary
      }
    });
  }

  const assistantReply = renderAssistantReply(
    plan,
    childTasks,
    approval,
    modelRoute,
    executionSummary
  );

  addMessage({
    workspace_id: workspaceId,
    role: "assistant",
    content: assistantReply,
    metadata: {
      task_id: rootTask.id,
      approval_id: approval?.id ?? null
    }
  });

  return {
    reply: assistantReply,
    root_task: rootTask,
    child_tasks: childTasks,
    approval,
    memory,
    model_route: modelRoute,
    execution_summary: executionSummary
  };
}

function buildPlan(content) {
  const normalized = content.trim();
  const wantsVideo = /视频|剪辑|分镜|配音|字幕/.test(normalized);
  const wantsResearch = /选题|爆款|调研|竞品|平台/.test(normalized);
  const wantsCustomer = /客服|客户|咨询|微信|企微|成交|线索/.test(normalized);
  const wantsPublish = /发布|分发|投放|小红书|抖音|视频号/.test(normalized);
  const wantsOptimization = /优化|改进|复盘|自我学习|学习|进化|效率|成本|安全/.test(normalized);
  const wantsContent =
    wantsVideo ||
    wantsPublish ||
    /内容|文案|脚本|标题|笔记|营销计划|营销方案|制作/.test(normalized) ||
    !wantsOptimization;
  const highRisk = HIGH_RISK_KEYWORDS.some((word) => normalized.includes(word));

  const steps = [
    {
      agent_type: "brand_strategy",
      objective: "Extract the marketing goal, target audience, offer, tone, and compliance constraints.",
      expected_output: "Brand strategy brief",
      risk_level: "L1",
      approval_required: false,
      tools: ["memory"]
    }
  ];

  if (wantsResearch) {
    steps.push({
      agent_type: "platform_research",
      objective: "Prepare a platform research brief using approved samples and public information sources.",
      expected_output: "Trend and topic brief",
      risk_level: "L1",
      approval_required: false,
      tools: ["memory", "browser_research_stub"]
    });
  }

  if (wantsOptimization) {
    steps.push({
      agent_type: "data_review",
      objective:
        "Review agent outcomes, tool calls, memory quality, cost controls, and safety events; propose bounded optimization actions before any high-risk change.",
      expected_output: "Agent optimization proposal and autonomous low-risk action list",
      risk_level: "L1",
      approval_required: false,
      tools: ["memory", "analytics_stub", "hermes_gateway"]
    });
  }

  if (wantsContent) {
    steps.push({
      agent_type: "content_creation",
      objective: "Generate platform-adapted content drafts and calls to action.",
      expected_output: "Scripts, titles, captions, and lead capture prompts",
      risk_level: "L1",
      approval_required: false,
      tools: ["memory", "content_generator_stub"]
    });
  }

  if (wantsVideo) {
    steps.push({
      agent_type: "video_production",
      objective: "Convert approved scripts into shot lists, voiceover prompts, captions, and production assets.",
      expected_output: "Video production package",
      risk_level: "L2",
      approval_required: false,
      tools: ["asset_library_stub", "video_generator_stub"]
    });
  }

  if (wantsPublish) {
    steps.push({
      agent_type: "publishing_ops",
      objective: "Create platform-specific publishing packages and request confirmation before live posting.",
      expected_output: "Publishing jobs and approval request",
      risk_level: "L3",
      approval_required: true,
      tools: ["approval_gate", "platform_api_stub", "openclaw_stub"]
    });
  }

  if (wantsCustomer) {
    steps.push({
      agent_type: "customer_service",
      objective: "Prepare knowledge-grounded lead qualification and customer service workflow.",
      expected_output: "Customer intake flow and handoff rules",
      risk_level: highRisk ? "L3" : "L2",
      approval_required: highRisk,
      tools: ["knowledge_base", "crm_stub", "wecom_stub"]
    });
  }

  if (!steps.some((step) => step.agent_type === "data_review")) {
    steps.push({
      agent_type: "data_review",
      objective: "Define measurement, feedback, and memory update rules for this campaign.",
      expected_output: "Metrics and learning plan",
      risk_level: "L1",
      approval_required: false,
      tools: ["memory", "analytics_stub"]
    });
  }

  return {
    intent: inferIntent(normalized),
    risk_level: highRisk ? "L3" : "L1",
    approval_required: highRisk,
    steps,
    next_actions: [
      "Review the generated task plan.",
      "Add brand materials and knowledge documents.",
      "Connect model and platform credentials when ready.",
      "Approve high-risk execution before publishing or customer outreach."
    ],
    risk_flags: highRisk
      ? ["The instruction touches high-risk execution and needs explicit approval."]
      : []
  };
}

function inferIntent(content) {
  if (/营销计划|方案|策略/.test(content)) return "campaign_planning";
  if (/视频|剪辑|分镜/.test(content)) return "video_production";
  if (/客服|客户|咨询|成交/.test(content)) return "lead_conversion";
  if (/优化|改进|复盘|自我学习|进化/.test(content)) return "agent_optimization";
  if (/发布|分发/.test(content)) return "publishing";
  return "general_marketing_task";
}

function renderAssistantReply(
  plan,
  childTasks,
  approval,
  modelRoute,
  executionSummary
) {
  const lines = [
    `已创建 ${childTasks.length} 个 Agent 子任务。`,
    `意图：${plan.intent}`,
    `风险等级：${plan.risk_level}`,
    `模型路由：${modelRoute.provider}/${modelRoute.selected_model}`,
    "",
    "任务分工：",
    ...childTasks.map(
      (task, index) =>
        `${index + 1}. ${task.agent_type}: ${task.objective}`
    )
  ];

  if (approval) {
    lines.push("", `已生成审批：${approval.id}。正式执行高风险动作前需要确认。`);
  }

  if (executionSummary) {
    lines.push(
      "",
      "自动执行：",
      `- 已完成：${executionSummary.executed}`,
      `- 待审批：${executionSummary.waiting_approval}`,
      `- 失败：${executionSummary.failed}`
    );
  }

  return lines.join("\n");
}
