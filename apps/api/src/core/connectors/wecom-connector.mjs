import {
  createLeadRecord,
  getLeadConversation,
  receiveCustomerMessage
} from "../customer-service.mjs";
import { getRuntimeConfig } from "../config-registry.mjs";

const DEFAULT_TIMEOUT_MS = 8000;

export function getWeComConfig() {
  const config = getRuntimeConfig("wecom_connector");
  return {
    base_url: config.value,
    configured: config.configured,
    mode: config.mode,
    env_var: config.env_var
  };
}

export async function getWeComStatus() {
  const config = getWeComConfig();

  if (!config.configured) {
    return {
      ok: true,
      configured: false,
      mode: "stub",
      status: "not_configured",
      message:
        "WECOM_CONNECTOR_URL is not configured. WeCom lead intake uses local stub behavior."
    };
  }

  try {
    const response = await fetchWithTimeout(new URL("/health", config.base_url), {
      method: "GET"
    });

    return {
      ok: response.ok,
      configured: true,
      mode: "gateway",
      status: response.ok ? "reachable" : "unhealthy",
      status_code: response.status,
      body: await safeJson(response)
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      mode: "gateway",
      status: "unreachable",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function ingestWeComLead(input) {
  const config = getWeComConfig();

  if (!config.configured) {
    const lead = createLeadRecord({
      source_platform: input.source_platform ?? "wecom",
      source_content_id: input.source_content_id,
      display_name: input.display_name ?? "企微客户",
      contact_method: "wecom",
      contact_value: input.external_user_id ?? input.contact_value ?? "pending",
      summary: input.summary ?? "Imported from WeCom connector stub."
    });

    return {
      mode: "stub",
      lead,
      external_user_id: input.external_user_id ?? null
    };
  }

  const response = await fetchWithTimeout(new URL("/leads", config.base_url), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WeCom lead intake failed: ${response.status} ${body}`);
  }

  const body = await response.json();
  const lead = createLeadRecord({
    source_platform: body.source_platform ?? "wecom",
    source_content_id: body.source_content_id,
    display_name: body.display_name,
    contact_method: "wecom",
    contact_value: body.external_user_id ?? body.contact_value,
    summary: body.summary
  });

  return {
    mode: "gateway",
    lead,
    gateway_response: body
  };
}

export async function receiveWeComMessage(input) {
  const result = receiveCustomerMessage({
    lead_id: input.lead_id,
    content: input.content
  });

  return {
    mode: getWeComConfig().mode,
    result,
    conversation: getLeadConversation(input.lead_id)
  };
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
