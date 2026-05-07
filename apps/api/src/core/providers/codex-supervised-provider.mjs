import {
  getRuntimeConfigValue,
  isRuntimeConfigConfigured
} from "../config-registry.mjs";

const DEFAULT_TIMEOUT_MS = 8000;

export async function generateWithCodexSupervised(request) {
  if (isRuntimeConfigConfigured("codex_gateway")) {
    return submitToCodexGateway(request);
  }

  return {
    task_summary:
      "Prepared a Codex GPT-5.5 supervised execution request. No direct Codex gateway is configured, so this task is ready for human-triggered Codex handling.",
    key_findings: [
      `Agent type: ${request.task.agent_type}`,
      `Task: ${request.task.id}`,
      "Provider target: Codex GPT-5.5",
      "CODEX_GATEWAY_URL is not configured; direct background execution is unavailable."
    ],
    artifacts: [`codex_supervised:${request.task.id}`],
    memory_updates: [
      {
        type: "workflow",
        title: `Codex GPT-5.5 supervised task ${request.task.id}`,
        content: JSON.stringify(
          {
            task: request.task,
            model_route: request.model_route,
            retrieved_knowledge:
              request.agent_context?.knowledge_summary ?? [],
            next_operator_action:
              "Open this task in Codex and let GPT-5.5 produce the final high-reasoning output."
          },
          null,
          2
        ),
        importance: 4
      }
    ],
    next_actions: [
      "Handle this task in the Codex session with GPT-5.5, or configure CODEX_GATEWAY_URL for automated supervised execution.",
      "Use MiniMax-M2.7 for the downstream high-throughput execution agents."
    ],
    risk_flags: [
      "Codex GPT-5.5 is not exposed as a normal application API in this local runtime."
    ]
  };
}

async function submitToCodexGateway(request) {
  const gatewayUrl = getRuntimeConfigValue("codex_gateway");
  const token = getRuntimeConfigValue("codex_gateway_token");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(new URL("/agent-tasks", gatewayUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
    body: JSON.stringify({
        model: request.model_route.selected_model ?? getRuntimeConfigValue("codex_model"),
        task: request.task,
        memories: request.memories ?? [],
        retrieved_knowledge: request.agent_context?.knowledge_results ?? [],
        expected_schema: "AgentResult"
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Codex gateway failed: ${response.status} ${body}`);
    }

    const body = await response.json();
    return body.result ?? body;
  } finally {
    clearTimeout(timeout);
  }
}
