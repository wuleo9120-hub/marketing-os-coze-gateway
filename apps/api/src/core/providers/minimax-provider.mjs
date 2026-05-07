import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getRuntimeConfigValue } from "../config-registry.mjs";

const execFileAsync = promisify(execFile);
const REQUEST_TIMEOUT_MS = Number(process.env.MINIMAX_TIMEOUT_MS ?? 8000);

export async function generateWithMiniMax(request) {
  const apiKey = getRuntimeConfigValue("minimax");
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured.");
  }

  const baseUrl = getRuntimeConfigValue("minimax_base_url");
  const model = request.model_route.selected_model ?? getRuntimeConfigValue("minimax_model");
  const payload = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an agent in an AI-native marketing automation system. Return only valid JSON matching the AgentResult schema."
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: request.task,
              memories: request.memories,
              retrieved_knowledge: request.agent_context?.knowledge_results ?? [],
              required_schema: {
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
              }
            },
            null,
            2
          )
        }
      ],
      response_format: {
        type: "json_object"
      }
    };
  const response = await postJsonWithFallback({
    url: `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    apiKey,
    payload
  });

  if (!response.ok) {
    throw new Error(`MiniMax request failed: ${response.status} ${response.body}`);
  }

  const text = extractChatCompletionText(response.body);
  return JSON.parse(text);
}

async function postJsonWithFallback({ url, apiKey, payload }) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: parseJsonBody(text)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error?.cause?.code;
    if (message !== "fetch failed" && code !== "ENOTFOUND") {
      throw error;
    }

    return postJsonWithCurl({ url, apiKey, payload });
  }
}

async function postJsonWithCurl({ url, apiKey, payload }) {
  const stdout = await runCurl({ url, apiKey, payload }).catch(async (error) => {
    if (url.includes("api.minimax.io")) {
      return runCurl({
        url: url.replace("api.minimax.io", "api.minimaxi.com"),
        apiKey,
        payload
      });
    }

    throw error;
  });

  const splitAt = stdout.lastIndexOf("\n");
  const bodyText = splitAt >= 0 ? stdout.slice(0, splitAt) : stdout;
  const status = Number(splitAt >= 0 ? stdout.slice(splitAt + 1) : 0);

  return {
    ok: status >= 200 && status < 300,
    status,
    body: parseJsonBody(bodyText)
  };
}

async function runCurl({ url, apiKey, payload }) {
  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-sS",
        "--max-time",
        String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
        "-w",
        "\n%{http_code}",
        "-X",
        "POST",
        url,
        "-H",
        `Authorization: Bearer ${apiKey}`,
        "-H",
        "Content-Type: application/json",
        "--data-binary",
        JSON.stringify(payload)
      ],
      {
        timeout: REQUEST_TIMEOUT_MS,
        maxBuffer: 1024 * 1024
      }
    );

    return stdout;
  } catch (error) {
    const stderr = error?.stderr ? scrubSecret(String(error.stderr), apiKey) : "";
    const message = error instanceof Error ? scrubSecret(error.message, apiKey) : String(error);
    throw new Error(`MiniMax curl transport failed: ${stderr || message}`);
  }
}

function parseJsonBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function scrubSecret(text, secret) {
  return text.replaceAll(secret, "[REDACTED]");
}

function extractChatCompletionText(payload) {
  const text = payload.choices?.[0]?.message?.content;
  if (typeof text === "string" && text.trim()) return text.trim();
  throw new Error("MiniMax response did not contain message content.");
}
