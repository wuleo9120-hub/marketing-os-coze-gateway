import { submitBridgeTask, getBridgeHealth } from "../apps/api/src/bridges/openclaw-http-bridge.mjs";

const health = await getBridgeHealth();

const result = await submitBridgeTask({
  dry_run: true,
  sandbox: true,
  action: "research_public_pages",
  task: {
    id: "task_bridge_test",
    agent_type: "platform_research",
    objective: "Prepare a safe public trend research task for OpenClaw bridge.",
    risk_level: "L1"
  },
  memories: [
    {
      title: "Bridge policy",
      summary: "OpenClaw bridge defaults to dry-run and approval-gated execution."
    }
  ],
  retrieved_knowledge: []
});

if (result.status !== "accepted") {
  throw new Error(`Expected bridge dry-run to be accepted: ${result.status}`);
}

if (!result.result?.artifacts?.[0]?.startsWith("openclaw_bridge:")) {
  throw new Error("Expected OpenClaw bridge artifact.");
}

const report = {
  health: {
    service: health.service,
    mode: health.mode,
    openclaw_cli: health.openclaw_cli
  },
  task: {
    status: result.status,
    mode: result.mode,
    action: result.action,
    artifact: result.result.artifacts[0]
  }
};

console.log(JSON.stringify(report, null, 2));
