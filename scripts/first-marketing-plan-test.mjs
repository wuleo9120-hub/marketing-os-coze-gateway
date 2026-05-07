import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-first-plan-${Date.now()}.json`
);

const { onboardMerchant } = await import(
  "../apps/api/src/core/merchant-onboarding.mjs"
);
const { generateFirstMarketingPlan } = await import(
  "../apps/api/src/core/first-marketing-plan.mjs"
);
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

onboardMerchant({
  name: "星河瑜伽馆",
  industry: "本地瑜伽和女性健康管理",
  city: "深圳",
  brand_intro: "主打小班私教、产后修复和办公室肩颈改善。",
  products: "私教体验课\n产后修复套餐\n肩颈改善团课",
  audience: "25-45 岁女性白领、产后妈妈、长期伏案办公人群",
  offer: "首次体验课 99 元，私教课可按阶段定制。",
  faq: "体验课多久？\n是否适合零基础？",
  compliance: "不承诺医疗效果\n不夸大减肥结果",
  platforms: "douyin,xiaohongshu,shipinhao",
  weixin_personal_account_label: "星河瑜伽顾问"
});

const result = generateFirstMarketingPlan({
  run_id: "first_plan_test"
});

assert.equal(result.content_assets.length, 3);
assert.equal(result.publishing_packages.length, 3);
assert.equal(result.knowledge_documents.length, 2);
assert.equal(result.metrics.length, 12);
assert.ok(result.experiment.id);
assert.ok(result.strategy_review_memory_id);

const snapshot = getSnapshot();
assert.ok(snapshot.content_assets.length >= 6);
assert.ok(snapshot.publishing_jobs.length >= 3);
assert.ok(snapshot.performance_metrics.length >= 12);
assert.ok(
  snapshot.memories.some((memory) =>
    memory.title.includes("星河瑜伽馆 首轮营销计划")
  )
);

console.log("first-marketing-plan-test passed", {
  merchant: result.merchant.name,
  assets: result.content_assets.length,
  packages: result.publishing_packages.length,
  metrics: result.metrics.length,
  experiment: result.experiment.id
});
