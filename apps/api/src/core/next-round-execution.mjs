import {
  createMemory,
  listContentAssets,
  listTasks
} from "../data/store.mjs";
import { createPublishingPackage } from "./content-ops.mjs";
import { runTask } from "./task-executor.mjs";

export async function executeNextRoundTasks(input = {}) {
  const runId = input.run_id ?? `next_round_${Date.now()}`;
  const workspaceId = input.workspace_id;
  const queuedTasks = listTasks({
    workspace_id: workspaceId,
    status: "queued",
    limit: 200
  })
    .reverse()
    .filter((task) => task.input_context?.source === "metric_review_loop");
  const beforeAssetIds = new Set(
    listContentAssets({ workspace_id: workspaceId, limit: 500 }).map(
      (asset) => asset.id
    )
  );

  const executions = [];
  for (const task of queuedTasks) {
    executions.push(await runTask(task));
  }

  const executedTaskIds = new Set(executions.map((item) => item.task_id));
  const newDraftAssets = listContentAssets({
    workspace_id: workspaceId,
    limit: 500
  }).filter(
    (asset) =>
      !beforeAssetIds.has(asset.id) &&
      executedTaskIds.has(asset.created_by_task_id) &&
      ["draft", "pending_approval"].includes(asset.status)
  );
  const publishingPackages = newDraftAssets.flatMap((asset) =>
    createPublishingPackage({
      workspace_id: workspaceId,
      content_asset_id: asset.id,
      platforms: input.platforms
    })
  );

  const memory = createMemory({
    workspace_id: workspaceId,
    memory_type: "workflow",
    title: `下一轮内容任务执行 ${runId}`,
    content: JSON.stringify(
      {
        run_id: runId,
        queued_task_ids: queuedTasks.map((task) => task.id),
        executions,
        new_draft_assets: newDraftAssets,
        publishing_packages: publishingPackages.map((item) => ({
          asset_id: item.asset.id,
          publishing_job_id: item.publishing_job.id,
          platform: item.publishing_job.platform
        }))
      },
      null,
      2
    ),
    summary:
      `Executed ${executions.length} next-round tasks, created ` +
      `${newDraftAssets.length} assets and ${publishingPackages.length} publishing packages.`,
    source_type: "next_round_execution",
    source_id: runId,
    created_by_agent: "orchestrator",
    importance: 4
  });

  return {
    run_id: runId,
    memory,
    execution_summary: {
      queued: queuedTasks.length,
      completed: executions.filter((item) => item.status === "completed").length,
      waiting_approval: executions.filter(
        (item) => item.status === "waiting_approval"
      ).length,
      failed: executions.filter((item) => item.status === "failed").length
    },
    executions,
    content_assets: newDraftAssets,
    publishing_packages: publishingPackages.map((item) => ({
      asset_id: item.asset.id,
      asset_title: item.asset.title,
      publishing_job_id: item.publishing_job.id,
      platform: item.publishing_job.platform,
      status: item.publishing_job.status
    })),
    next_actions: [
      "在发布审核中检查新生成的发布包。",
      "人工确认后发布，并回填平台链接和真实指标。",
      "下一轮继续运行真实指标复盘循环。"
    ]
  };
}
