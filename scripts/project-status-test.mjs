import assert from "node:assert/strict";

import { getProjectStatus } from "../apps/api/src/core/project-status.mjs";

const status = getProjectStatus();

assert.equal(status.summary.stage, "MVP 可跑通，真实外部平台接入准备中");
assert.ok(status.summary.progress_percent > 0);
assert.ok(status.phases.some((phase) => phase.id === "foundation"));
assert.ok(status.phases.some((phase) => phase.id === "real_integrations"));
assert.ok(status.next_tasks.some((task) => task.id === "wechat_intake_ui"));
assert.ok(status.counts.tools > 0);
assert.equal(status.readiness.governance_mode, "enforced");

console.log("project-status-test passed", {
  progress_percent: status.summary.progress_percent,
  phases: status.phases.length,
  next_tasks: status.next_tasks.length,
  tools: status.counts.tools
});
