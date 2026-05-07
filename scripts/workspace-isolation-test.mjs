import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-workspace-isolation-${Date.now()}.json`
);

const {
  createContentAsset,
  createLead,
  createMemory,
  listContentAssets,
  listLeads,
  listMemories,
  listWorkspaces,
  seedInitialData
} = await import("../apps/api/src/data/store.mjs");
const { onboardMerchant } = await import(
  "../apps/api/src/core/merchant-onboarding.mjs"
);
const { generateFirstMarketingPlan } = await import(
  "../apps/api/src/core/first-marketing-plan.mjs"
);
const { queryKnowledge } = await import(
  "../apps/api/src/core/knowledge-base.mjs"
);

seedInitialData();

createMemory({
  workspace_id: "merchant_a",
  memory_type: "brand",
  title: "A brand",
  content: "A only"
});
createMemory({
  workspace_id: "merchant_b",
  memory_type: "brand",
  title: "B brand",
  content: "B only"
});
createLead({
  workspace_id: "merchant_a",
  display_name: "A lead"
});
createContentAsset({
  workspace_id: "merchant_b",
  asset_type: "script",
  title: "B asset",
  body: "B asset body"
});

assert.equal(listMemories({ workspace_id: "merchant_a" }).length, 1);
assert.equal(listMemories({ workspace_id: "merchant_b" }).length, 1);
assert.equal(listLeads({ workspace_id: "merchant_a" }).length, 1);
assert.equal(listLeads({ workspace_id: "merchant_b" }).length, 0);
assert.equal(listContentAssets({ workspace_id: "merchant_a" }).length, 0);
assert.equal(listContentAssets({ workspace_id: "merchant_b" }).length, 1);

const onboarding = onboardMerchant({
  workspace_id: "merchant_c",
  name: "晨光咖啡",
  industry: "本地咖啡店",
  brand_intro: "社区精品咖啡和工作日早餐。",
  audience: "附近上班族和社区居民",
  products: "拿铁\n早餐套餐",
  platforms: "douyin,xiaohongshu"
});

assert.equal(onboarding.workspace.id, "merchant_c");
assert.equal(queryKnowledge("精品咖啡", { workspace_id: "merchant_c" }).results.length > 0, true);
assert.equal(queryKnowledge("精品咖啡", { workspace_id: "merchant_a" }).results.length, 0);

const plan = generateFirstMarketingPlan({
  workspace_id: "merchant_c",
  run_id: "workspace_isolation_plan"
});

assert.equal(plan.merchant.name, "晨光咖啡");
assert.ok(plan.content_assets.every((asset) => asset.workspace_id === "merchant_c"));

const workspaces = listWorkspaces().map((workspace) => workspace.id);
assert.ok(workspaces.includes("default"));
assert.ok(workspaces.includes("merchant_a"));
assert.ok(workspaces.includes("merchant_b"));
assert.ok(workspaces.includes("merchant_c"));

console.log("workspace-isolation-test passed", {
  workspaces: workspaces.length,
  merchant_c_assets: plan.content_assets.length,
  merchant_c_search_hits: queryKnowledge("早餐", {
    workspace_id: "merchant_c"
  }).results.length
});
