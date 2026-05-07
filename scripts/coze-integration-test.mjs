import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const openapi = readFileSync("integrations/coze/openapi.yaml", "utf8");
const guide = readFileSync("docs/coze-integration-guide.md", "utf8");

for (const expected of [
  "Marketing OS Coze Gateway",
  "x-coze-token",
  "/api/coze/chat",
  "/api/coze/merchant/onboarding",
  "/api/coze/marketing/first-plan",
  "/api/coze/crm/messages",
  "/api/coze/publishing/review"
]) {
  assert.match(openapi, new RegExp(escapeRegExp(expected)));
}

for (const expected of [
  "COZE_PLUGIN_ENABLED=true",
  "COZE_PLUGIN_TOKEN",
  "integrations/coze/openapi.yaml",
  "Do not give Coze direct Hermes, OpenClaw, MiniMax, or Codex credentials",
  "High-risk actions must stay inside Marketing OS"
]) {
  assert.match(guide, new RegExp(escapeRegExp(expected)));
}

console.log("coze-integration-test passed", {
  openapi_bytes: Buffer.byteLength(openapi),
  guide_bytes: Buffer.byteLength(guide)
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
