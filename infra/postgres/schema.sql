-- AI Marketing Agents production schema blueprint.
-- This is the target PostgreSQL/pgvector shape for moving beyond data/dev-store.json.

create extension if not exists vector;

create table workspaces (
  id text primary key,
  name text not null,
  merchant_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memories (
  id text primary key,
  workspace_id text not null references workspaces(id),
  memory_type text not null,
  title text not null,
  content text not null,
  summary text,
  source_type text,
  source_id text,
  visibility_scope text not null default 'workspace',
  confidence numeric not null default 0.8,
  importance integer not null default 3,
  created_by_agent text not null default 'system',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table knowledge_documents (
  id text primary key,
  workspace_id text not null references workspaces(id),
  title text not null,
  source_type text not null default 'manual',
  content_type text not null default 'text/plain',
  metadata jsonb not null default '{}',
  summary text,
  character_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table knowledge_chunks (
  id text primary key,
  workspace_id text not null references workspaces(id),
  document_id text not null references knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  metadata jsonb not null default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table tasks (
  id text primary key,
  workspace_id text not null references workspaces(id),
  parent_task_id text references tasks(id),
  agent_type text not null,
  objective text not null,
  input_context jsonb not null default '{}',
  output_result jsonb,
  status text not null default 'queued',
  risk_level text not null default 'L1',
  approval_required boolean not null default false,
  assigned_tools text[] not null default '{}',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create table approvals (
  id text primary key,
  workspace_id text not null references workspaces(id),
  task_id text not null references tasks(id),
  title text not null,
  description text,
  risk_level text not null,
  status text not null default 'pending',
  decided_by text,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table messages (
  id text primary key,
  workspace_id text not null references workspaces(id),
  role text not null,
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table tool_calls (
  id text primary key,
  workspace_id text not null references workspaces(id),
  task_id text references tasks(id),
  tool_name text not null,
  risk_level text not null default 'L1',
  input_summary text,
  output_summary text,
  status text not null default 'queued',
  approval_id text references approvals(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table content_assets (
  id text primary key,
  workspace_id text not null references workspaces(id),
  asset_type text not null,
  title text not null,
  body text not null default '',
  platform text,
  status text not null default 'draft',
  metadata jsonb not null default '{}',
  created_by_task_id text references tasks(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table publishing_jobs (
  id text primary key,
  workspace_id text not null references workspaces(id),
  content_asset_id text references content_assets(id),
  platform text not null,
  status text not null default 'draft',
  scheduled_for timestamptz,
  approval_id text references approvals(id),
  platform_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table performance_metrics (
  id text primary key,
  workspace_id text not null references workspaces(id),
  entity_type text not null,
  entity_id text not null,
  metric_name text not null,
  metric_value numeric not null default 0,
  platform text,
  metadata jsonb not null default '{}',
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table leads (
  id text primary key,
  workspace_id text not null references workspaces(id),
  source_platform text not null default 'manual',
  source_content_id text,
  display_name text not null,
  contact_method text,
  contact_value text,
  stage text not null default 'new',
  score numeric not null default 0,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customer_conversations (
  id text primary key,
  workspace_id text not null references workspaces(id),
  lead_id text not null references leads(id) on delete cascade,
  role text not null,
  content text not null,
  knowledge_refs jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table sales_handoffs (
  id text primary key,
  workspace_id text not null references workspaces(id),
  lead_id text not null references leads(id),
  reason text not null,
  summary text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table experiments (
  id text primary key,
  workspace_id text not null references workspaces(id),
  name text not null,
  hypothesis text not null,
  status text not null default 'planned',
  related_entity_type text,
  related_entity_id text,
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memories_workspace_type_idx on memories(workspace_id, memory_type);
create index knowledge_chunks_document_idx on knowledge_chunks(document_id, chunk_index);
create index tasks_workspace_status_idx on tasks(workspace_id, status);
create index messages_workspace_created_idx on messages(workspace_id, created_at);
create index tool_calls_task_idx on tool_calls(task_id);
create index publishing_jobs_workspace_status_idx on publishing_jobs(workspace_id, status);
create index metrics_entity_idx on performance_metrics(workspace_id, entity_type, entity_id);
create index leads_workspace_stage_idx on leads(workspace_id, stage);
create index experiments_workspace_status_idx on experiments(workspace_id, status);

-- Enable after embeddings exist:
-- create index memories_embedding_idx on memories using hnsw (embedding vector_cosine_ops);
-- create index knowledge_chunks_embedding_idx on knowledge_chunks using hnsw (embedding vector_cosine_ops);
