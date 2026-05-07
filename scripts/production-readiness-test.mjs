import assert from "node:assert/strict";

import { getProductionReadiness } from "../apps/api/src/core/production-readiness.mjs";

const readiness = getProductionReadiness();

assert.equal(readiness.summary.current_storage, "json");
assert.equal(readiness.summary.total, 7);
assert.ok(readiness.checks.some((check) => check.id === "database"));
assert.ok(readiness.checks.some((check) => check.id === "multi_tenant"));
assert.ok(readiness.next_actions.length >= 3);
assert.ok(readiness.store.path);
assert.ok(readiness.governance.budgets.max_daily_model_calls);

console.log("production-readiness-test passed", {
  status: readiness.summary.status,
  readiness_percent: readiness.summary.readiness_percent,
  checks: readiness.summary.total,
  store_size: readiness.store.file_size_bytes
});
