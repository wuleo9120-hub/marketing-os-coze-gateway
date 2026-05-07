import "../apps/api/src/core/env-loader.mjs";
import { routeModel } from "../apps/api/src/core/model-router.mjs";
import { generateWithMiniMax } from "../apps/api/src/core/providers/minimax-provider.mjs";

const route = routeModel({
  agent_type: "content_creation",
  risk_level: "L1"
});

try {
  const result = await generateWithMiniMax({
    task: {
      id: "task_probe",
      agent_type: "content_creation",
      objective: "Return a tiny valid JSON AgentResult for connectivity probe.",
      risk_level: "L1",
      input_context: {}
    },
    memories: [],
    agent_context: {
      knowledge_results: [],
      knowledge_summary: []
    },
    model_route: route
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        route,
        summary: String(result.task_summary ?? "").slice(0, 120),
        fields: Object.keys(result).sort()
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        route,
        message: scrub(String(error instanceof Error ? error.message : error))
      },
      null,
      2
    )
  );
  process.exit(1);
}

function scrub(text) {
  const secret = process.env.MINIMAX_API_KEY;
  return secret ? text.replaceAll(secret, "[REDACTED]") : text;
}
