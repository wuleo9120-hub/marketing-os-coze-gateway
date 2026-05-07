import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-governance-${Date.now()}.json`
);
process.env.MAX_DAILY_MODEL_CALLS = "100";
process.env.MAX_DAILY_EXTERNAL_TOOL_CALLS = "100";

const { createTask, getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);
const { reviewMemoryUpdate } = await import(
  "../apps/api/src/core/governance.mjs"
);
const { runTask } = await import("../apps/api/src/core/task-executor.mjs");

seedInitialData();

const safeTask = createTask({
  agent_type: "brand_strategy",
  objective: "Extract the campaign audience and offer from approved materials.",
  risk_level: "L1",
  assigned_tools: ["memory"]
});

const safeResult = await runTask(safeTask);
if (safeResult.status !== "completed") {
  throw new Error("Expected safe brand strategy task to complete.");
}

process.env.MAX_DAILY_MODEL_CALLS = "1";

const budgetTask = createTask({
  agent_type: "content_creation",
  objective: "Generate one short approved marketing caption.",
  risk_level: "L1",
  assigned_tools: ["memory", "content_generator_stub"]
});

const budgetResult = await runTask(budgetTask);
if (budgetResult.status !== "blocked") {
  throw new Error("Expected governance guard to block model budget overflow.");
}

process.env.MAX_DAILY_MODEL_CALLS = "100";

const hermesTask = createTask({
  agent_type: "brand_strategy",
  objective: "Use Hermes to 添加微信 and close the customer directly.",
  risk_level: "L2",
  assigned_tools: ["memory", "hermes_gateway"]
});

const hermesResult = await runTask(hermesTask);
if (hermesResult.status !== "blocked") {
  throw new Error("Expected governance guard to block high-risk Hermes autonomy.");
}

const secretMemoryReview = reviewMemoryUpdate({
  task: safeTask,
  memory_update: {
    type: "strategy",
    title: "Do not store credentials",
    content: "MINIMAX_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456",
    importance: 4
  }
});

if (secretMemoryReview.allowed) {
  throw new Error("Expected governance guard to reject secret-like memory.");
}

const snapshot = getSnapshot();
const report = {
  safe_task: safeResult.status,
  budget_task: budgetResult.status,
  hermes_task: hermesResult.status,
  governance_calls: snapshot.tool_calls.filter(
    (toolCall) => toolCall.tool_name === "governance_guard"
  ).length,
  blocked_calls: snapshot.tool_calls.filter(
    (toolCall) => toolCall.status === "blocked"
  ).length,
  secret_memory_allowed: secretMemoryReview.allowed
};

console.log(JSON.stringify(report, null, 2));
