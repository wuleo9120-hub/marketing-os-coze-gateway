import { queryKnowledge } from "./knowledge-base.mjs";

const RETRIEVAL_POLICY = {
  brand_strategy: {
    enabled: true,
    limit: 6,
    include_instruction: true
  },
  platform_research: {
    enabled: true,
    limit: 4,
    include_instruction: true
  },
  content_creation: {
    enabled: true,
    limit: 8,
    include_instruction: true
  },
  video_production: {
    enabled: true,
    limit: 5,
    include_instruction: true
  },
  customer_service: {
    enabled: true,
    limit: 8,
    include_instruction: true
  },
  sales_assist: {
    enabled: true,
    limit: 8,
    include_instruction: true
  },
  publishing_ops: {
    enabled: true,
    limit: 3,
    include_instruction: false
  },
  data_review: {
    enabled: true,
    limit: 4,
    include_instruction: true
  }
};

export function buildAgentContext(task) {
  const policy = RETRIEVAL_POLICY[task.agent_type] ?? {
    enabled: false,
    limit: 0,
    include_instruction: false
  };

  if (!policy.enabled) {
    return {
      retrieval_query: null,
      knowledge_results: []
    };
  }

  const retrievalQuery = buildRetrievalQuery(task, policy);
  const knowledge = retrievalQuery
    ? queryKnowledge(retrievalQuery, { limit: policy.limit }).results
    : [];

  return {
    retrieval_query: retrievalQuery,
    knowledge_results: knowledge,
    knowledge_summary: summarizeKnowledge(knowledge)
  };
}

function buildRetrievalQuery(task, policy) {
  const parts = [
    task.objective,
    task.input_context?.expected_output,
    policy.include_instruction ? task.input_context?.user_instruction : null
  ].filter(Boolean);

  return parts.join("\n");
}

function summarizeKnowledge(results) {
  return results.map((result) => ({
    document_title: result.document_title,
    chunk_id: result.chunk_id,
    score: result.score,
    excerpt: result.content.slice(0, 360)
  }));
}

