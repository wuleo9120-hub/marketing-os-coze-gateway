import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-demo-flow-${Date.now()}.json`
);

const { seedInitialData } = await import("../apps/api/src/data/store.mjs");
const { seedDemoMerchantFlow } = await import(
  "../apps/api/src/core/demo-data.mjs"
);

seedInitialData();

const result = await seedDemoMerchantFlow({
  run_id: "demo_test"
});

if (result.knowledge_documents.length < 3) {
  throw new Error("Expected demo knowledge documents.");
}

if (result.content_assets.length < 3) {
  throw new Error("Expected demo content assets.");
}

if (result.publishing_packages.length < 9) {
  throw new Error("Expected platform publishing packages.");
}

if (result.metric_sync.metric_count === 0) {
  throw new Error("Expected demo platform metrics.");
}

if (result.crm.leads.length < 3) {
  throw new Error("Expected demo leads.");
}

if (result.crm.handoffs.length === 0) {
  throw new Error("Expected high-intent demo handoffs.");
}

if (result.autonomous_cycle.failed > 0) {
  throw new Error("Expected autonomous cycle to complete without failures.");
}

const report = {
  run_id: result.run_id,
  merchant: result.merchant.name,
  knowledge_documents: result.knowledge_documents.length,
  content_assets: result.content_assets.length,
  publishing_packages: result.publishing_packages.length,
  submitted_jobs: result.submitted_jobs.length,
  metrics: result.metric_sync.metric_count,
  leads: result.crm.leads.length,
  handoffs: result.crm.handoffs.length,
  strategy_memory_id: result.strategy_review.memory_id,
  optimization_memory_id: result.optimization.memory_id,
  autonomous_cycle: result.autonomous_cycle,
  totals: result.totals
};

console.log(JSON.stringify(report, null, 2));
