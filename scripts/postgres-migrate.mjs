import { runPostgresMigrations } from "../apps/api/src/data/postgres-migrations.mjs";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;

const result = await runPostgresMigrations({
  dry_run: dryRun
});

console.log(JSON.stringify(result, null, 2));

if (apply && result.mode === "not_configured") {
  process.exitCode = 1;
}
