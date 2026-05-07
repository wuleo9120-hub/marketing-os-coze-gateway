import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-hermes-${Date.now()}.json`
);

const { createTask, getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);
const { getHermesStatus } = await import(
  "../apps/api/src/core/connectors/hermes-gateway.mjs"
);
const { runTask } = await import("../apps/api/src/core/task-executor.mjs");

seedInitialData();

const task = createTask({
  agent_type: "brand_strategy",
  objective:
    "Use Hermes as the long-running agent runtime to prepare a brand strategy memory update.",
  input_context: {
    expected_output: "Hermes-backed brand strategy scaffold"
  },
  risk_level: "L2",
  approval_required: false,
  assigned_tools: ["memory", "hermes_gateway"]
});

const status = await getHermesStatus();
const execution = await runTask(task);
const snapshot = getSnapshot();

const hermesToolCall = snapshot.tool_calls.find(
  (toolCall) => toolCall.tool_name === "hermes_gateway"
);

if (!hermesToolCall) {
  throw new Error("Expected Hermes tool call to be recorded.");
}

if (execution.status !== "completed") {
  throw new Error(`Expected Hermes task to complete in stub mode: ${execution.status}`);
}

const report = {
  hermes_status: status,
  execution,
  hermes_tool_call: {
    id: hermesToolCall.id,
    status: hermesToolCall.status,
    risk_level: hermesToolCall.risk_level
  },
  totals: {
    tasks: snapshot.tasks.length,
    tool_calls: snapshot.tool_calls.length,
    memories: snapshot.memories.length
  }
};

console.log(JSON.stringify(report, null, 2));

