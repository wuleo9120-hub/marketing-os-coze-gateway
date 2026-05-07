import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { createJsonStoreAdapter } = await import(
  "../apps/api/src/data/adapters/json-store-adapter.mjs"
);
const { createStoreAdapter } = await import(
  "../apps/api/src/data/adapters/store-adapter.mjs"
);
const { createPostgresStoreAdapter } = await import(
  "../apps/api/src/data/adapters/postgres-store-adapter.mjs"
);
const { buildLoadSql, buildPersistSql } = await import(
  "../apps/api/src/data/adapters/postgres-store-adapter.mjs"
);

const path = join(tmpdir(), `ai-marketing-store-adapter-${Date.now()}.json`);
const adapter = createJsonStoreAdapter({ path });
const defaultState = () => ({
  workspace: { id: "default", name: "Test" },
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
const normalizeState = (state) => ({
  ...defaultState(),
  ...state,
  memories: Array.isArray(state.memories) ? state.memories : []
});

const empty = adapter.load(defaultState, normalizeState);
assert.equal(empty.memories.length, 0);

empty.memories.push({
  id: "mem_000001",
  memory_type: "workflow",
  title: "Adapter test",
  content: "persist me"
});
adapter.persist(empty);

const loaded = adapter.load(defaultState, normalizeState);
assert.equal(loaded.memories.length, 1);
assert.equal(loaded.memories[0].title, "Adapter test");

const info = adapter.info(2);
assert.equal(info.adapter, "json");
assert.equal(info.path, path);
assert.equal(info.sequence, 2);
assert.ok(info.file_size_bytes > 0);

const selected = createStoreAdapter({ adapter: "json", path });
assert.equal(selected.info(3).adapter, "json");

const postgres = createPostgresStoreAdapter({
  database_url: "postgres://example.invalid/app"
});
assert.equal(postgres.info(1).adapter, "postgres");
assert.equal(postgres.info(1).status, "disabled");
assert.throws(
  () => postgres.load(defaultState, normalizeState),
  /ENABLE_POSTGRES_STORE_ADAPTER/
);

const loadSql = buildLoadSql();
assert.match(loadSql, /jsonb_build_object/);
assert.match(loadSql, /'workspaces'/);
assert.match(loadSql, /tool_calls/);
assert.match(loadSql, /messages/);

const persistSql = buildPersistSql({
  ...defaultState(),
  memories: loaded.memories
});
assert.match(persistSql, /begin;/);
assert.match(persistSql, /insert into workspaces/);
assert.match(persistSql, /insert into memories/);
assert.match(persistSql, /commit;/);

console.log("store-adapter-test passed", {
  adapter: info.adapter,
  file_size_bytes: info.file_size_bytes,
  memories: loaded.memories.length
});
