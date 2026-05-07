import { createStoreAdapter } from "./adapters/store-adapter.mjs";

const now = () => new Date().toISOString();
const adapter = createStoreAdapter();
const defaultWorkspaceId = sanitizeWorkspaceId(
  process.env.DEFAULT_WORKSPACE_ID ?? "default"
);

const defaultState = () => ({
  workspace: {
    id: defaultWorkspaceId,
    name: "AI Marketing Workspace",
    created_at: now()
  },
  workspaces: [
    {
      id: defaultWorkspaceId,
      name: "AI Marketing Workspace",
      status: "active",
      created_at: now(),
      updated_at: now()
    }
  ],
  memories: [],
  tasks: [],
  approvals: [],
  messages: [],
  tool_calls: [],
  knowledge_documents: [],
  knowledge_chunks: [],
  leads: [],
  customer_conversations: [],
  sales_handoffs: [],
  content_assets: [],
  publishing_jobs: [],
  performance_metrics: [],
  experiments: []
});

const state = adapter.load(defaultState, normalizeState);

let sequence = inferNextSequence(state);

export function createId(prefix) {
  return `${prefix}_${String(sequence++).padStart(6, "0")}`;
}

export function getSnapshot() {
  return structuredClone(state);
}

export function getActiveWorkspaceId() {
  return defaultWorkspaceId;
}

export function listWorkspaces() {
  return structuredClone(state.workspaces);
}

export function upsertWorkspace(input = {}) {
  const workspace = normalizeWorkspace(input);
  const existing = state.workspaces.find((item) => item.id === workspace.id);

  if (existing) {
    Object.assign(existing, workspace, { updated_at: now() });
  } else {
    state.workspaces.push(workspace);
  }

  if (state.workspace?.id === workspace.id || state.workspaces.length === 1) {
    state.workspace = { ...state.workspace, ...workspace };
  }

  persist();
  return structuredClone(existing ?? workspace);
}

export function listMemories({ type, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = type
    ? state.memories.filter(
        (memory) =>
          memory.workspace_id === workspaceId && memory.memory_type === type
      )
    : state.memories.filter((memory) => memory.workspace_id === workspaceId);

  return structuredClone(items.slice(-limit).reverse());
}

export function createMemory(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const memory = {
    id: createId("mem"),
    workspace_id: workspaceId,
    memory_type: input.memory_type,
    title: input.title,
    content: input.content,
    summary: input.summary ?? input.content.slice(0, 240),
    source_type: input.source_type ?? "manual",
    source_id: input.source_id ?? null,
    visibility_scope: input.visibility_scope ?? "workspace",
    confidence: input.confidence ?? 0.8,
    importance: input.importance ?? 3,
    created_by_agent: input.created_by_agent ?? "system",
    created_at: now(),
    updated_at: now()
  };

  state.memories.push(memory);
  persist();
  return structuredClone(memory);
}

export function listTasks({ status, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = status
    ? state.tasks.filter(
        (task) => task.workspace_id === workspaceId && task.status === status
      )
    : state.tasks.filter((task) => task.workspace_id === workspaceId);

  return structuredClone(items.slice(-limit).reverse());
}

export function getTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  return task ? structuredClone(task) : null;
}

export function createTask(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const task = {
    id: createId("task"),
    workspace_id: workspaceId,
    parent_task_id: input.parent_task_id ?? null,
    agent_type: input.agent_type,
    objective: input.objective,
    input_context: input.input_context ?? {},
    output_result: input.output_result ?? null,
    status: input.status ?? "queued",
    risk_level: input.risk_level ?? "L1",
    approval_required: input.approval_required ?? false,
    assigned_tools: input.assigned_tools ?? [],
    created_at: now(),
    started_at: null,
    finished_at: null,
    updated_at: now()
  };

  state.tasks.push(task);
  persist();
  return structuredClone(task);
}

export function updateTask(id, patch) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return null;

  Object.assign(task, patch, { updated_at: now() });
  persist();
  return structuredClone(task);
}

export function createApproval(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const approval = {
    id: createId("approval"),
    workspace_id: workspaceId,
    task_id: input.task_id,
    title: input.title,
    description: input.description,
    risk_level: input.risk_level,
    status: "pending",
    decided_by: null,
    decision_note: null,
    created_at: now(),
    decided_at: null
  };

  state.approvals.push(approval);
  persist();
  return structuredClone(approval);
}

export function getApproval(id) {
  const approval = state.approvals.find((item) => item.id === id);
  return approval ? structuredClone(approval) : null;
}

export function getApprovalForTask(taskId) {
  const approval = state.approvals.find(
    (item) => item.task_id === taskId && item.status !== "rejected"
  );
  return approval ? structuredClone(approval) : null;
}

export function updateApproval(id, patch) {
  const approval = state.approvals.find((item) => item.id === id);
  if (!approval) return null;

  Object.assign(approval, patch);
  persist();
  return structuredClone(approval);
}

export function decideApproval(id, decision) {
  const status = decision.status;
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Approval status must be approved or rejected.");
  }

  return updateApproval(id, {
    status,
    decided_by: decision.decided_by ?? "user",
    decision_note: decision.decision_note ?? null,
    decided_at: now()
  });
}

export function listApprovals({ status, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = status
    ? state.approvals.filter((approval) => approval.status === status)
    : state.approvals.filter((approval) => approval.workspace_id === workspaceId);

  return structuredClone(
    items
      .filter((approval) => approval.workspace_id === workspaceId)
      .slice(-limit)
      .reverse()
  );
}

export function addMessage(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const message = {
    id: createId("msg"),
    workspace_id: workspaceId,
    role: input.role,
    content: input.content,
    metadata: input.metadata ?? {},
    created_at: now()
  };

  state.messages.push(message);
  persist();
  return structuredClone(message);
}

export function listMessages({ limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  return structuredClone(
    state.messages
      .filter((message) => message.workspace_id === workspaceId)
      .slice(-limit)
  );
}

export function createToolCall(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const toolCall = {
    id: createId("tool"),
    workspace_id: workspaceId,
    task_id: input.task_id ?? null,
    tool_name: input.tool_name,
    risk_level: input.risk_level ?? "L1",
    input_summary: input.input_summary,
    output_summary: input.output_summary ?? null,
    status: input.status ?? "queued",
    approval_id: input.approval_id ?? null,
    started_at: input.started_at ?? null,
    finished_at: input.finished_at ?? null,
    created_at: now()
  };

  state.tool_calls.push(toolCall);
  persist();
  return structuredClone(toolCall);
}

export function updateToolCall(id, patch) {
  const toolCall = state.tool_calls.find((item) => item.id === id);
  if (!toolCall) return null;

  Object.assign(toolCall, patch);
  persist();
  return structuredClone(toolCall);
}

export function listToolCalls({ taskId, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = taskId
    ? state.tool_calls.filter(
        (toolCall) =>
          toolCall.workspace_id === workspaceId && toolCall.task_id === taskId
      )
    : state.tool_calls.filter((toolCall) => toolCall.workspace_id === workspaceId);

  return structuredClone(items.slice(-limit).reverse());
}

export function createKnowledgeDocument(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const document = {
    id: createId("doc"),
    workspace_id: workspaceId,
    title: input.title,
    source_type: input.source_type ?? "manual",
    content_type: input.content_type ?? "text/plain",
    metadata: input.metadata ?? {},
    summary: input.summary ?? input.content.slice(0, 240),
    character_count: input.content.length,
    created_at: now(),
    updated_at: now()
  };

  const chunks = chunkText(input.content).map((chunk, index) => ({
    id: createId("chunk"),
    workspace_id: workspaceId,
    document_id: document.id,
    chunk_index: index,
    content: chunk,
    token_estimate: estimateTokens(chunk),
    metadata: {},
    created_at: now()
  }));

  state.knowledge_documents.push(document);
  state.knowledge_chunks.push(...chunks);
  persist();

  return structuredClone({
    document,
    chunks
  });
}

export function listKnowledgeDocuments({ limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  return structuredClone(
    state.knowledge_documents
      .filter((document) => document.workspace_id === workspaceId)
      .slice(-limit)
      .reverse()
  );
}

export function listKnowledgeChunks({ documentId, limit = 100 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = documentId
    ? state.knowledge_chunks.filter(
        (chunk) =>
          chunk.workspace_id === workspaceId && chunk.document_id === documentId
      )
    : state.knowledge_chunks.filter((chunk) => chunk.workspace_id === workspaceId);

  return structuredClone(items.slice(-limit));
}

export function searchKnowledge(query, { limit = 8 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[1]);
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const scored = state.knowledge_chunks
    .map((chunk) => {
      const score = scoreChunk(chunk.content, terms);
      const document = state.knowledge_documents.find(
        (item) => item.id === chunk.document_id
      );
      return {
        chunk,
        document,
        score
      };
    })
    .filter((item) => item.chunk.workspace_id === workspaceId)
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      chunk_id: item.chunk.id,
      document_id: item.chunk.document_id,
      document_title: item.document?.title ?? "Unknown document",
      chunk_index: item.chunk.chunk_index,
      content: item.chunk.content,
      score: item.score
    }));

  return structuredClone(scored);
}

export function createLead(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const lead = {
    id: createId("lead"),
    workspace_id: workspaceId,
    source_platform: input.source_platform ?? "manual",
    source_content_id: input.source_content_id ?? null,
    display_name: input.display_name ?? "未知客户",
    contact_method: input.contact_method ?? null,
    contact_value: input.contact_value ?? null,
    stage: input.stage ?? "new",
    score: input.score ?? 0,
    summary: input.summary ?? null,
    created_at: now(),
    updated_at: now()
  };

  state.leads.push(lead);
  persist();
  return structuredClone(lead);
}

export function listLeads({ stage, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = stage
    ? state.leads.filter(
        (lead) => lead.workspace_id === workspaceId && lead.stage === stage
      )
    : state.leads.filter((lead) => lead.workspace_id === workspaceId);

  return structuredClone(items.slice(-limit).reverse());
}

export function getLead(id) {
  const lead = state.leads.find((item) => item.id === id);
  return lead ? structuredClone(lead) : null;
}

export function updateLead(id, patch) {
  const lead = state.leads.find((item) => item.id === id);
  if (!lead) return null;

  Object.assign(lead, patch, { updated_at: now() });
  persist();
  return structuredClone(lead);
}

export function addCustomerConversationMessage(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const message = {
    id: createId("conv"),
    workspace_id: workspaceId,
    lead_id: input.lead_id,
    role: input.role,
    content: input.content,
    knowledge_refs: input.knowledge_refs ?? [],
    metadata: input.metadata ?? {},
    created_at: now()
  };

  state.customer_conversations.push(message);
  persist();
  return structuredClone(message);
}

export function listCustomerConversationMessages({ leadId, limit = 100 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = leadId
    ? state.customer_conversations.filter((message) => message.lead_id === leadId)
    : state.customer_conversations.filter(
        (message) => message.workspace_id === workspaceId
      );

  return structuredClone(
    items
      .filter((message) => message.workspace_id === workspaceId)
      .slice(-limit)
  );
}

export function createSalesHandoff(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const handoff = {
    id: createId("handoff"),
    workspace_id: workspaceId,
    lead_id: input.lead_id,
    reason: input.reason,
    summary: input.summary,
    status: input.status ?? "pending",
    created_at: now(),
    resolved_at: null
  };

  state.sales_handoffs.push(handoff);
  persist();
  return structuredClone(handoff);
}

export function listSalesHandoffs({ status, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = status
    ? state.sales_handoffs.filter(
        (handoff) =>
          handoff.workspace_id === workspaceId && handoff.status === status
      )
    : state.sales_handoffs.filter(
        (handoff) => handoff.workspace_id === workspaceId
      );

  return structuredClone(items.slice(-limit).reverse());
}

export function createContentAsset(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const asset = {
    id: createId("asset"),
    workspace_id: workspaceId,
    asset_type: input.asset_type,
    title: input.title,
    body: input.body ?? "",
    platform: input.platform ?? null,
    status: input.status ?? "draft",
    metadata: input.metadata ?? {},
    created_by_task_id: input.created_by_task_id ?? null,
    created_at: now(),
    updated_at: now()
  };

  state.content_assets.push(asset);
  persist();
  return structuredClone(asset);
}

export function listContentAssets({ status, platform, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = state.content_assets.filter((asset) => {
    if (asset.workspace_id !== workspaceId) return false;
    if (status && asset.status !== status) return false;
    if (platform && asset.platform !== platform) return false;
    return true;
  });

  return structuredClone(items.slice(-limit).reverse());
}

export function getContentAsset(id) {
  const asset = state.content_assets.find((item) => item.id === id);
  return asset ? structuredClone(asset) : null;
}

export function updateContentAsset(id, patch) {
  const asset = state.content_assets.find((item) => item.id === id);
  if (!asset) return null;

  Object.assign(asset, patch, { updated_at: now() });
  persist();
  return structuredClone(asset);
}

export function createPublishingJob(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const job = {
    id: createId("pub"),
    workspace_id: workspaceId,
    content_asset_id: input.content_asset_id ?? null,
    platform: input.platform,
    status: input.status ?? "draft",
    scheduled_for: input.scheduled_for ?? null,
    approval_id: input.approval_id ?? null,
    platform_response: input.platform_response ?? null,
    created_at: now(),
    updated_at: now()
  };

  state.publishing_jobs.push(job);
  persist();
  return structuredClone(job);
}

export function listPublishingJobs({ status, platform, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = state.publishing_jobs.filter((job) => {
    if (job.workspace_id !== workspaceId) return false;
    if (status && job.status !== status) return false;
    if (platform && job.platform !== platform) return false;
    return true;
  });

  return structuredClone(items.slice(-limit).reverse());
}

export function getPublishingJob(id) {
  const job = state.publishing_jobs.find((item) => item.id === id);
  return job ? structuredClone(job) : null;
}

export function updatePublishingJob(id, patch) {
  const job = state.publishing_jobs.find((item) => item.id === id);
  if (!job) return null;

  Object.assign(job, patch, { updated_at: now() });
  persist();
  return structuredClone(job);
}

export function createPerformanceMetric(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const metric = {
    id: createId("metric"),
    workspace_id: workspaceId,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    metric_name: input.metric_name,
    metric_value: Number(input.metric_value ?? 0),
    platform: input.platform ?? null,
    metadata: input.metadata ?? {},
    measured_at: input.measured_at ?? now(),
    created_at: now()
  };

  state.performance_metrics.push(metric);
  persist();
  return structuredClone(metric);
}

export function listPerformanceMetrics({
  entityType,
  entityId,
  platform,
  limit = 200
} = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = state.performance_metrics.filter((metric) => {
    if (metric.workspace_id !== workspaceId) return false;
    if (entityType && metric.entity_type !== entityType) return false;
    if (entityId && metric.entity_id !== entityId) return false;
    if (platform && metric.platform !== platform) return false;
    return true;
  });

  return structuredClone(items.slice(-limit).reverse());
}

export function createExperiment(input) {
  const workspaceId = resolveWorkspaceId(input);
  ensureWorkspace({ id: workspaceId });
  const experiment = {
    id: createId("exp"),
    workspace_id: workspaceId,
    name: input.name,
    hypothesis: input.hypothesis,
    status: input.status ?? "planned",
    related_entity_type: input.related_entity_type ?? null,
    related_entity_id: input.related_entity_id ?? null,
    result_summary: input.result_summary ?? null,
    created_at: now(),
    updated_at: now()
  };

  state.experiments.push(experiment);
  persist();
  return structuredClone(experiment);
}

export function listExperiments({ status, limit = 50 } = {}) {
  const workspaceId = resolveWorkspaceId(arguments[0]);
  const items = status
    ? state.experiments.filter(
        (experiment) =>
          experiment.workspace_id === workspaceId && experiment.status === status
      )
    : state.experiments.filter(
        (experiment) => experiment.workspace_id === workspaceId
      );

  return structuredClone(items.slice(-limit).reverse());
}

export function updateExperiment(id, patch) {
  const experiment = state.experiments.find((item) => item.id === id);
  if (!experiment) return null;

  Object.assign(experiment, patch, { updated_at: now() });
  persist();
  return structuredClone(experiment);
}

export function seedInitialData() {
  if (state.memories.length > 0) return;

  createMemory({
    memory_type: "workflow",
    title: "MVP operating principle",
    content:
      "Agents can plan, create drafts, and request approvals before high-risk actions. Real platform publishing and customer outreach stay behind explicit approval gates.",
    source_type: "system",
    created_by_agent: "system",
    importance: 4
  });
}

export function getStoreInfo() {
  return adapter.info(sequence);
}

function normalizeState(input) {
  const fallback = defaultState();
  const workspace = normalizeWorkspace(input.workspace ?? fallback.workspace);
  const workspaces = normalizeWorkspaces(input.workspaces, workspace);
  return {
    workspace,
    workspaces,
    memories: normalizeWorkspaceItems(input.memories),
    tasks: normalizeWorkspaceItems(input.tasks),
    approvals: normalizeWorkspaceItems(input.approvals),
    messages: normalizeWorkspaceItems(input.messages),
    tool_calls: normalizeWorkspaceItems(input.tool_calls),
    knowledge_documents: Array.isArray(input.knowledge_documents)
      ? normalizeWorkspaceItems(input.knowledge_documents)
      : [],
    knowledge_chunks: Array.isArray(input.knowledge_chunks)
      ? normalizeWorkspaceItems(input.knowledge_chunks)
      : [],
    leads: normalizeWorkspaceItems(input.leads),
    customer_conversations: Array.isArray(input.customer_conversations)
      ? normalizeWorkspaceItems(input.customer_conversations)
      : [],
    sales_handoffs: Array.isArray(input.sales_handoffs)
      ? normalizeWorkspaceItems(input.sales_handoffs)
      : [],
    content_assets: Array.isArray(input.content_assets)
      ? normalizeWorkspaceItems(input.content_assets)
      : [],
    publishing_jobs: Array.isArray(input.publishing_jobs)
      ? normalizeWorkspaceItems(input.publishing_jobs)
      : [],
    performance_metrics: Array.isArray(input.performance_metrics)
      ? normalizeWorkspaceItems(input.performance_metrics)
      : [],
    experiments: normalizeWorkspaceItems(input.experiments)
  };
}

function resolveWorkspaceId(input = {}) {
  return sanitizeWorkspaceId(input?.workspace_id ?? input?.workspaceId ?? defaultWorkspaceId);
}

function ensureWorkspace(input = {}) {
  const workspace = normalizeWorkspace(input);
  if (!state.workspaces.some((item) => item.id === workspace.id)) {
    state.workspaces.push(workspace);
  }
  return workspace.id;
}

function normalizeWorkspace(input = {}) {
  const id = sanitizeWorkspaceId(input.id ?? input.workspace_id ?? defaultWorkspaceId);
  const timestamp = now();
  return {
    id,
    name: String(input.name ?? id).trim() || id,
    merchant_name: input.merchant_name ?? input.merchantName ?? null,
    status: input.status ?? "active",
    created_at: input.created_at ?? timestamp,
    updated_at: input.updated_at ?? timestamp
  };
}

function normalizeWorkspaces(input, primary) {
  const items = Array.isArray(input) ? input : [];
  const workspaces = items.map(normalizeWorkspace);
  if (!workspaces.some((item) => item.id === primary.id)) {
    workspaces.unshift(primary);
  }
  return workspaces;
}

function normalizeWorkspaceItems(input) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => ({
    ...item,
    workspace_id: sanitizeWorkspaceId(item.workspace_id ?? defaultWorkspaceId)
  }));
}

function sanitizeWorkspaceId(value) {
  const normalized = String(value ?? "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "default";
}

function persist() {
  adapter.persist(state);
}

function inferNextSequence(input) {
  const values = [
    ...input.memories,
    ...input.tasks,
    ...input.approvals,
    ...input.messages,
    ...input.tool_calls,
    ...input.knowledge_documents,
    ...input.knowledge_chunks,
    ...input.leads,
    ...input.customer_conversations,
    ...input.sales_handoffs,
    ...input.content_assets,
    ...input.publishing_jobs,
    ...input.performance_metrics,
    ...input.experiments
  ]
    .map((item) => item.id)
    .filter(Boolean)
    .map((id) => Number(String(id).split("_").at(-1)))
    .filter(Number.isFinite);

  return values.length > 0 ? Math.max(...values) + 1 : 1;
}

function chunkText(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = "";
  const maxLength = 900;

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [normalized]) {
    if ((buffer + "\n\n" + paragraph).trim().length > maxLength && buffer) {
      chunks.push(buffer.trim());
      buffer = paragraph;
    } else {
      buffer = `${buffer}\n\n${paragraph}`.trim();
    }
  }

  if (buffer) chunks.push(buffer.trim());

  return chunks.flatMap((chunk) => splitLongChunk(chunk, maxLength));
}

function splitLongChunk(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  for (let index = 0; index < text.length; index += maxLength) {
    chunks.push(text.slice(index, index + maxLength));
  }
  return chunks;
}

function estimateTokens(text) {
  return Math.ceil(text.length / 3);
}

function tokenize(text) {
  const raw = String(text).toLowerCase();
  const baseTerms = raw
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  const cjkTerms = Array.from(raw.matchAll(/[\p{Script=Han}]{2,}/gu)).flatMap(
    ([segment]) => buildCjkNgrams(segment)
  );

  return [...new Set([...baseTerms, ...cjkTerms])];
}

function buildCjkNgrams(segment) {
  const terms = [];
  for (const size of [2, 3, 4]) {
    for (let index = 0; index <= segment.length - size; index += 1) {
      terms.push(segment.slice(index, index + size));
    }
  }
  return terms;
}

function scoreChunk(content, terms) {
  const haystack = content.toLowerCase();
  return terms.reduce((score, term) => {
    const matches = haystack.split(term).length - 1;
    return score + matches * Math.min(term.length, 8);
  }, 0);
}
