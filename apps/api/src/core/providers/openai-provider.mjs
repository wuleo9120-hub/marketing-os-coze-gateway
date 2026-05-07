import { getRuntimeConfigValue } from "../config-registry.mjs";

export async function generateWithOpenAI(request) {
  const apiKey = getRuntimeConfigValue("openai");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: request.model_route.selected_model,
      input: [
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
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  const text = extractResponseText(payload);
  return JSON.parse(text);
}

function extractResponseText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  const parts = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}
