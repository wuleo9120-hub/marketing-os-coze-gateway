import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OPENCLAW_BIN =
  process.env.OPENCLAW_BIN ?? "/Users/mac/.openclaw/bin/openclaw";
const BRIDGE_HOST = process.env.OPENCLAW_BRIDGE_HOST ?? "127.0.0.1";
const BRIDGE_PORT = Number(process.env.OPENCLAW_BRIDGE_PORT ?? 9292);
const CLI_TIMEOUT_MS = Number(process.env.OPENCLAW_BRIDGE_CLI_TIMEOUT_MS ?? 5000);
const MAX_BODY_BYTES = Number(process.env.OPENCLAW_BRIDGE_MAX_BODY_BYTES ?? 512000);

export function createOpenClawBridgeServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (url.pathname === "/health") {
        return sendJson(response, 200, await getBridgeHealth());
      }

      if (url.pathname === "/tasks" && request.method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 202, await submitBridgeTask(body));
      }

      return sendJson(response, 404, {
        ok: false,
        error: "not_found"
      });
    } catch (error) {
      return sendJson(response, Number(error?.statusCode ?? 500), {
        ok: false,
        error: Number(error?.statusCode ?? 500) >= 500 ? "internal_error" : "bad_request",
        message:
          Number(error?.statusCode ?? 500) >= 500
            ? "OpenClaw bridge internal error."
            : error.message
      });
    }
  });
}

export async function getBridgeHealth() {
  const cli = await runOpenClawCli(["health", "--json", "--timeout", "2000"]);

  return {
    ok: true,
    service: "openclaw-http-bridge",
    mode: "cli_bridge",
    openclaw_bin: OPENCLAW_BIN,
    openclaw_cli: cli.ok ? "reachable" : "cli_unreachable",
    openclaw_health: cli.ok ? parseJson(cli.stdout) : null,
    message: cli.ok
      ? "OpenClaw CLI health probe succeeded."
      : "OpenClaw CLI is installed but the gateway health probe did not succeed.",
    diagnostic: cli.ok ? null : scrubText(cli.stderr || cli.error || "")
  };
}

export async function submitBridgeTask(input) {
  const task = input.task ?? {};
  const action = input.action ?? inferAction(task);
  const dryRun = input.dry_run ?? input.sandbox ?? true;
  const runId = `openclaw_bridge_${task.id ?? Date.now()}`;
  const prompt = buildBoundedPrompt({
    task,
    action,
    memories: input.memories ?? [],
    retrieved_knowledge: input.retrieved_knowledge ?? [],
    approval_id: input.approval_id ?? null
  });

  if (dryRun || process.env.OPENCLAW_BRIDGE_AGENT_EXECUTION !== "true") {
    return {
      ok: true,
      mode: "bridge_dry_run",
      status: "accepted",
      run_id: runId,
      action,
      dry_run: true,
      result: buildAgentResult({
        task,
        action,
        runId,
        mode: "bridge_dry_run",
        prompt
      })
    };
  }

  const cli = await runOpenClawCli([
    "agent",
    "--local",
    "--json",
    "--message",
    prompt,
    "--timeout",
    String(Math.ceil(CLI_TIMEOUT_MS / 1000))
  ]);

  if (!cli.ok) {
    return {
      ok: false,
      mode: "bridge_cli",
      status: "failed",
      run_id: runId,
      action,
      result: buildAgentResult({
        task,
        action,
        runId,
        mode: "bridge_cli_failed",
        prompt,
        risk_flags: [scrubText(cli.stderr || cli.error || "OpenClaw CLI failed.")]
      })
    };
  }

  return {
    ok: true,
    mode: "bridge_cli",
    status: "completed",
    run_id: runId,
    action,
    cli_result: parseJson(cli.stdout) ?? scrubText(cli.stdout),
    result: buildAgentResult({
      task,
      action,
      runId,
      mode: "bridge_cli",
      prompt
    })
  };
}

function buildAgentResult({ task, action, runId, mode, prompt, risk_flags = [] }) {
  return {
    task_summary: `OpenClaw bridge prepared controlled automation for ${action}.`,
    key_findings: [
      `Task: ${task.id ?? "unknown"}`,
      `Agent: ${task.agent_type ?? "unknown"}`,
      `Mode: ${mode}`,
      `Prompt characters: ${prompt.length}`
    ],
    artifacts: [`openclaw_bridge:${runId}`],
    memory_updates: [
      {
        type: "tool",
        title: `OpenClaw bridge run ${runId}`,
        content: JSON.stringify(
          {
            task_id: task.id ?? null,
            agent_type: task.agent_type ?? null,
            action,
            mode,
            policy:
              "Bridge uses dry-run by default. Set OPENCLAW_BRIDGE_AGENT_EXECUTION=true only for approved local execution.",
            next_review:
              "Inspect bridge artifacts before enabling live external automation."
          },
          null,
          2
        ),
        importance: 3
      }
    ],
    next_actions: [
      "Review the OpenClaw bridge artifact.",
      "Keep live platform actions behind approval gates."
    ],
    risk_flags
  };
}

function buildBoundedPrompt({ task, action, memories, retrieved_knowledge, approval_id }) {
  return [
    "You are OpenClaw running a bounded task for an AI marketing automation system.",
    "Do not publish, message customers, add contacts, change credentials, or bypass approval.",
    "Return a concise JSON result and note any recommended operator review.",
    JSON.stringify(
      {
        action,
        task,
        approval_id,
        memories: memories.slice(0, 6),
        retrieved_knowledge: retrieved_knowledge.slice(0, 6)
      },
      null,
      2
    )
  ].join("\n\n");
}

function inferAction(task) {
  if (task.agent_type === "publishing_ops") return "create_platform_draft";
  if (task.agent_type === "platform_research") return "research_public_pages";
  return "controlled_browser_task";
}

async function runOpenClawCli(args) {
  try {
    const result = await execFileAsync(OPENCLAW_BIN, args, {
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 1024 * 1024
    });
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw httpError(413, `Request body exceeds ${MAX_BODY_BYTES} bytes.`);
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "Request body must be valid JSON.");
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function scrubText(text) {
  return String(text ?? "")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[redacted]")
    .slice(0, 1000);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createOpenClawBridgeServer().listen(BRIDGE_PORT, BRIDGE_HOST, () => {
    console.log(
      `OpenClaw HTTP bridge listening on http://${BRIDGE_HOST}:${BRIDGE_PORT}`
    );
  });
}
