import "./env-loader.mjs";

const CONFIG_ITEMS = [
  {
    id: "openai",
    display_name: "OpenAI",
    category: "model",
    env_var: "OPENAI_API_KEY",
    secret: true,
    required_for: ["model:openai"],
    fallback_mode: "stub"
  },
  {
    id: "minimax",
    display_name: "MiniMax",
    category: "model",
    env_var: "MINIMAX_API_KEY",
    secret: true,
    required_for: ["model:minimax"],
    fallback_mode: "stub"
  },
  {
    id: "minimax_base_url",
    display_name: "MiniMax Base URL",
    category: "model",
    env_var: "MINIMAX_BASE_URL",
    default_value: "https://api.minimax.io/v1",
    secret: false,
    required_for: [],
    fallback_mode: "default"
  },
  {
    id: "minimax_model",
    display_name: "MiniMax Model",
    category: "model",
    env_var: "MINIMAX_MODEL",
    default_value: "MiniMax-M2.7",
    secret: false,
    required_for: [],
    fallback_mode: "default"
  },
  {
    id: "codex_gateway",
    display_name: "Codex GPT-5.5 Gateway",
    category: "model",
    env_var: "CODEX_GATEWAY_URL",
    secret: false,
    required_for: ["model:codex_supervised"],
    fallback_mode: "supervised"
  },
  {
    id: "codex_model",
    display_name: "Codex Model",
    category: "model",
    env_var: "CODEX_MODEL",
    default_value: "gpt-5.5",
    secret: false,
    required_for: [],
    fallback_mode: "default"
  },
  {
    id: "codex_gateway_token",
    display_name: "Codex Gateway Token",
    category: "model",
    env_var: "CODEX_GATEWAY_TOKEN",
    secret: true,
    required_for: [],
    fallback_mode: "missing"
  },
  {
    id: "hermes",
    display_name: "Hermes Gateway",
    category: "agent_runtime",
    env_var: "HERMES_GATEWAY_URL",
    secret: false,
    required_for: ["hermes_gateway"],
    fallback_mode: "stub"
  },
  {
    id: "openclaw",
    display_name: "OpenClaw Gateway",
    category: "automation",
    env_var: "OPENCLAW_BASE_URL",
    secret: false,
    required_for: ["openclaw_stub"],
    fallback_mode: "stub"
  },
  {
    id: "platform_connector",
    display_name: "Platform Connector",
    category: "publishing",
    env_var: "PLATFORM_CONNECTOR_URL",
    secret: false,
    required_for: ["platform_connector"],
    fallback_mode: "stub"
  },
  {
    id: "wecom_connector",
    display_name: "WeCom Connector",
    category: "messaging",
    env_var: "WECOM_CONNECTOR_URL",
    secret: false,
    required_for: ["wecom_connector"],
    fallback_mode: "stub"
  },
  {
    id: "weixin_personal",
    display_name: "Personal WeChat Assisted Mode",
    category: "messaging",
    env_var: "WEIXIN_PERSONAL_QR_URL",
    secret: false,
    required_for: ["weixin_personal_assist"],
    fallback_mode: "manual"
  }
];

export function listConfigItems() {
  return CONFIG_ITEMS.map((item) => buildConfigStatus(item));
}

export function getConfigOverview() {
  const items = listConfigItems();

  return {
    totals: {
      items: items.length,
      configured: items.filter((item) => item.configured).length,
      missing: items.filter((item) => !item.configured).length
    },
    items
  };
}

export function getRuntimeConfig(id) {
  const item = CONFIG_ITEMS.find((candidate) => candidate.id === id);
  if (!item) {
    throw new Error(`Unknown runtime config: ${id}`);
  }

  const value = process.env[item.env_var] || item.default_value || null;

  return {
    ...buildConfigStatus(item),
    value
  };
}

export function isRuntimeConfigConfigured(id) {
  return getRuntimeConfig(id).configured;
}

export function getRuntimeConfigValue(id) {
  return getRuntimeConfig(id).value;
}

export function getConfigForTool(toolName) {
  const item = CONFIG_ITEMS.find((candidate) =>
    candidate.required_for.includes(toolName)
  );

  return item ? buildConfigStatus(item) : null;
}

function buildConfigStatus(item) {
  const value = process.env[item.env_var] || item.default_value || null;
  const source = process.env[item.env_var] ? "environment" : item.default_value ? "default" : null;
  return {
    id: item.id,
    display_name: item.display_name,
    category: item.category,
    env_var: item.env_var,
    configured: Boolean(value),
    mode: value ? "gateway" : item.fallback_mode,
    source,
    masked_value: value ? maskValue(value, item.secret) : null,
    required_for: item.required_for,
    secret: item.secret
  };
}

function maskValue(value, secret) {
  if (!value) return null;
  if (!secret) return value;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
