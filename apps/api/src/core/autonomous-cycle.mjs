import { createMemory, getSnapshot } from "../data/store.mjs";
import { handleUserInstruction } from "./orchestrator.mjs";
import { runAgentOptimization } from "./agent-optimizer.mjs";
import { runPendingTasks } from "./task-executor.mjs";

export async function runAutonomousCycle(input = {}) {
  const startedAt = new Date().toISOString();
  const instruction =
    input.instruction ??
    "请系统自主检查当前自动化营销系统状态，生成下一阶段低风险建设任务并自动执行。";
  const before = summarizeSnapshot(getSnapshot());

  const plan = input.create_plan === false
    ? null
      : await handleUserInstruction(instruction, {
        workspace_id: input.workspace_id,
        auto_execute: true
      });

  const queueExecution = await runPendingTasks({
    workspace_id: input.workspace_id
  });
  const optimization = runAgentOptimization({
    workspace_id: input.workspace_id,
    title: input.title ?? `Autonomous cycle optimization ${startedAt}`
  });
  const after = summarizeSnapshot(getSnapshot());

  const cycleMemory = createMemory({
    workspace_id: input.workspace_id,
    memory_type: "workflow",
    title: input.title ?? `Autonomous cycle ${startedAt}`,
    content: JSON.stringify(
      {
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        instruction,
        before,
        after,
        plan: plan
          ? {
              root_task_id: plan.root_task.id,
              child_task_ids: plan.child_tasks.map((task) => task.id),
              execution_summary: plan.execution_summary
            }
          : null,
        queue_execution: queueExecution,
        optimization: {
          memory_id: optimization.memory.id,
          recommendations: optimization.recommendations.map((item) => ({
            priority: item.priority,
            title: item.title,
            requires_approval: item.requires_approval
          })),
          experiment_ids: optimization.experiments.map((experiment) => experiment.id),
          approval_required: optimization.approval_required.length
        }
      },
      null,
      2
    ),
    summary: buildSummary({ before, after, queueExecution, optimization }),
    source_type: "autonomous_cycle",
    source_id: plan?.root_task.id ?? null,
    created_by_agent: "orchestrator",
    importance: optimization.approval_required.length > 0 ? 4 : 3
  });

  return {
    cycle_memory: cycleMemory,
    instruction,
    before,
    after,
    plan: plan
      ? {
          root_task_id: plan.root_task.id,
          child_task_count: plan.child_tasks.length,
          execution_summary: plan.execution_summary
        }
      : null,
    queue_execution: queueExecution,
    optimization: {
      memory_id: optimization.memory.id,
      recommendations: optimization.recommendations,
      experiments: optimization.experiments,
      approval_required: optimization.approval_required
    }
  };
}

function summarizeSnapshot(snapshot) {
  return {
    tasks: snapshot.tasks.length,
    queued_tasks: snapshot.tasks.filter((task) => task.status === "queued").length,
    completed_tasks: snapshot.tasks.filter((task) => task.status === "completed").length,
    failed_tasks: snapshot.tasks.filter((task) => task.status === "failed").length,
    pending_approvals: snapshot.approvals.filter(
      (approval) => approval.status === "pending"
    ).length,
    memories: snapshot.memories.length,
    knowledge_documents: snapshot.knowledge_documents.length,
    experiments: snapshot.experiments.length,
    content_assets: snapshot.content_assets.length,
    publishing_jobs: snapshot.publishing_jobs.length,
    leads: snapshot.leads.length,
    tool_calls: snapshot.tool_calls.length
  };
}

function buildSummary({ before, after, queueExecution, optimization }) {
  return [
    `Queued tasks: ${before.queued_tasks} -> ${after.queued_tasks}`,
    `Executed: ${queueExecution.executed}`,
    `Waiting approval: ${queueExecution.waiting_approval}`,
    `Failed: ${queueExecution.failed}`,
    `Optimization recommendations: ${optimization.recommendations.length}`,
    `New experiments: ${optimization.experiments.length}`
  ].join(" | ");
}
