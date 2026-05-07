import {
  getRuntimeConfigValue,
  isRuntimeConfigConfigured
} from "./config-registry.mjs";

const DEFAULT_RULES = [
  {
    agent_type: "orchestrator",
    model_tier: "S",
    reasoning: "high",
    provider_hint: "codex_supervised",
    selected_model: "gpt-5.5",
    fallback: "stub"
  },
  {
    agent_type: "brand_strategy",
    model_tier: "A",
    reasoning: "medium",
    provider_hint: "codex_supervised",
    selected_model: "gpt-5.5",
    fallback: "stub"
  },
  {
    agent_type: "platform_research",
    model_tier: "A",
    reasoning: "medium",
    provider_hint: "minimax",
    selected_model: "MiniMax-M2.7",
    fallback: "stub"
  },
  {
    agent_type: "content_creation",
    model_tier: "B",
    reasoning: "medium",
    provider_hint: "minimax",
    selected_model: "MiniMax-M2.7",
    fallback: "stub"
  },
  {
    agent_type: "video_production",
    model_tier: "B",
    reasoning: "medium",
    provider_hint: "minimax",
    selected_model: "MiniMax-M2.7",
    fallback: "stub"
  },
  {
    agent_type: "publishing_ops",
    model_tier: "B",
    reasoning: "low",
    provider_hint: "minimax",
    selected_model: "MiniMax-M2.7",
    fallback: "stub"
  },
  {
    agent_type: "customer_service",
    model_tier: "B",
    reasoning: "low",
    provider_hint: "minimax",
    selected_model: "MiniMax-M2.7",
    fallback: "stub"
  },
  {
    agent_type: "data_review",
    model_tier: "A",
    reasoning: "medium",
    provider_hint: "codex_supervised",
    selected_model: "gpt-5.5",
    fallback: "stub"
  },
  {
    agent_type: "sales_assist",
    model_tier: "A",
    reasoning: "medium",
    provider_hint: "codex_supervised",
    selected_model: "gpt-5.5",
    fallback: "stub"
  }
];

const RISK_ESCALATION = {
  L0: null,
  L1: null,
  L2: "B",
  L3: "A",
  L4: "S"
};

export function routeModel(request) {
  const rule =
    DEFAULT_RULES.find((item) => item.agent_type === request.agent_type) ??
    DEFAULT_RULES[0];

  const escalatedTier = RISK_ESCALATION[request.risk_level] ?? null;
  const modelTier = maxTier(rule.model_tier, escalatedTier);
  const provider = selectProvider(rule.provider_hint);

  return {
    provider,
    model_tier: modelTier,
    reasoning: modelTier === "S" ? "high" : rule.reasoning,
    requires_real_model: request.requires_real_model ?? false,
    selected_model: selectModelName({ modelTier, provider, rule }),
    fallback: rule.fallback
  };
}

function selectProvider(providerHint) {
  if (providerHint === "codex_supervised") return "codex_supervised";
  if (providerHint === "minimax") {
    return isRuntimeConfigConfigured("minimax") ? "minimax" : "stub";
  }
  if (providerHint === "openai") {
    return isRuntimeConfigConfigured("openai") ? "openai" : "stub";
  }
  return "stub";
}

function maxTier(a, b) {
  const order = ["C", "B", "A", "S"];
  if (!b) return a;
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function selectModelName({ modelTier, provider, rule }) {
  if (provider === "codex_supervised") return getRuntimeConfigValue("codex_model");
  if (provider === "minimax") {
    return getRuntimeConfigValue("minimax_model") ?? rule.selected_model;
  }
  if (provider === "openai") {
    if (modelTier === "S") return "gpt-5.5";
    if (modelTier === "A") return "gpt-5.4";
    if (modelTier === "B") return "gpt-5.4-mini";
    return "gpt-5.4-nano";
  }
  return rule.selected_model ?? "stub";
}
