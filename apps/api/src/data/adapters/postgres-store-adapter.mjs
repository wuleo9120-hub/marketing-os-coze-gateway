import {
  getPostgresConnectionConfig,
  runPsqlSync
} from "../postgres-connection.mjs";

const ENABLE_FLAG = "ENABLE_POSTGRES_STORE_ADAPTER";

const TABLES = [
  "memories",
  "tasks",
  "approvals",
  "messages",
  "tool_calls",
  "knowledge_documents",
  "knowledge_chunks",
  "leads",
  "customer_conversations",
  "sales_handoffs",
  "content_assets",
  "publishing_jobs",
  "performance_metrics",
  "experiments"
];

export function createPostgresStoreAdapter(options = {}) {
  const config = getPostgresConnectionConfig(options);
  const enabled =
    options.enabled ?? process.env[ENABLE_FLAG] === "true";

  return {
    kind: "postgres",
    database_url_configured: config.configured,
    load(defaultState, normalizeState) {
      assertEnabled({ enabled, databaseUrl: config.database_url });
      const result = runPsqlSync(
        ["--tuples-only", "--no-align", "--command", buildLoadSql()],
        options
      );
      const raw = result.stdout.trim();
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
    },
    persist(state) {
      assertEnabled({ enabled, databaseUrl: config.database_url });
      runPsqlSync([], {
        ...options,
        input: buildPersistSql(state)
      });
    },
    info(sequence) {
      return {
        adapter: "postgres",
        sequence,
        database_url_configured: config.configured,
        database_url: config.masked_database_url,
        enabled,
        status: enabled ? "enabled_sql_adapter" : "disabled",
        note: enabled
          ? "PostgreSQL Store Adapter is enabled. Ensure migrations are applied before startup."
          : `Set ${ENABLE_FLAG}=true with DATABASE_URL only after running PostgreSQL migrations.`
      };
    }
  };
}

export function buildLoadSql() {
  const arrays = TABLES.map(
    (table) =>
      `'${table}', coalesce((select jsonb_agg(to_jsonb(${table}) order by created_at, id) from ${table}), '[]'::jsonb)`
  ).join(",\n    ");

  return `
select jsonb_build_object(
    'workspace', (select to_jsonb(workspaces) from workspaces where id = 'default' limit 1),
    'workspaces', coalesce((select jsonb_agg(to_jsonb(workspaces) order by created_at, id) from workspaces), '[]'::jsonb),
    ${arrays}
  )::text;
`.trim();
}

export function buildPersistSql(state) {
  const json = JSON.stringify(state);
  const tag = dollarQuoteTag(json);

  return `
begin;

create temp table __ai_marketing_state(payload jsonb) on commit drop;
insert into __ai_marketing_state(payload) values (${tag}${json}${tag}::jsonb);

delete from customer_conversations;
delete from sales_handoffs;
delete from performance_metrics;
delete from publishing_jobs;
delete from tool_calls;
delete from content_assets;
delete from approvals;
delete from tasks;
delete from knowledge_chunks;
delete from knowledge_documents;
delete from messages;
delete from memories;
delete from leads;
delete from experiments;
delete from workspaces;

insert into workspaces (id, name, merchant_name, status, created_at, updated_at)
select
  item.id,
  coalesce(item.name, item.id),
  item.merchant_name,
  coalesce(item.status, 'active'),
  coalesce(item.created_at, now()),
  coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'workspaces', '[]'::jsonb)) as item(
  id text, name text, merchant_name text, status text,
  created_at timestamptz, updated_at timestamptz
);

insert into workspaces (id, name, merchant_name, status, created_at, updated_at)
select
  coalesce(payload->'workspace'->>'id', 'default'),
  coalesce(payload->'workspace'->>'name', 'AI Marketing Workspace'),
  payload->'workspace'->>'merchant_name',
  coalesce(payload->'workspace'->>'status', 'active'),
  coalesce((payload->'workspace'->>'created_at')::timestamptz, now()),
  coalesce((payload->'workspace'->>'updated_at')::timestamptz, now())
from __ai_marketing_state
on conflict (id) do nothing;

insert into memories (
  id, workspace_id, memory_type, title, content, summary, source_type, source_id,
  visibility_scope, confidence, importance, created_by_agent, created_at, updated_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.memory_type, item.title,
  item.content, item.summary, item.source_type, item.source_id,
  coalesce(item.visibility_scope, 'workspace'), coalesce(item.confidence, 0.8),
  coalesce(item.importance, 3), coalesce(item.created_by_agent, 'system'),
  coalesce(item.created_at, now()), coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'memories', '[]'::jsonb)) as item(
  id text, workspace_id text, memory_type text, title text, content text,
  summary text, source_type text, source_id text, visibility_scope text,
  confidence numeric, importance integer, created_by_agent text,
  created_at timestamptz, updated_at timestamptz
);

insert into knowledge_documents (
  id, workspace_id, title, source_type, content_type, metadata, summary,
  character_count, created_at, updated_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.title,
  coalesce(item.source_type, 'manual'), coalesce(item.content_type, 'text/plain'),
  coalesce(item.metadata, '{}'::jsonb), item.summary,
  coalesce(item.character_count, 0), coalesce(item.created_at, now()),
  coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'knowledge_documents', '[]'::jsonb)) as item(
  id text, workspace_id text, title text, source_type text, content_type text,
  metadata jsonb, summary text, character_count integer,
  created_at timestamptz, updated_at timestamptz
);

insert into knowledge_chunks (
  id, workspace_id, document_id, chunk_index, content, token_estimate,
  metadata, created_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.document_id,
  coalesce(item.chunk_index, 0), item.content, coalesce(item.token_estimate, 0),
  coalesce(item.metadata, '{}'::jsonb), coalesce(item.created_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'knowledge_chunks', '[]'::jsonb)) as item(
  id text, workspace_id text, document_id text, chunk_index integer,
  content text, token_estimate integer, metadata jsonb, created_at timestamptz
);

insert into tasks (
  id, workspace_id, parent_task_id, agent_type, objective, input_context,
  output_result, status, risk_level, approval_required, assigned_tools,
  created_at, started_at, finished_at, updated_at
)
select
  raw.item->>'id',
  coalesce(raw.item->>'workspace_id', 'default'),
  raw.item->>'parent_task_id',
  raw.item->>'agent_type',
  raw.item->>'objective',
  coalesce(raw.item->'input_context', '{}'::jsonb),
  raw.item->'output_result',
  coalesce(raw.item->>'status', 'queued'),
  coalesce(raw.item->>'risk_level', 'L1'),
  coalesce((raw.item->>'approval_required')::boolean, false),
  coalesce((
    select array_agg(value)
    from jsonb_array_elements_text(coalesce(raw.item->'assigned_tools', '[]'::jsonb)) as value
  ), '{}'::text[]),
  coalesce((raw.item->>'created_at')::timestamptz, now()),
  (raw.item->>'started_at')::timestamptz,
  (raw.item->>'finished_at')::timestamptz,
  coalesce((raw.item->>'updated_at')::timestamptz, now())
from __ai_marketing_state,
jsonb_array_elements(coalesce(payload->'tasks', '[]'::jsonb)) as raw(item);

insert into approvals (
  id, workspace_id, task_id, title, description, risk_level, status,
  decided_by, decision_note, created_at, decided_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.task_id, item.title,
  item.description, coalesce(item.risk_level, 'L1'), coalesce(item.status, 'pending'),
  item.decided_by, item.decision_note, coalesce(item.created_at, now()),
  item.decided_at
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'approvals', '[]'::jsonb)) as item(
  id text, workspace_id text, task_id text, title text, description text,
  risk_level text, status text, decided_by text, decision_note text,
  created_at timestamptz, decided_at timestamptz
);

insert into messages (id, workspace_id, role, content, metadata, created_at)
select
  item.id, coalesce(item.workspace_id, 'default'), item.role, item.content,
  coalesce(item.metadata, '{}'::jsonb), coalesce(item.created_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'messages', '[]'::jsonb)) as item(
  id text, workspace_id text, role text, content text, metadata jsonb,
  created_at timestamptz
);

insert into tool_calls (
  id, workspace_id, task_id, tool_name, risk_level, input_summary,
  output_summary, status, approval_id, started_at, finished_at, created_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.task_id, item.tool_name,
  coalesce(item.risk_level, 'L1'), item.input_summary, item.output_summary,
  coalesce(item.status, 'queued'), item.approval_id, item.started_at,
  item.finished_at, coalesce(item.created_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'tool_calls', '[]'::jsonb)) as item(
  id text, workspace_id text, task_id text, tool_name text, risk_level text,
  input_summary text, output_summary text, status text, approval_id text,
  started_at timestamptz, finished_at timestamptz, created_at timestamptz
);

insert into leads (
  id, workspace_id, source_platform, source_content_id, display_name,
  contact_method, contact_value, stage, score, summary, created_at, updated_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), coalesce(item.source_platform, 'manual'),
  item.source_content_id, item.display_name, item.contact_method, item.contact_value,
  coalesce(item.stage, 'new'), coalesce(item.score, 0), item.summary,
  coalesce(item.created_at, now()), coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'leads', '[]'::jsonb)) as item(
  id text, workspace_id text, source_platform text, source_content_id text,
  display_name text, contact_method text, contact_value text, stage text,
  score numeric, summary text, created_at timestamptz, updated_at timestamptz
);

insert into customer_conversations (
  id, workspace_id, lead_id, role, content, knowledge_refs, metadata, created_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.lead_id, item.role,
  item.content, coalesce(item.knowledge_refs, '[]'::jsonb),
  coalesce(item.metadata, '{}'::jsonb), coalesce(item.created_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'customer_conversations', '[]'::jsonb)) as item(
  id text, workspace_id text, lead_id text, role text, content text,
  knowledge_refs jsonb, metadata jsonb, created_at timestamptz
);

insert into sales_handoffs (
  id, workspace_id, lead_id, reason, summary, status, created_at, resolved_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.lead_id, item.reason,
  item.summary, coalesce(item.status, 'pending'), coalesce(item.created_at, now()),
  item.resolved_at
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'sales_handoffs', '[]'::jsonb)) as item(
  id text, workspace_id text, lead_id text, reason text, summary text,
  status text, created_at timestamptz, resolved_at timestamptz
);

insert into content_assets (
  id, workspace_id, asset_type, title, body, platform, status, metadata,
  created_by_task_id, created_at, updated_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.asset_type, item.title,
  coalesce(item.body, ''), item.platform, coalesce(item.status, 'draft'),
  coalesce(item.metadata, '{}'::jsonb), item.created_by_task_id,
  coalesce(item.created_at, now()), coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'content_assets', '[]'::jsonb)) as item(
  id text, workspace_id text, asset_type text, title text, body text,
  platform text, status text, metadata jsonb, created_by_task_id text,
  created_at timestamptz, updated_at timestamptz
);

insert into publishing_jobs (
  id, workspace_id, content_asset_id, platform, status, scheduled_for,
  approval_id, platform_response, created_at, updated_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.content_asset_id,
  item.platform, coalesce(item.status, 'draft'), item.scheduled_for,
  item.approval_id, item.platform_response, coalesce(item.created_at, now()),
  coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'publishing_jobs', '[]'::jsonb)) as item(
  id text, workspace_id text, content_asset_id text, platform text,
  status text, scheduled_for timestamptz, approval_id text,
  platform_response jsonb, created_at timestamptz, updated_at timestamptz
);

insert into performance_metrics (
  id, workspace_id, entity_type, entity_id, metric_name, metric_value,
  platform, metadata, measured_at, created_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.entity_type,
  item.entity_id, item.metric_name, coalesce(item.metric_value, 0),
  item.platform, coalesce(item.metadata, '{}'::jsonb),
  coalesce(item.measured_at, now()), coalesce(item.created_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'performance_metrics', '[]'::jsonb)) as item(
  id text, workspace_id text, entity_type text, entity_id text, metric_name text,
  metric_value numeric, platform text, metadata jsonb,
  measured_at timestamptz, created_at timestamptz
);

insert into experiments (
  id, workspace_id, name, hypothesis, status, related_entity_type,
  related_entity_id, result_summary, created_at, updated_at
)
select
  item.id, coalesce(item.workspace_id, 'default'), item.name, item.hypothesis,
  coalesce(item.status, 'planned'), item.related_entity_type,
  item.related_entity_id, item.result_summary, coalesce(item.created_at, now()),
  coalesce(item.updated_at, now())
from __ai_marketing_state,
jsonb_to_recordset(coalesce(payload->'experiments', '[]'::jsonb)) as item(
  id text, workspace_id text, name text, hypothesis text, status text,
  related_entity_type text, related_entity_id text, result_summary text,
  created_at timestamptz, updated_at timestamptz
);

commit;
`.trim();
}

function assertEnabled({ enabled, databaseUrl }) {
  if (!enabled) {
    throw new Error(
      `STORE_ADAPTER=postgres requires ${ENABLE_FLAG}=true. ` +
        "Run migrations and enable the adapter explicitly before use."
    );
  }

  if (!databaseUrl) {
    throw new Error("STORE_ADAPTER=postgres requires DATABASE_URL.");
  }
}

function dollarQuoteTag(value) {
  let tag = "$state$";
  let index = 0;
  while (value.includes(tag)) {
    index += 1;
    tag = `$state_${index}$`;
  }
  return tag;
}
