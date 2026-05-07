import {
  createKnowledgeDocument,
  createMemory,
  listKnowledgeChunks,
  listKnowledgeDocuments,
  searchKnowledge
} from "../data/store.mjs";

export function addKnowledgeDocument(input) {
  const result = createKnowledgeDocument({
    workspace_id: input.workspace_id,
    title: input.title,
    content: input.content,
    source_type: input.source_type ?? "manual",
    content_type: input.content_type ?? "text/plain",
    metadata: input.metadata ?? {}
  });

  createMemory({
    workspace_id: input.workspace_id,
    memory_type: input.memory_type ?? "brand",
    title: `Knowledge document: ${result.document.title}`,
    content: result.document.summary,
    summary: result.document.summary,
    source_type: "knowledge_document",
    source_id: result.document.id,
    created_by_agent: "knowledge_base",
    importance: input.importance ?? 4
  });

  return {
    document: result.document,
    chunk_count: result.chunks.length
  };
}

export function getKnowledgeOverview(options = {}) {
  const documents = listKnowledgeDocuments({
    workspace_id: options.workspace_id
  });
  const chunks = listKnowledgeChunks({
    workspace_id: options.workspace_id
  });

  return {
    documents,
    totals: {
      documents: documents.length,
      chunks: chunks.length
    }
  };
}

export function queryKnowledge(query, options = {}) {
  return {
    query,
    results: searchKnowledge(query, {
      workspace_id: options.workspace_id,
      limit: options.limit ?? 8
    })
  };
}
