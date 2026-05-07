import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-optimizer-${Date.now()}.json`
);

const {
  createApproval,
  createTask,
  createToolCall,
  getSnapshot,
  seedInitialData
} = await import("../apps/api/src/data/store.mjs");
const { runAgentOptimization } = await import(
  "../apps/api/src/core/agent-optimizer.mjs"
);

seedInitialData();

const task = createTask({
  agent_type: "publishing_ops",
  objective: "Create a publishing draft after approval.",
  risk_level: "L3",
  approval_required: true,
  assigned_tools: ["approval_gate", "openclaw_stub"]
});

createApproval({
  task_id: task.id,
  title: "Publishing needs approval",
  description: "High-risk platform action.",
  risk_level: "L3"
});

createToolCall({
  task_id: task.id,
  tool_name: "openclaw_stub",
  risk_level: "L3",
  input_summary: "OpenClaw dry run",
  status: "blocked",
  output_summary: "Approval required before external automation."
});

const result = runAgentOptimization({
  title: "Agent optimizer test"
});

if (!result.memory?.id) {
  throw new Error("Expected optimization review to write strategy memory.");
}

if (result.recommendations.length === 0) {
  throw new Error("Expected optimization recommendations.");
}

if (result.experiments.length === 0) {
  throw new Error("Expected autonomous low-risk optimization experiments.");
}

const snapshot = getSnapshot();

const report = {
  memory_id: result.memory.id,
  recommendations: result.recommendations.map((item) => ({
    priority: item.priority,
    title: item.title,
    requires_approval: item.requires_approval
  })),
  experiments: result.experiments.map((item) => item.id),
  totals: {
    memories: snapshot.memories.length,
    experiments: snapshot.experiments.length,
    approvals: snapshot.approvals.length
  }
};

console.log(JSON.stringify(report, null, 2));
