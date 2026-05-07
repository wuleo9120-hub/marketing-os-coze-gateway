const { seedInitialData } = await import("../apps/api/src/data/store.mjs");
const { seedDemoMerchantFlow } = await import(
  "../apps/api/src/core/demo-data.mjs"
);

seedInitialData();

const runId =
  process.argv.slice(2).join(" ").trim() || `demo_terminal_${Date.now()}`;

const result = await seedDemoMerchantFlow({
  run_id: runId
});

console.log(JSON.stringify(result, null, 2));
