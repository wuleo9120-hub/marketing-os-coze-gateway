import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-content-${Date.now()}.json`
);

const { createTask, decideApproval, getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);
const { runTask, runApprovedTask } = await import(
  "../apps/api/src/core/task-executor.mjs"
);

seedInitialData();

const contentTask = createTask({
  agent_type: "content_creation",
  objective: "为 AI 自动化营销系统生成一条短视频脚本。",
  input_context: {
    expected_output: "Script draft"
  },
  risk_level: "L1",
  approval_required: false,
  assigned_tools: ["memory", "content_generator_stub"]
});

const contentExecution = await runTask(contentTask);
let snapshot = getSnapshot();
const sourceAsset = snapshot.content_assets.find(
  (asset) => asset.created_by_task_id === contentTask.id
);

if (!sourceAsset) {
  throw new Error("Expected content asset to be created from content task.");
}

const publishTask = createTask({
  parent_task_id: contentTask.id,
  agent_type: "publishing_ops",
  objective: "基于脚本生成抖音、小红书、视频号发布包。",
  input_context: {
    user_instruction: "生成抖音、小红书、视频号发布包",
    expected_output: "Publishing packages"
  },
  risk_level: "L3",
  approval_required: true,
  assigned_tools: ["approval_gate", "platform_api_stub", "openclaw_stub"]
});

const waiting = await runTask(publishTask);
snapshot = getSnapshot();
const approval = snapshot.approvals.find(
  (item) => item.id === waiting.approval_id
);

if (!approval) {
  throw new Error("Expected publishing approval.");
}

decideApproval(approval.id, {
  status: "approved",
  decided_by: "content-ops-test",
  decision_note: "Approved publishing package generation."
});

const publishExecution = await runApprovedTask(publishTask.id);
snapshot = getSnapshot();
const packages = snapshot.content_assets.filter(
  (asset) => asset.asset_type === "publishing_package"
);
const jobs = snapshot.publishing_jobs;

if (packages.length < 3 || jobs.length < 3) {
  throw new Error("Expected publishing packages and jobs for three platforms.");
}

const report = {
  content_execution: contentExecution,
  source_asset: {
    id: sourceAsset.id,
    title: sourceAsset.title,
    status: sourceAsset.status
  },
  publish_execution: publishExecution,
  packages: packages.map((asset) => ({
    id: asset.id,
    platform: asset.platform,
    status: asset.status
  })),
  jobs: jobs.map((job) => ({
    id: job.id,
    platform: job.platform,
    status: job.status
  }))
};

console.log(JSON.stringify(report, null, 2));

