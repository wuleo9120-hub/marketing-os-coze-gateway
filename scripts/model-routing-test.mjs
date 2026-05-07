import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-model-routing-${Date.now()}.json`
);
process.env.MINIMAX_API_KEY = "minimax-test-secret-value-123456";
delete process.env.CODEX_GATEWAY_URL;
delete process.env.CODEX_GATEWAY_TOKEN;

const { routeModel } = await import("../apps/api/src/core/model-router.mjs");
const { generateAgentResult } = await import(
  "../apps/api/src/core/providers/index.mjs"
);
const { createTask, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

const expectedRoutes = {
  orchestrator: "codex_supervised",
  brand_strategy: "codex_supervised",
  data_review: "codex_supervised",
  sales_assist: "codex_supervised",
  platform_research: "minimax",
  content_creation: "minimax",
  video_production: "minimax",
  publishing_ops: "minimax",
  customer_service: "minimax"
};

const routes = Object.fromEntries(
  Object.entries(expectedRoutes).map(([agentType]) => [
    agentType,
    routeModel({
      agent_type: agentType,
      risk_level: agentType === "publishing_ops" ? "L3" : "L1"
    })
  ])
);

for (const [agentType, provider] of Object.entries(expectedRoutes)) {
  if (routes[agentType].provider !== provider) {
    throw new Error(
      `Expected ${agentType} to use ${provider}, got ${routes[agentType].provider}`
    );
  }
}

const codexTask = createTask({
  agent_type: "brand_strategy",
  objective: "设计高层品牌策略。",
  risk_level: "L1",
  assigned_tools: ["memory"]
});

const codexResult = await generateAgentResult({
  task: codexTask,
  memories: [],
  agent_context: {
    knowledge_results: [],
    knowledge_summary: []
  },
  model_route: routes.brand_strategy
});

if (!codexResult.artifacts.includes(`codex_supervised:${codexTask.id}`)) {
  throw new Error("Expected Codex supervised provider to create handoff artifact.");
}

const report = {
  routes,
  codex_supervised_artifacts: codexResult.artifacts,
  codex_supervised_next_actions: codexResult.next_actions
};

console.log(JSON.stringify(report, null, 2));
