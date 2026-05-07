import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getRuntimeConfig } from "../config-registry.mjs";

const DEFAULT_TIMEOUT_MS = 8000;
const HERMES_CLI_PATH = process.env.HERMES_CLI_PATH ?? "/Users/mac/.local/bin/hermes";
const MAX_HERMES_PROMPT_CHARS = Number(
  process.env.MAX_HERMES_PROMPT_CHARS ?? 16000
);
const execFileAsync = promisify(execFile);

export function getHermesConfig() {
  const config = getRuntimeConfig("hermes");
  return {
    gateway_url: config.value,
    configured: config.configured,
    mode: config.mode,
    env_var: config.env_var,
    cli_path: HERMES_CLI_PATH
  };
}

export async function getHermesStatus() {
  const config = getHermesConfig();

  if (!config.configured) {
    const cli = await getHermesCliStatus();
    if (cli.available) {
      return {
        ok: true,
        configured: true,
        mode: "cli",
        status: "cli_available",
        cli_path: config.cli_path,
        message:
          "HERMES_GATEWAY_URL is not configured, but Hermes CLI is available for local supervised execution."
      };
    }

    return {
      ok: true,
      configured: false,
      mode: "stub",
      status: "not_configured",
      message:
        "HERMES_GATEWAY_URL is not configured. Hermes calls will use local stub behavior."
    };
  }

  try {
    const response = await fetchWithTimeout(
      new URL("/health", config.gateway_url),
      {
        method: "GET"
      }
    );

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

export async function runHermesTask(request) {
  const config = getHermesConfig();

  if (!config.configured) {
    const cli = await getHermesCliStatus();
    if (cli.available) {
      return runHermesCliTask(request, config);
    }

    return {
      mode: "stub",
      status: "completed",
      session_id: `hermes_stub_${request.task.id}`,
      summary:
        "Hermes gateway is not configured, so this task was represented as a local Hermes stub call.",
      result: {
        task_summary: "Prepared a Hermes long-running agent execution request.",
        key_findings: [
          `Task: ${request.task.id}`,
          `Agent: ${request.task.agent_type}`,
          "Hermes gateway not configured"
        ],
        artifacts: [`hermes_stub:${request.task.id}`],
        memory_updates: [
          {
            type: "workflow",
            title: `Hermes execution stub for ${request.task.id}`,
            content: JSON.stringify(
              {
                task: request.task,
                memories_used: request.memories?.length ?? 0,
                retrieved_knowledge:
                  request.agent_context?.knowledge_summary ?? [],
                mode: "stub"
              },
              null,
              2
            ),
            importance: 3
          }
        ],
        next_actions: [
          "Configure HERMES_GATEWAY_URL to execute this through Hermes."
        ],
        risk_flags: []
      }
    };
  }

  const response = await fetchWithTimeout(new URL("/tasks", config.gateway_url), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      task: request.task,
      memories: request.memories ?? [],
      retrieved_knowledge: request.agent_context?.knowledge_results ?? [],
      expected_schema: "AgentResult"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Hermes gateway failed: ${response.status} ${body}`);
  }

  return {
    mode: "gateway",
    status: "submitted",
    body: await response.json()
  };
}

async function getHermesCliStatus() {
  try {
    await access(HERMES_CLI_PATH);
    return {
      available: true,
      path: HERMES_CLI_PATH
    };
  } catch {
    return {
      available: false,
      path: HERMES_CLI_PATH
    };
  }
}

async function runHermesCliTask(request, config) {
  const prompt = buildHermesPrompt(request);
  if (prompt.length > MAX_HERMES_PROMPT_CHARS) {
    return {
      mode: "cli",
      status: "blocked",
      session_id: `hermes_cli_blocked_${request.task.id}`,
      summary: "Hermes CLI prompt exceeded the configured prompt budget.",
      result: {
        task_summary: "Hermes execution was blocked by prompt budget controls.",
        key_findings: [
          `Prompt characters: ${prompt.length}`,
          `Limit: ${MAX_HERMES_PROMPT_CHARS}`
        ],
        artifacts: [`hermes_cli_blocked:${request.task.id}`],
        memory_updates: [],
        next_actions: [
          "Reduce retrieved memory or knowledge context before retrying Hermes."
        ],
        risk_flags: ["Hermes prompt budget exceeded."]
      }
    };
  }

  try {
    const { stdout } = await execFileAsync(
      config.cli_path,
      ["-z", prompt],
      {
        timeout: Number(process.env.HERMES_CLI_TIMEOUT_MS ?? 120000),
        maxBuffer: 1024 * 1024
      }
    );
    const result = parseAgentResult(stdout);

    return {
      mode: "cli",
      status: "completed",
      session_id: `hermes_cli_${request.task.id}`,
      summary: "Hermes CLI completed the task using its configured model.",
      result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      mode: "cli",
      status: "failed",
      session_id: `hermes_cli_${request.task.id}`,
      summary: "Hermes CLI was available but failed during execution.",
      result: {
        task_summary: "Hermes CLI execution failed and needs operator attention.",
        key_findings: [
          `Task: ${request.task.id}`,
          `Agent: ${request.task.agent_type}`,
          `Hermes CLI: ${config.cli_path}`,
          `Error: ${message.slice(0, 240)}`
        ],
        artifacts: [`hermes_cli_failed:${request.task.id}`],
        memory_updates: [],
        next_actions: [
          "Run the same Hermes command from a normal terminal if Codex sandbox permissions blocked local logs.",
          "Use stub or Codex supervised provider until Hermes CLI execution succeeds."
        ],
        risk_flags: [message.slice(0, 240)]
      }
    };
  }
}

function buildHermesPrompt(request) {
  return [
    "You are executing a task for an AI-native marketing automation system.",
    "Return only valid JSON matching this AgentResult schema:",
    JSON.stringify(
      {
        task_summary: "string",
        key_findings: ["string"],
        artifacts: ["string"],
        memory_updates: [
          {
            type: "strategy|brand|content|customer|tool|workflow",
            title: "string",
            content: "string",
            importance: "integer 1-5"
          }
        ],
        next_actions: ["string"],
        risk_flags: ["string"]
      },
      null,
      2
    ),
    "Task payload:",
    JSON.stringify(
      {
        task: request.task,
        memories: request.memories ?? [],
        retrieved_knowledge: request.agent_context?.knowledge_results ?? []
      },
      null,
      2
    )
  ].join("\n\n");
}

function parseAgentResult(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Hermes CLI did not return valid AgentResult JSON.");
  }
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
