import assert from "node:assert/strict";

import { maskDatabaseUrl } from "../apps/api/src/data/postgres-connection.mjs";
import {
  getPostgresMigrationPlan,
  runPostgresMigrations
} from "../apps/api/src/data/postgres-migrations.mjs";

const plan = await getPostgresMigrationPlan({
  database_url: ""
});

assert.equal(plan.configured, false);
assert.equal(plan.migrations.length, 1);
assert.equal(plan.migrations[0].id, "0001_initial_schema");
assert.ok(plan.migrations[0].checksum.length >= 32);
assert.ok(plan.migrations[0].bytes > 1000);

const dry = await runPostgresMigrations({
  database_url: "",
  dry_run: true
});

assert.equal(dry.mode, "not_configured");
assert.equal(dry.applied.length, 0);
assert.match(dry.message, /DATABASE_URL/);

assert.equal(
  maskDatabaseUrl("postgres://user:secret@example.com:5432/app"),
  "postgres://us***:********@example.com:5432/app"
);

console.log("postgres-migration-test passed", {
  migration_id: plan.migrations[0].id,
  checksum: plan.migrations[0].checksum.slice(0, 12),
  mode: dry.mode
});
