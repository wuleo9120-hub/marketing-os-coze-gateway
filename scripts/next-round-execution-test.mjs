import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-next-round-${Date.now()}.json`
);

const { onboardMerchant } = await import(
  "../apps/api/src/core/merchant-onboarding.mjs"
);
const { generateFirstMarketingPlan } = await import(
  "../apps/api/src/core/first-marketing-plan.mjs"
);
const { markPublishingJobPublished } = await import(
  "../apps/api/src/core/publishing-review.mjs"
);
const { runMetricReviewLoop } = await import(
  "../apps/api/src/core/metric-review-loop.mjs"
);
const { executeNextRoundTasks } = await import(
  "../apps/api/src/core/next-round-execution.mjs"
);
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

onboardMerchant({
  name: "星河瑜伽馆",
  industry: "本地瑜伽和女性健康管理",
  brand_intro: "主打小班私教、产后修复和办公室肩颈改善。",
  products: "私教体验课\n产后修复套餐",
  audience: "25-45 岁女性白领和产后妈妈",
  platforms: "douyin,xiaohongshu,shipinhao"
});

const plan = generateFirstMarketingPlan({
  run_id: "next_round_plan"
});
markPublishingJobPublished({
  publishing_job_id: plan.publishing_packages[0].publishing_job_id,
  external_post_url: "https://example.com/post/next-round",
  metrics: {
    views: 1600,
    likes: 110,
    comments: 28,
    shares: 9,
    leads: 7
  }
});
runMetricReviewLoop({
  run_id: "next_round_metric_review"
});

const result = await executeNextRoundTasks({
  run_id: "next_round_execution_test"
});

assert.equal(result.execution_summary.queued, 2);
assert.equal(result.execution_summary.completed, 2);
assert.ok(result.content_assets.length >= 1);
assert.ok(result.publishing_packages.length >= 3);
assert.ok(result.memory.id);

const snapshot = getSnapshot();
assert.ok(
  snapshot.memories.some((memory) => memory.source_type === "next_round_execution")
);
assert.ok(
  snapshot.publishing_jobs.some((job) => job.status === "pending_approval")
);

console.log("next-round-execution-test passed", {
  queued: result.execution_summary.queued,
  completed: result.execution_summary.completed,
  assets: result.content_assets.length,
  packages: result.publishing_packages.length
});
