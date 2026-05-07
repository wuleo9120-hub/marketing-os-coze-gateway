import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-tools-${Date.now()}.json`
);

const { handleUserInstruction } = await import(
  "../apps/api/src/core/orchestrator.mjs"
);
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);
const { listTools } = await import("../apps/api/src/core/tool-registry.mjs");

seedInitialData();

await handleUserInstruction("请生成抖音发布包并发布前等待审批。", {
  auto_execute: true
});

const snapshot = getSnapshot();
const tools = listTools();
const publishingApproval = snapshot.approvals.find((approval) =>
  approval.description.includes("platform_api_stub")
);
const lowRiskToolCalls = snapshot.tool_calls.filter((toolCall) =>
  ["memory", "content_generator_stub", "analytics_stub"].includes(
    toolCall.tool_name
  )
);

if (!publishingApproval) {
  throw new Error("Expected publishing tool approval to be created.");
}

if (lowRiskToolCalls.length === 0) {
  throw new Error("Expected low-risk support tool calls to be recorded.");
}

const report = {
  registered_tools: tools.length,
  publishing_approval: {
    id: publishingApproval.id,
    risk_level: publishingApproval.risk_level,
    status: publishingApproval.status
  },
  low_risk_tool_calls: lowRiskToolCalls.length,
  configured_tools: tools.filter((tool) => tool.configured).length,
  unconfigured_tools: tools.filter((tool) => !tool.configured).map((tool) => tool.name)
};

console.log(JSON.stringify(report, null, 2));

