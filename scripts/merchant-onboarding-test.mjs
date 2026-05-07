import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-merchant-onboarding-${Date.now()}.json`
);

const { onboardMerchant } = await import(
  "../apps/api/src/core/merchant-onboarding.mjs"
);
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);
const { queryKnowledge } = await import(
  "../apps/api/src/core/knowledge-base.mjs"
);

seedInitialData();

const result = onboardMerchant({
  name: "星河瑜伽馆",
  industry: "本地瑜伽和女性健康管理",
  city: "深圳",
  brand_intro: "主打小班私教、产后修复和办公室肩颈改善。",
  products: "私教体验课\n产后修复套餐\n肩颈改善团课",
  audience: "25-45 岁女性白领、产后妈妈、长期伏案办公人群",
  offer: "首次体验课 99 元，私教课可按阶段定制。",
  price_range: "99-3999 元",
  faq: "体验课多久？\n是否适合零基础？\n产后多久可以开始？",
  compliance: "不承诺医疗效果\n不夸大减肥结果",
  platforms: "douyin,xiaohongshu,shipinhao",
  weixin_personal_qr_url: "https://example.com/qr.png",
  weixin_personal_account_label: "星河瑜伽顾问"
});

assert.equal(result.memories.length, 3);
assert.equal(result.knowledge_documents.length, 3);
assert.ok(result.next_actions.length > 0);

const snapshot = getSnapshot();
assert.equal(snapshot.memories.length, 7);
assert.equal(snapshot.knowledge_documents.length, 3);

const search = queryKnowledge("产后修复 体验课", { limit: 5 });
assert.ok(search.results.length > 0);
assert.match(search.results[0].content, /产后|体验课|瑜伽/);

console.log("merchant-onboarding-test passed", {
  merchant: result.merchant.name,
  memories: result.totals.memories,
  documents: result.totals.knowledge_documents,
  chunks: result.totals.chunks,
  search_hits: search.results.length
});
