import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-publishing-review-${Date.now()}.json`
);

const { onboardMerchant } = await import(
  "../apps/api/src/core/merchant-onboarding.mjs"
);
const { generateFirstMarketingPlan } = await import(
  "../apps/api/src/core/first-marketing-plan.mjs"
);
const {
  getPublishingReviewQueue,
  markPublishingJobPublished
} = await import("../apps/api/src/core/publishing-review.mjs");
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

onboardMerchant({
  name: "星河瑜伽馆",
  industry: "本地瑜伽和女性健康管理",
  brand_intro: "主打小班私教、产后修复和办公室肩颈改善。",
  products: "私教体验课\n产后修复套餐\n肩颈改善团课",
  audience: "25-45 岁女性白领、产后妈妈、长期伏案办公人群",
  platforms: "douyin,xiaohongshu,shipinhao"
});

const plan = generateFirstMarketingPlan({
  run_id: "publishing_review_test"
});
const queueBefore = getPublishingReviewQueue();
assert.equal(queueBefore.totals.pending, 3);

const jobId = plan.publishing_packages[0].publishing_job_id;
const published = markPublishingJobPublished({
  publishing_job_id: jobId,
  external_post_url: "https://example.com/post/1",
  metrics: {
    views: 1200,
    likes: 88,
    comments: 16,
    leads: 5
  }
});

assert.equal(published.publishing_job.status, "published_manual");
assert.equal(published.content_asset.status, "published_manual");
assert.equal(published.metrics.length, 5);

const queueAfter = getPublishingReviewQueue();
assert.equal(queueAfter.totals.published, 1);

const snapshot = getSnapshot();
assert.ok(
  snapshot.memories.some((memory) => memory.source_type === "manual_publish")
);
assert.ok(
  snapshot.performance_metrics.some(
    (metric) => metric.metric_name === "views" && metric.metric_value === 1200
  )
);

console.log("publishing-review-test passed", {
  job_id: jobId,
  pending_before: queueBefore.totals.pending,
  published_after: queueAfter.totals.published,
  metrics: published.metrics.length
});
