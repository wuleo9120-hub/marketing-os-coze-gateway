import { getRuntimeConfig } from "../config-registry.mjs";

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_OPENCLAW_PAYLOAD_CHARS = Number(
  process.env.MAX_OPENCLAW_PAYLOAD_CHARS ?? 16000
);

export function getOpenClawConfig() {
  const config = getRuntimeConfig("openclaw");
  return {
    base_url: config.value,
    configured: config.configured,
    mode: config.mode,
    env_var: config.env_var
  };
}

export async function getOpenClawStatus() {
  const config = getOpenClawConfig();

  if (!config.configured) {
    return {
      ok: true,
      configured: false,
      mode: "stub",
      status: "not_configured",
      message:
        "OPENCLAW_BASE_URL is not configured. OpenClaw calls will use local stub behavior."
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

export async function runOpenClawTask(request) {
  const config = getOpenClawConfig();
  const action = inferAction(request.task);
  const payload = {
    task: request.task,
    action,
    memories: request.memories ?? [],
    retrieved_knowledge: request.agent_context?.knowledge_results ?? [],
    sandbox: true,
    approval_id: request.approval_id ?? null
  };
  const payloadText = JSON.stringify(payload);

  if (payloadText.length > MAX_OPENCLAW_PAYLOAD_CHARS) {
    return {
      mode: config.configured ? "gateway" : "stub",
      status: "blocked",
      run_id: `openclaw_blocked_${request.task.id}`,
      action,
      summary: "OpenClaw payload exceeded the configured payload budget.",
      result: {
        task_summary: "OpenClaw execution was blocked by payload budget controls.",
        key_findings: [
          `Payload characters: ${payloadText.length}`,
          `Limit: ${MAX_OPENCLAW_PAYLOAD_CHARS}`
        ],
        artifacts: [`openclaw_blocked:${request.task.id}`],
        memory_updates: [],
        next_actions: [
          "Reduce retrieved memory or knowledge context before retrying OpenClaw."
        ],
        risk_flags: ["OpenClaw payload budget exceeded."]
      }
    };
  }

  if (!config.configured) {
    return {
      mode: "stub",
      status: "completed",
      run_id: `openclaw_stub_${request.task.id}`,
      action,
      summary:
        "OpenClaw is not configured, so this external automation was represented as a local stub call.",
      result: {
        task_summary: "Prepared a controlled OpenClaw automation request.",
        key_findings: [
          `Task: ${request.task.id}`,
          `Agent: ${request.task.agent_type}`,
          `Action: ${action}`,
          "OpenClaw base URL not configured"
        ],
        artifacts: [`openclaw_stub:${request.task.id}`],
        memory_updates: [
          {
            type: "tool",
            title: `OpenClaw execution stub for ${request.task.id}`,
            content: JSON.stringify(
              {
                task: request.task,
                action,
                mode: "stub",
                retrieved_knowledge:
                  request.agent_context?.knowledge_summary ?? [],
                policy:
                  "No real browser or external account action was executed."
              },
              null,
              2
            ),
            importance: 3
          }
        ],
        next_actions: [
          "Configure OPENCLAW_BASE_URL and keep approval gates enabled before live automation."
        ],
        risk_flags: [
          "External browser automation must remain sandboxed and approval-gated."
        ]
      }
    };
  }

  let response;
  try {
    response = await fetchWithTimeout(new URL("/tasks", config.base_url), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: payloadText
    });
  } catch (error) {
    return buildGatewayUnavailableResult({
      request,
      action,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  if (!response.ok) {
    const body = await response.text();
    return buildGatewayUnavailableResult({
      request,
      action,
      message: `OpenClaw request failed: ${response.status} ${body.slice(0, 240)}`
    });
  }

  return {
    mode: "gateway",
    status: "submitted",
    body: await response.json()
  };
}

function buildGatewayUnavailableResult({ request, action, message }) {
  return {
    mode: "gateway",
    status: "gateway_unavailable",
    run_id: `openclaw_unavailable_${request.task.id}`,
    action,
    summary:
      "OpenClaw gateway is configured but unavailable, so no external automation was executed.",
    result: {
      task_summary: "OpenClaw gateway was unavailable; task stayed in controlled fallback mode.",
      key_findings: [
        `Task: ${request.task.id}`,
        `Agent: ${request.task.agent_type}`,
        `Action: ${action}`,
        `Gateway error: ${message}`
      ],
      artifacts: [`openclaw_gateway_unavailable:${request.task.id}`],
      memory_updates: [
        {
          type: "tool",
          title: `OpenClaw unavailable for ${request.task.id}`,
          content: JSON.stringify(
            {
              task_id: request.task.id,
              action,
              gateway_error: message,
              policy:
                "No real browser or external account action was executed because the gateway was unavailable."
            },
            null,
            2
          ),
          importance: 3
        }
      ],
      next_actions: [
        "Start ./scripts/openclaw-bridge.sh before retrying live bridge execution.",
        "Keep high-risk platform actions approval-gated."
      ],
      risk_flags: ["OpenClaw gateway unavailable; external automation skipped."]
    }
  };
}

function inferAction(task) {
  if (task.agent_type === "publishing_ops") return "create_platform_draft";
  if (task.agent_type === "platform_research") return "research_public_pages";
  return "controlled_browser_task";
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
