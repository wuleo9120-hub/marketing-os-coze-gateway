import { statSync } from "node:fs";

import { getStoreInfo, getSnapshot } from "../data/store.mjs";
import { getConfigOverview } from "./config-registry.mjs";
import { getGovernanceOverview } from "./governance.mjs";

const CHECKS = [
  {
    id: "database",
    title: "PostgreSQL / pgvector",
    required_env: ["STORE_ADAPTER", "DATABASE_URL"],
    optional_env: [
      "PGVECTOR_ENABLED",
      "ENABLE_POSTGRES_STORE_ADAPTER",
      "PSQL_BIN",
      "POSTGRES_MIGRATION_TIMEOUT_MS"
    ],
    fallback: "local_json_store",
    recommendation:
      "Run node scripts/postgres-migrate.mjs --dry-run first; use STORE_ADAPTER=postgres only after the SQL adapter is implemented and DATABASE_URL is configured."
  },
  {
    id: "queue",
    title: "Background Job Queue",
    required_env: ["REDIS_URL"],
    optional_env: ["QUEUE_CONCURRENCY"],
    fallback: "in_process_execution",
    recommendation:
      "Use Redis-backed queues for long-running agent, publishing, metric sync, and retry workflows."
  },
  {
    id: "object_storage",
    title: "Object Storage",
    required_env: ["OBJECT_STORAGE_BUCKET"],
    optional_env: ["OBJECT_STORAGE_REGION", "OBJECT_STORAGE_ENDPOINT"],
    fallback: "local_or_url_references",
    recommendation:
      "Use object storage for merchant uploads, QR codes, generated video, covers, and reports."
  },
  {
    id: "auth",
    title: "Operator Auth",
    required_env: ["LOCAL_API_WRITE_TOKEN"],
    optional_env: ["SESSION_SECRET", "ADMIN_EMAILS"],
    fallback: "local_only_write_guard",
    recommendation:
      "Keep LOCAL_API_WRITE_TOKEN for local testing; add real operator auth before remote deployment."
  },
  {
    id: "observability",
    title: "Logs / Metrics / Alerts",
    required_env: ["LOG_LEVEL"],
    optional_env: ["SENTRY_DSN", "OTEL_EXPORTER_OTLP_ENDPOINT"],
    fallback: "console_logs",
    recommendation:
      "Add structured logs, error reporting, trace IDs, and budget alerts before production traffic."
  },
  {
    id: "cost_control",
    title: "Cost Control",
    required_env: ["MAX_DAILY_MODEL_CALLS", "MAX_DAILY_EXTERNAL_TOOL_CALLS"],
    optional_env: ["MAX_TASK_INPUT_TOKENS", "MAX_MEMORY_UPDATE_CHARS"],
    fallback: "governance_defaults",
    recommendation:
      "Set explicit daily model and external tool budgets for each merchant workspace."
  },
  {
    id: "multi_tenant",
    title: "Multi-Merchant Isolation",
    required_env: ["MULTI_TENANT_MODE"],
    optional_env: ["DEFAULT_WORKSPACE_ID"],
    fallback: "single_default_workspace",
    recommendation:
      "Move from the default workspace to merchant-scoped workspaces before onboarding multiple merchants."
  }
];

export function getProductionReadiness() {
  const snapshot = getSnapshot();
  const store = getStoreInfo();
  const config = getConfigOverview();
  const governance = getGovernanceOverview();
  const checks = CHECKS.map(buildCheck);
  const ready = checks.filter((check) => check.ready).length;
  const storage = getStorageStatus(store);

  return {
    generated_at: new Date().toISOString(),
    summary: {
      status: ready === checks.length ? "production_ready" : "not_production_ready",
      ready,
      total: checks.length,
      readiness_percent: Math.round((ready / checks.length) * 100),
      current_storage: storage.adapter,
      primary_gap:
        "The MVP workflow is usable, but production needs database, queue, auth, observability, and merchant isolation."
    },
    store: {
      ...store,
      adapter_status: storage.status,
      file_size_bytes: getStoreSize(store.path),
      totals: {
        memories: snapshot.memories.length,
        tasks: snapshot.tasks.length,
        knowledge_documents: snapshot.knowledge_documents.length,
        content_assets: snapshot.content_assets.length,
        publishing_jobs: snapshot.publishing_jobs.length,
        metrics: snapshot.performance_metrics.length,
        leads: snapshot.leads.length
      }
    },
    governance: {
      mode: governance.policy.mode,
      budgets: governance.policy.budgets,
      usage: governance.usage
    },
    runtime_config: {
      configured: config.totals.configured,
      missing: config.totals.missing
    },
    checks,
    next_actions: [
      "Run node scripts/postgres-migrate.mjs --dry-run to inspect the PostgreSQL migration plan.",
      "Configure DATABASE_URL, run node scripts/postgres-migrate.mjs --apply, then enable STORE_ADAPTER=postgres with ENABLE_POSTGRES_STORE_ADAPTER=true.",
      "Add workspace_id/merchant_id isolation to all state-changing APIs.",
      "Move long-running agent execution to a queue worker.",
      "Add operator auth and deployment secrets before exposing outside localhost."
    ]
  };
}

function buildCheck(check) {
  const required = check.required_env.map(envStatus);
  const optional = check.optional_env.map(envStatus);
  const missing = required.filter((item) => !item.configured);

  return {
    ...check,
    ready: missing.length === 0,
    status: missing.length === 0 ? "ready" : "missing_required_env",
    required_env: required,
    optional_env: optional,
    missing_required_env: missing.map((item) => item.name)
  };
}

function getStorageStatus(store) {
  if (store.adapter === "postgres" && store.status === "disabled") {
    return {
      adapter: "postgres",
      status: "postgres_adapter_disabled"
    };
  }

  if (store.adapter === "postgres" && store.status === "enabled_sql_adapter") {
    return {
      adapter: "postgres",
      status: "postgres_sql_adapter_enabled"
    };
  }

  return {
    adapter: store.adapter ?? "unknown",
    status: store.adapter === "json" ? "local_development" : "unknown"
  };
}

function envStatus(name) {
  const value = process.env[name] ?? "";
  return {
    name,
    configured: Boolean(value),
    masked_value: value ? mask(value) : null
  };
}

function mask(value) {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getStoreSize(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}
