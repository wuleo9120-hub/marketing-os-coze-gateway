-- Core schema for the AI-native multi-agent marketing system.
-- Target: PostgreSQL 16+ with pgvector enabled when vector retrieval is added.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (
    memory_type IN ('brand', 'content', 'customer', 'workflow', 'strategy', 'tool')
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  visibility_scope TEXT NOT NULL DEFAULT 'workspace',
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.80,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  embedding VECTOR(1536),
  created_by_agent TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_items_workspace_type_idx
  ON memory_items (workspace_id, memory_type, importance DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  content_type TEXT NOT NULL DEFAULT 'text/plain',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT NOT NULL,
  character_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_workspace_created_idx
  ON knowledge_documents (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
  ON knowledge_chunks (document_id, chunk_index);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  default_model_tier TEXT NOT NULL DEFAULT 'B',
  tool_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_task_id TEXT REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  objective TEXT NOT NULL,
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_result JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  risk_level TEXT NOT NULL DEFAULT 'L1',
  approval_required BOOLEAN NOT NULL DEFAULT false,
  assigned_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_tasks_workspace_status_idx
  ON agent_tasks (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS agent_tasks_parent_idx
  ON agent_tasks (parent_task_id);

CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_messages_workspace_created_idx
  ON agent_messages (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS approvals_workspace_status_idx
  ON approvals (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES agent_tasks(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'L1',
  input_summary TEXT NOT NULL,
  output_summary TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  approval_id TEXT REFERENCES approvals(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_calls_workspace_task_idx
  ON tool_calls (workspace_id, task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  source_content_id TEXT,
  display_name TEXT,
  contact_method TEXT,
  contact_value TEXT,
  stage TEXT NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_workspace_stage_idx
  ON leads (workspace_id, stage, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'assistant', 'human', 'system')),
  content TEXT NOT NULL,
  knowledge_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_conversations_lead_created_idx
  ON customer_conversations (lead_id, created_at);

CREATE TABLE IF NOT EXISTS sales_handoffs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sales_handoffs_workspace_status_idx
  ON sales_handoffs (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS content_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_task_id TEXT REFERENCES agent_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_assets_workspace_status_idx
  ON content_assets (workspace_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS publishing_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_asset_id TEXT REFERENCES content_assets(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  approval_id TEXT REFERENCES approvals(id) ON DELETE SET NULL,
  platform_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publishing_jobs_workspace_status_idx
  ON publishing_jobs (workspace_id, status, scheduled_for);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  platform TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS performance_metrics_workspace_entity_idx
  ON performance_metrics (workspace_id, entity_type, entity_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS performance_metrics_workspace_platform_idx
  ON performance_metrics (workspace_id, platform, measured_at DESC);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  related_entity_type TEXT,
  related_entity_id TEXT,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS experiments_workspace_status_idx
  ON experiments (workspace_id, status, created_at DESC);
