process.env.OPENAI_API_KEY = "sk-test-secret-value-123456";
process.env.MINIMAX_API_KEY = "minimax-test-secret-value-123456";
process.env.MINIMAX_MODEL = "MiniMax-M2.7";
process.env.CODEX_GATEWAY_URL = "http://127.0.0.1:9090";
process.env.CODEX_GATEWAY_TOKEN = "codex-test-secret-value-123456";
process.env.HERMES_GATEWAY_URL = "http://127.0.0.1:9191";
process.env.OPENCLAW_BASE_URL = "http://127.0.0.1:9292";
process.env.PLATFORM_CONNECTOR_URL = "http://127.0.0.1:9393";
process.env.WECOM_CONNECTOR_URL = "http://127.0.0.1:9494";
process.env.WEIXIN_PERSONAL_QR_URL = "https://example.com/weixin-qr.png";

const {
  getConfigOverview,
  getRuntimeConfig,
  getRuntimeConfigValue,
  isRuntimeConfigConfigured
} = await import("../apps/api/src/core/config-registry.mjs");
const { getHermesConfig } = await import(
  "../apps/api/src/core/connectors/hermes-gateway.mjs"
);
const { getOpenClawConfig } = await import(
  "../apps/api/src/core/connectors/openclaw-connector.mjs"
);
const { getPlatformConnectorConfig } = await import(
  "../apps/api/src/core/connectors/platform-connector.mjs"
);
const { getWeComConfig } = await import(
  "../apps/api/src/core/connectors/wecom-connector.mjs"
);
const { routeModel } = await import("../apps/api/src/core/model-router.mjs");
const { listTools } = await import("../apps/api/src/core/tool-registry.mjs");

const overview = getConfigOverview();
const openai = getRuntimeConfig("openai");
const minimaxRoute = routeModel({
  agent_type: "content_creation",
  risk_level: "L1"
});
const codexRoute = routeModel({
  agent_type: "orchestrator",
  risk_level: "L3"
});
const tools = listTools();

if (overview.totals.configured !== overview.totals.items) {
  throw new Error("Expected all runtime config items to be configured.");
}

if (openai.masked_value.includes("secret-value")) {
  throw new Error("Expected OpenAI key to be masked in config overview.");
}

if (getRuntimeConfigValue("openai") !== process.env.OPENAI_API_KEY) {
  throw new Error("Expected runtime config value to expose process value internally.");
}

if (!isRuntimeConfigConfigured("platform_connector")) {
  throw new Error("Expected platform connector config to be configured.");
}

if (minimaxRoute.provider !== "minimax") {
  throw new Error(
    `Expected content_creation to choose minimax, got ${minimaxRoute.provider}`
  );
}

if (codexRoute.provider !== "codex_supervised") {
  throw new Error(
    `Expected orchestrator to choose codex_supervised, got ${codexRoute.provider}`
  );
}

for (const toolName of [
  "model:openai",
  "model:minimax",
  "model:codex_supervised",
  "hermes_gateway",
  "openclaw_stub",
  "platform_connector",
  "wecom_connector"
]) {
  const tool = tools.find((item) => item.name === toolName);
  if (!tool?.configured) {
    throw new Error(`Expected configured tool: ${toolName}`);
  }
}

const report = {
  totals: overview.totals,
  openai: {
    configured: openai.configured,
    masked_value: openai.masked_value
  },
  routes: {
    content_creation: minimaxRoute,
    orchestrator: codexRoute
  },
  connectors: {
    hermes: getHermesConfig(),
    openclaw: getOpenClawConfig(),
    platform: getPlatformConnectorConfig(),
    wecom: getWeComConfig()
  },
  configured_tool_count: tools.filter((tool) => tool.configured).length
};

console.log(JSON.stringify(report, null, 2));
