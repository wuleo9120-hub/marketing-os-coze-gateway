import {
  createApproval,
  createMemory,
  createToolCall,
  getTask,
  getApprovalForTask,
  listMemories,
  listTasks,
  updateTask,
  updateToolCall
} from "../data/store.mjs";
import { buildAgentContext } from "./agent-context.mjs";
import { runStrategyReview } from "./analytics-review.mjs";
import { runHermesTask } from "./connectors/hermes-gateway.mjs";
import { runOpenClawTask } from "./connectors/openclaw-connector.mjs";
import {
  createAssetsFromAgentResult,
  createPublishingPackagesForTask
} from "./content-ops.mjs";
import { reviewMemoryUpdate, reviewTaskExecution } from "./governance.mjs";
import { routeModel } from "./model-router.mjs";
import { generateAgentResult } from "./providers/index.mjs";
import { evaluateTaskTools, evaluateToolUse, maxRisk } from "./tool-registry.mjs";

export async function runPendingTasks(options = {}) {
  const queuedTasks = listTasks({
    workspace_id: options.workspace_id,
    status: "queued",
    limit: 200
  })
    .reverse()
    .filter((task) =>
      options.parent_task_id ? task.parent_task_id === options.parent_task_id : true
    );

  const results = [];

  for (const task of queuedTasks) {
    results.push(await runTask(task));
  }

  return {
    executed: results.filter((result) => result.status === "completed").length,
    waiting_approval: results.filter(
      (result) => result.status === "waiting_approval"
    ).length,
    failed: results.filter((result) => result.status === "failed").length,
    results
  };
}

export async function runTask(task) {
  const approval = getApprovalForTask(task.id);
  const approvalAllowsExecution = approval?.status === "approved";
  const toolEvaluation = evaluateTaskTools(task);
  const effectiveRisk = maxRisk([task.risk_level, toolEvaluation.max_risk_level]);

  if (
    (
      task.approval_required ||
      toolEvaluation.requires_approval ||
      effectiveRisk === "L3" ||
      effectiveRisk === "L4"
    ) &&
    !approvalAllowsExecution
  ) {
    const approval =
      getApprovalForTask(task.id) ??
      createApproval({
        workspace_id: task.workspace_id,
        task_id: task.id,
        title: `Approval required for ${task.agent_type}`,
        description: buildApprovalDescription(task, toolEvaluation),
        risk_level: effectiveRisk
      });

    updateTask(task.id, {
      status: "waiting_approval",
      output_result: {
        task_summary: "Task is waiting for approval before execution.",
        key_findings: [
          `Risk level: ${effectiveRisk}`,
          `Tool risk level: ${toolEvaluation.max_risk_level}`
        ],
        artifacts: [approval.id],
        memory_updates: [],
        next_actions: ["Approve this task before running external actions."],
        risk_flags: ["Approval is required."]
      }
    });

    return {
      task_id: task.id,
      status: "waiting_approval",
      approval_id: approval.id
    };
  }

  if (approval?.status === "rejected") {
    updateTask(task.id, {
      status: "rejected",
      output_result: {
        task_summary: "Task was rejected and will not execute.",
        key_findings: [`Risk level: ${task.risk_level}`],
        artifacts: [approval.id],
        memory_updates: [],
        next_actions: ["Create a revised task if execution is still needed."],
        risk_flags: ["Approval was rejected."]
      },
      finished_at: new Date().toISOString()
    });

    return {
      task_id: task.id,
      status: "rejected",
      approval_id: approval.id
    };
  }

  updateTask(task.id, {
    status: "running",
    started_at: new Date().toISOString()
  });

  const modelRoute = routeModel({
    agent_type: task.agent_type,
    task_type: task.input_context?.expected_output ?? "agent_task",
    risk_level: task.risk_level
  });

  const governance = reviewTaskExecution({
    task,
    model_route: modelRoute,
    tool_evaluation: toolEvaluation,
    approval_id: approval?.id ?? null
  });

  const governanceToolCall = createToolCall({
    workspace_id: task.workspace_id,
    task_id: task.id,
    tool_name: "governance_guard",
    risk_level: "L0",
    input_summary: task.objective,
    status: governance.allowed ? "completed" : "blocked",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    output_summary:
      governance.violations.length > 0
        ? governance.violations.join("; ")
        : "Task passed governance review."
  });

  if (!governance.allowed) {
    updateTask(task.id, {
      status: "blocked",
      output_result: {
        task_summary: "Task was blocked by the governance guard.",
        key_findings: governance.violations,
        artifacts: [governanceToolCall.id],
        memory_updates: [],
        next_actions: ["Revise the task so it stays within project policy."],
        risk_flags: governance.violations,
        governance
      },
      finished_at: new Date().toISOString()
    });

    return {
      task_id: task.id,
      status: "blocked",
      governance
    };
  }

  const toolCall = createToolCall({
    workspace_id: task.workspace_id,
    task_id: task.id,
    tool_name: `model:${modelRoute.provider}`,
    risk_level: evaluateToolUse({
      tool_name: `model:${modelRoute.provider}`,
      agent_type: task.agent_type
    }).risk_level,
    input_summary: task.objective,
    status: "running",
    started_at: new Date().toISOString()
  });

  const supportToolCalls = createSupportToolCalls(task, toolEvaluation);

  try {
    const memories = listMemories({
      workspace_id: task.workspace_id,
      limit: 12
    });
    const agentContext = buildAgentContext(task);
    const result = await generateTaskResult({
      task,
      memories,
      agent_context: agentContext,
      model_route: modelRoute,
      approval_id: approval?.id ?? null
    });

    const memoryReviews = [];
    for (const memoryUpdate of result.memory_updates ?? []) {
      const memoryReview = reviewMemoryUpdate({
        task,
        memory_update: memoryUpdate
      });
      memoryReviews.push({
        title: memoryUpdate.title,
        type: memoryUpdate.type,
        ...memoryReview
      });
      if (!memoryReview.allowed) continue;

      createMemory({
        workspace_id: task.workspace_id,
        memory_type: memoryUpdate.type,
        title: memoryUpdate.title,
        content: memoryUpdate.content,
        summary: memoryUpdate.content.slice(0, 240),
        source_type: "agent_task",
        source_id: task.id,
        created_by_agent: task.agent_type,
        importance: memoryUpdate.importance
      });
    }

    const contentArtifacts = createContentArtifacts({
      task,
      result,
      approval_id: approval?.id ?? null
    });
    const analyticsReview =
      task.agent_type === "data_review"
        ? runStrategyReview({
            workspace_id: task.workspace_id,
            title: `Strategy review for ${task.id}`
          })
        : null;

    updateToolCall(toolCall.id, {
      status: "completed",
      output_summary: result.task_summary,
      finished_at: new Date().toISOString()
    });

    for (const supportToolCall of supportToolCalls) {
      updateToolCall(supportToolCall.id, {
        status: "completed",
        output_summary: `Authorized ${supportToolCall.tool_name} for ${task.agent_type}.`,
        finished_at: new Date().toISOString()
      });
    }

    updateTask(task.id, {
      status: "completed",
      output_result: {
        ...result,
        content_artifacts: contentArtifacts,
        analytics_review: analyticsReview,
        model_route: modelRoute,
        governance,
        memory_reviews: memoryReviews,
        tool_evaluation: toolEvaluation,
        agent_context: {
          retrieval_query: agentContext.retrieval_query,
          knowledge_result_count: agentContext.knowledge_results.length,
          knowledge_summary: agentContext.knowledge_summary
        }
      },
      finished_at: new Date().toISOString()
    });

    return {
      task_id: task.id,
      status: "completed",
      model_route: modelRoute
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    updateToolCall(toolCall.id, {
      status: "failed",
      output_summary: message,
      finished_at: new Date().toISOString()
    });

    for (const supportToolCall of supportToolCalls) {
      updateToolCall(supportToolCall.id, {
        status: "failed",
        output_summary: message,
        finished_at: new Date().toISOString()
      });
    }

    updateTask(task.id, {
      status: "failed",
      output_result: {
        task_summary: "Task execution failed.",
        key_findings: [],
        artifacts: [],
        memory_updates: [],
        next_actions: ["Inspect the task error and retry."],
        risk_flags: [message]
      },
      finished_at: new Date().toISOString()
    });

    return {
      task_id: task.id,
      status: "failed",
      error: message
    };
  }
}

function createContentArtifacts({ task, result, approval_id }) {
  if (["content_creation", "video_production"].includes(task.agent_type)) {
    return createAssetsFromAgentResult({ task, result });
  }

  if (task.agent_type === "publishing_ops") {
    return createPublishingPackagesForTask({
      task,
      approval_id
    });
  }

  return [];
}

async function generateTaskResult(request) {
  if (request.task.assigned_tools?.includes("openclaw_stub")) {
    return generateWithOpenClaw(request);
  }

  if (request.task.assigned_tools?.includes("hermes_gateway")) {
    return generateWithHermes(request);
  }

  return generateAgentResult(request);
}

async function generateWithOpenClaw(request) {
  const openClawResult = await runOpenClawTask(request);

  if (openClawResult.result) {
    return {
      ...openClawResult.result,
      artifacts: [
        ...(openClawResult.result.artifacts ?? []),
        `openclaw:${openClawResult.run_id ?? openClawResult.status}`
      ]
    };
  }

  return {
    task_summary: "Submitted task to OpenClaw.",
    key_findings: [
      `OpenClaw mode: ${openClawResult.mode}`,
      `OpenClaw status: ${openClawResult.status}`
    ],
    artifacts: [JSON.stringify(openClawResult.body ?? openClawResult)],
    memory_updates: [
      {
        type: "tool",
        title: `OpenClaw submission for ${request.task.id}`,
        content: JSON.stringify(openClawResult, null, 2),
        importance: 3
      }
    ],
    next_actions: ["Review external automation results before live platform action."],
    risk_flags: [
      "External browser automation must remain sandboxed and approval-gated."
    ]
  };
}

async function generateWithHermes(request) {
  const hermesResult = await runHermesTask(request);

  if (hermesResult.result) {
    return {
      ...hermesResult.result,
      artifacts: [
        ...(hermesResult.result.artifacts ?? []),
        `hermes:${hermesResult.session_id ?? hermesResult.status}`
      ]
    };
  }

  return {
    task_summary: "Submitted task to Hermes gateway.",
    key_findings: [
      `Hermes mode: ${hermesResult.mode}`,
      `Hermes status: ${hermesResult.status}`
    ],
    artifacts: [JSON.stringify(hermesResult.body ?? hermesResult)],
    memory_updates: [
      {
        type: "workflow",
        title: `Hermes submission for ${request.task.id}`,
        content: JSON.stringify(hermesResult, null, 2),
        importance: 3
      }
    ],
    next_actions: ["Poll or receive callback for Hermes task completion."],
    risk_flags: []
  };
}

function createSupportToolCalls(task, toolEvaluation) {
  return toolEvaluation.evaluations
    .filter((evaluation) => evaluation.tool_name !== "approval_gate")
    .map((evaluation) =>
      createToolCall({
        workspace_id: task.workspace_id,
        task_id: task.id,
        tool_name: evaluation.tool_name,
        risk_level: evaluation.risk_level,
        input_summary: `${task.agent_type} requested ${evaluation.tool_name}`,
        status: evaluation.allowed ? "running" : "blocked",
        approval_id: null,
        started_at: evaluation.allowed ? new Date().toISOString() : null,
        output_summary: evaluation.allowed ? null : evaluation.reason
      })
    );
}

function buildApprovalDescription(task, toolEvaluation) {
  const riskyTools = toolEvaluation.evaluations
    .filter((evaluation) => evaluation.requires_approval)
    .map((evaluation) => `${evaluation.tool_name} (${evaluation.risk_level})`);

  if (riskyTools.length === 0) return task.objective;

  return `${task.objective}\n\nRequires approval because of tools: ${riskyTools.join(", ")}`;
}

export async function runApprovedTask(taskId) {
  const task = getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const approval = getApprovalForTask(task.id);
  if (!approval || approval.status !== "approved") {
    throw new Error(`Task is not approved: ${taskId}`);
  }

  return runTask({
    ...task,
    status: "queued"
  });
}
