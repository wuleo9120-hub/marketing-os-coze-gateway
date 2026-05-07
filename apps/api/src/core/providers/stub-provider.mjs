export async function generateWithStub(request) {
  const task = request.task;
  const memories = request.memories ?? [];
  const knowledge = request.agent_context?.knowledge_results ?? [];

  return {
    task_summary: buildSummary(task),
    key_findings: buildFindings(task, memories, knowledge),
    artifacts: buildArtifacts(task),
    memory_updates: [
      {
        type: mapMemoryType(task.agent_type),
        title: `${task.agent_type} result for ${task.id}`,
        content: buildMemoryContent(
          task,
          request.model_route,
          request.agent_context
        ),
        importance: task.risk_level === "L3" ? 4 : 3
      }
    ],
    next_actions: buildNextActions(task),
    risk_flags: buildRiskFlags(task)
  };
}

function buildSummary(task) {
  if (task.agent_type === "brand_strategy") {
    return "Prepared a brand strategy brief scaffold from the user instruction and existing memory.";
  }
  if (task.agent_type === "platform_research") {
    return "Prepared a platform research brief scaffold and identified approved research inputs needed next.";
  }
  if (task.agent_type === "content_creation") {
    return "Prepared content draft scaffolds for scripts, titles, captions, and lead capture prompts.";
  }
  if (task.agent_type === "video_production") {
    return "Prepared a video production package scaffold with shot list, voiceover, subtitle, and asset requirements.";
  }
  if (task.agent_type === "publishing_ops") {
    return "Publishing requires approval before live platform execution.";
  }
  if (task.agent_type === "customer_service") {
    return "Prepared a lead intake and customer service workflow scaffold.";
  }
  if (task.agent_type === "data_review") {
    return "Prepared measurement and memory feedback rules for the campaign.";
  }

  return "Prepared a structured task result scaffold.";
}

function buildFindings(task, memories, knowledge) {
  return [
    `Agent type: ${task.agent_type}`,
    `Risk level: ${task.risk_level}`,
    `Available memory items: ${memories.length}`,
    `Retrieved knowledge chunks: ${knowledge.length}`,
    `Expected output: ${task.input_context?.expected_output ?? "not specified"}`
  ];
}

function buildArtifacts(task) {
  return [
    `${task.agent_type}:${task.id}:brief`,
    `${task.agent_type}:${task.id}:execution-notes`
  ];
}

function buildMemoryContent(task, modelRoute, agentContext) {
  return JSON.stringify(
    {
      task_id: task.id,
      agent_type: task.agent_type,
      objective: task.objective,
      expected_output: task.input_context?.expected_output ?? null,
      model_route: modelRoute,
      retrieved_knowledge: agentContext?.knowledge_summary ?? [],
      note:
        "This is a stub-generated result. Replace with a real model provider when API credentials are configured."
    },
    null,
    2
  );
}

function buildNextActions(task) {
  if (task.approval_required) {
    return ["Wait for human approval before executing external actions."];
  }

  return [
    "Review the generated scaffold.",
    "Enrich the workspace memory with brand and product details.",
    "Rerun with a real model provider when credentials are configured."
  ];
}

function buildRiskFlags(task) {
  return task.approval_required
    ? ["This task requires approval before execution."]
    : [];
}

function mapMemoryType(agentType) {
  if (agentType === "brand_strategy") return "brand";
  if (agentType === "platform_research") return "content";
  if (agentType === "content_creation") return "content";
  if (agentType === "video_production") return "content";
  if (agentType === "customer_service") return "customer";
  if (agentType === "data_review") return "strategy";
  return "workflow";
}
