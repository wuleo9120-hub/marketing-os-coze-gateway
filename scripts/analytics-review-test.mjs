import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-analytics-${Date.now()}.json`
);

const {
  createContentAsset,
  createTask,
  getSnapshot,
  seedInitialData
} = await import("../apps/api/src/data/store.mjs");
const {
  createExperimentRecord,
  getAnalyticsOverview,
  recordMetric,
  runStrategyReview
} = await import("../apps/api/src/core/analytics-review.mjs");
const { runTask } = await import("../apps/api/src/core/task-executor.mjs");

seedInitialData();

const asset = createContentAsset({
  asset_type: "short_video_script",
  title: "AI 自动化营销系统演示脚本",
  body: "展示从选题、生成、分发到线索承接的完整闭环。",
  platform: "douyin",
  status: "draft",
  metadata: {
    topic: "AI 自动化营销"
  }
});

recordMetric({
  entity_type: "content_asset",
  entity_id: asset.id,
  metric_name: "views",
  metric_value: 1200,
  platform: "douyin"
});

recordMetric({
  entity_type: "content_asset",
  entity_id: asset.id,
  metric_name: "comments",
  metric_value: 36,
  platform: "douyin"
});

recordMetric({
  entity_type: "content_asset",
  entity_id: asset.id,
  metric_name: "leads",
  metric_value: 6,
  platform: "douyin"
});

const experiment = createExperimentRecord({
  name: "强 CTA 标题测试",
  hypothesis: "标题加入咨询利益点后，线索率会高于普通科普标题。",
  status: "running",
  related_entity_type: "content_asset",
  related_entity_id: asset.id
});

const manualReview = runStrategyReview({
  title: "Manual analytics review test"
});

const reviewTask = createTask({
  agent_type: "data_review",
  objective: "复盘当前内容数据，生成下一轮营销优化建议。",
  input_context: {
    expected_output: "Metrics and learning plan"
  },
  risk_level: "L1",
  approval_required: false,
  assigned_tools: ["memory", "analytics_stub"]
});

await runTask(reviewTask);

const snapshot = getSnapshot();
const task = snapshot.tasks.find((item) => item.id === reviewTask.id);
const strategyMemories = snapshot.memories.filter(
  (memory) =>
    memory.memory_type === "strategy" &&
    memory.source_type === "analytics_review"
);
const overview = getAnalyticsOverview();

if (overview.totals.metrics < 3) {
  throw new Error("Expected recorded performance metrics.");
}

if (overview.totals.experiments < 1 || experiment.status !== "running") {
  throw new Error("Expected experiment record in analytics overview.");
}

if (!manualReview.memory || strategyMemories.length < 2) {
  throw new Error("Expected analytics review to write strategy memories.");
}

if (!task?.output_result?.analytics_review) {
  throw new Error("Expected data_review task to include analytics review output.");
}

const report = {
  asset: {
    id: asset.id,
    title: asset.title
  },
  overview: overview.totals,
  funnel: overview.funnel,
  top_entity: overview.top_entities[0],
  experiment: {
    id: experiment.id,
    status: experiment.status
  },
  strategy_memory_count: strategyMemories.length,
  data_review_task: {
    id: task.id,
    status: task.status,
    has_analytics_review: Boolean(task.output_result.analytics_review)
  }
};

console.log(JSON.stringify(report, null, 2));
