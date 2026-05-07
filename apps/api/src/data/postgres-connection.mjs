import { execFile } from "node:child_process";
import { execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function getPostgresConnectionConfig(options = {}) {
  const databaseUrl = options.database_url ?? process.env.DATABASE_URL ?? "";
  const psqlBin = options.psql_bin ?? process.env.PSQL_BIN ?? "psql";
  const timeoutMs = Number(
    options.timeout_ms ?? process.env.POSTGRES_MIGRATION_TIMEOUT_MS ?? 30000
  );

  return {
    configured: Boolean(databaseUrl),
    database_url: databaseUrl,
    psql_bin: psqlBin,
    timeout_ms: timeoutMs,
    masked_database_url: databaseUrl ? maskDatabaseUrl(databaseUrl) : null
  };
}

export async function runPsql(args, options = {}) {
  const config = getPostgresConnectionConfig(options);
  if (!config.configured) {
    const error = new Error("DATABASE_URL is required for psql execution.");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }

  const { stdout, stderr } = await execFileAsync(
    config.psql_bin,
    ["--dbname", config.database_url, ...args],
    {
      timeout: config.timeout_ms,
      maxBuffer: 1024 * 1024
    }
  );

  return {
    stdout,
    stderr
  };
}

export function runPsqlSync(args, options = {}) {
  const config = getPostgresConnectionConfig(options);
  if (!config.configured) {
    const error = new Error("DATABASE_URL is required for psql execution.");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }

  const stdout = execFileSync(
    config.psql_bin,
    ["--dbname", config.database_url, ...args],
    {
      input: options.input,
      timeout: config.timeout_ms,
      maxBuffer: 1024 * 1024 * 8,
      encoding: "utf8"
    }
  );

  return {
    stdout,
    stderr: ""
  };
}

export function maskDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = "********";
    if (url.username) url.username = `${url.username.slice(0, 2)}***`;
    return url.toString();
  } catch {
    if (value.length <= 12) return "********";
    return `${value.slice(0, 8)}...${value.slice(-4)}`;
  }
}
