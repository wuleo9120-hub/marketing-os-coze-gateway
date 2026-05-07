import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-metric-review-${Date.now()}.json`
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
  run_id: "metric_review_plan"
});
const jobId = plan.publishing_packages[0].publishing_job_id;
markPublishingJobPublished({
  publishing_job_id: jobId,
  external_post_url: "https://example.com/post/metric-review",
  metrics: {
    views: 1800,
    likes: 130,
    comments: 32,
    shares: 12,
    leads: 9
  }
});

const result = runMetricReviewLoop({
  run_id: "metric_review_test"
});

assert.ok(result.loop_memory.id);
assert.ok(result.strategy_review_memory_id);
assert.ok(result.recommendations.length > 0);
assert.ok(result.experiment.id);
assert.equal(result.tasks.length, 2);
assert.equal(result.analytics_summary.published_jobs, 1);

const snapshot = getSnapshot();
assert.ok(snapshot.tasks.some((task) => task.input_context?.source === "metric_review_loop"));
assert.ok(snapshot.memories.some((memory) => memory.source_type === "metric_review_loop"));

console.log("metric-review-loop-test passed", {
  recommendations: result.recommendations.length,
  tasks: result.tasks.length,
  experiment: result.experiment.id,
  published_jobs: result.analytics_summary.published_jobs
});
