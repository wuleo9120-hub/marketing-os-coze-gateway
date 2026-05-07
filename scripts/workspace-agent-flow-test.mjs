import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-workspace-agent-flow-${Date.now()}.json`
);

const { handleUserInstruction } = await import(
  "../apps/api/src/core/orchestrator.mjs"
);
const {
  listMemories,
  listMessages,
  listTasks,
  seedInitialData
} = await import("../apps/api/src/data/store.mjs");

seedInitialData();

const a = await handleUserInstruction("请为 A 商家生成本周内容计划", {
  workspace_id: "merchant_a",
  auto_execute: true
});
const b = await handleUserInstruction("请为 B 商家生成本周内容计划", {
  workspace_id: "merchant_b",
  auto_execute: true
});

assert.equal(a.root_task.workspace_id, "merchant_a");
assert.equal(b.root_task.workspace_id, "merchant_b");
assert.ok(a.child_tasks.every((task) => task.workspace_id === "merchant_a"));
assert.ok(b.child_tasks.every((task) => task.workspace_id === "merchant_b"));

const aTasks = listTasks({ workspace_id: "merchant_a", limit: 100 });
const bTasks = listTasks({ workspace_id: "merchant_b", limit: 100 });
const aMessages = listMessages({ workspace_id: "merchant_a", limit: 100 });
const bMessages = listMessages({ workspace_id: "merchant_b", limit: 100 });
const aMemories = listMemories({ workspace_id: "merchant_a", limit: 100 });
const bMemories = listMemories({ workspace_id: "merchant_b", limit: 100 });

assert.ok(aTasks.length > 0);
assert.ok(bTasks.length > 0);
assert.ok(aMessages.every((message) => message.workspace_id === "merchant_a"));
assert.ok(bMessages.every((message) => message.workspace_id === "merchant_b"));
assert.ok(aMemories.every((memory) => memory.workspace_id === "merchant_a"));
assert.ok(bMemories.every((memory) => memory.workspace_id === "merchant_b"));

console.log("workspace-agent-flow-test passed", {
  merchant_a_tasks: aTasks.length,
  merchant_b_tasks: bTasks.length,
  merchant_a_messages: aMessages.length,
  merchant_b_messages: bMessages.length
});
