import assert from "node:assert/strict";

import { getIntegrationReadiness } from "../apps/api/src/core/integration-readiness.mjs";

const readiness = getIntegrationReadiness();

assert.equal(readiness.summary.integrations, 5);
assert.ok(readiness.items.some((item) => item.id === "douyin"));
assert.ok(readiness.items.some((item) => item.id === "wecom"));
assert.ok(readiness.items.some((item) => item.id === "weixin_personal"));

for (const item of readiness.items) {
  assert.ok(item.platform);
  assert.ok(item.readiness);
  assert.ok(Array.isArray(item.acquisition_steps));
  assert.ok(Array.isArray(item.fallback_paths));
  assert.ok(Array.isArray(item.source_urls));
}

const wecom = readiness.items.find((item) => item.id === "wecom");
assert.ok(
  wecom.required_env.some((env) => env.name === "WECOM_EXTERNAL_CONTACT_SECRET")
);

console.log("integration-readiness-test passed", {
  integrations: readiness.summary.integrations,
  ready: readiness.summary.ready,
  needs_action: readiness.summary.needs_action
});
