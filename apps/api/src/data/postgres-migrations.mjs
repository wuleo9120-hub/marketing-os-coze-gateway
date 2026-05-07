import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getPostgresConnectionConfig,
  runPsql
} from "./postgres-connection.mjs";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const DEFAULT_SCHEMA_PATH = join(root, "infra/postgres/schema.sql");
const MIGRATION_ID = "0001_initial_schema";

export async function getPostgresMigrationPlan(options = {}) {
  const schemaPath = options.schema_path ?? DEFAULT_SCHEMA_PATH;
  const sql = await readFile(schemaPath, "utf8");
  const checksum = sha256(sql);
  const config = getPostgresConnectionConfig(options);

  return {
    configured: config.configured,
    psql_bin: config.psql_bin,
    database_url: config.masked_database_url,
    schema_path: schemaPath,
    migrations: [
      {
        id: MIGRATION_ID,
        path: schemaPath,
        checksum,
        bytes: Buffer.byteLength(sql, "utf8")
      }
    ]
  };
}

export async function runPostgresMigrations(options = {}) {
  const dryRun = options.dry_run ?? true;
  const plan = await getPostgresMigrationPlan(options);

  if (!plan.configured) {
    return {
      mode: "not_configured",
      dry_run: dryRun,
      plan,
      applied: [],
      skipped: [],
      message: "DATABASE_URL is not configured. Migration runner stayed in planning mode."
    };
  }

  if (dryRun) {
    return {
      mode: "dry_run",
      dry_run: true,
      plan,
      applied: [],
      skipped: [],
      message: "Dry run only. Use --apply to execute migrations."
    };
  }

  await ensureMigrationTable(options);
  const alreadyApplied = await isMigrationApplied(MIGRATION_ID, options);
  if (alreadyApplied) {
    return {
      mode: "applied",
      dry_run: false,
      plan,
      applied: [],
      skipped: [MIGRATION_ID],
      message: `${MIGRATION_ID} already exists in schema_migrations.`
    };
  }

  await runPsql(["--set", "ON_ERROR_STOP=1", "--file", plan.migrations[0].path], options);
  await recordMigration(plan.migrations[0], options);

  return {
    mode: "applied",
    dry_run: false,
    plan,
    applied: [MIGRATION_ID],
    skipped: [],
    message: `${MIGRATION_ID} applied.`
  };
}

async function ensureMigrationTable(options) {
  await runPsql(
    [
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      [
        "create table if not exists schema_migrations (",
        "id text primary key,",
        "checksum text not null,",
        "applied_at timestamptz not null default now()",
        ");"
      ].join(" ")
    ],
    options
  );
}

async function isMigrationApplied(id, options) {
  const result = await runPsql(
    [
      "--tuples-only",
      "--no-align",
      "--command",
      `select id from schema_migrations where id = '${escapeSql(id)}' limit 1;`
    ],
    options
  );

  return result.stdout.trim() === id;
}

async function recordMigration(migration, options) {
  await runPsql(
    [
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      [
        "insert into schema_migrations (id, checksum) values",
        `('${escapeSql(migration.id)}', '${escapeSql(migration.checksum)}')`,
        "on conflict (id) do nothing;"
      ].join(" ")
    ],
    options
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}
