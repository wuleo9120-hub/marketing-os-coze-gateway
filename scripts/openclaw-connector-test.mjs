import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-openclaw-${Date.now()}.json`
);

const { handleUserInstruction } = await import(
  "../apps/api/src/core/orchestrator.mjs"
);
const {
  decideApproval,
  getSnapshot,
  seedInitialData
} = await import("../apps/api/src/data/store.mjs");
const { getOpenClawStatus } = await import(
  "../apps/api/src/core/connectors/openclaw-connector.mjs"
);
const { runApprovedTask } = await import(
  "../apps/api/src/core/task-executor.mjs"
);

seedInitialData();

const status = await getOpenClawStatus();

await handleUserInstruction("请生成抖音发布包并准备通过 OpenClaw 创建发布草稿。", {
  auto_execute: true
});

const firstSnapshot = getSnapshot();
const openClawApproval = firstSnapshot.approvals.find((approval) =>
  approval.description.includes("openclaw_stub")
);

if (!openClawApproval) {
  throw new Error("Expected OpenClaw approval to be created.");
}

const pendingTask = firstSnapshot.tasks.find(
  (task) => task.id === openClawApproval.task_id
);

if (pendingTask?.status !== "waiting_approval") {
  throw new Error("Expected OpenClaw task to wait for approval.");
}

const approved = decideApproval(openClawApproval.id, {
  status: "approved",
  decided_by: "openclaw-connector-test",
  decision_note: "Approved for connector smoke test."
});

const execution = await runApprovedTask(approved.task_id);
const finalSnapshot = getSnapshot();
const openClawToolCall = finalSnapshot.tool_calls.find(
  (toolCall) => toolCall.tool_name === "openclaw_stub"
);

if (!openClawToolCall) {
  throw new Error("Expected OpenClaw tool call to be recorded.");
}

if (execution.status !== "completed") {
  throw new Error(`Expected approved OpenClaw task to complete: ${execution.status}`);
}

const report = {
  openclaw_status: status,
  approval: {
    id: approved.id,
    status: approved.status,
    risk_level: approved.risk_level
  },
  execution,
  openclaw_tool_call: {
    id: openClawToolCall.id,
    status: openClawToolCall.status,
    risk_level: openClawToolCall.risk_level
  },
  totals: {
    tasks: finalSnapshot.tasks.length,
    approvals: finalSnapshot.approvals.length,
    tool_calls: finalSnapshot.tool_calls.length,
    memories: finalSnapshot.memories.length
  }
};

console.log(JSON.stringify(report, null, 2));

