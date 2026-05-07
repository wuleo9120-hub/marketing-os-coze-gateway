import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-smoke-${Date.now()}.json`
);

const { handleUserInstruction } = await import(
  "../apps/api/src/core/orchestrator.mjs"
);
const { getSnapshot, getStoreInfo, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

const result = await handleUserInstruction(
  "请帮我设计一个抖音和小红书营销计划，生成3条短视频脚本，并准备发布前审批。"
);

const snapshot = getSnapshot();

const report = {
  reply: result.reply,
  root_task_id: result.root_task.id,
  child_task_count: result.child_tasks.length,
  execution_summary: result.execution_summary,
  approval_created: Boolean(result.approval),
  memory_count: snapshot.memories.length,
  task_count: snapshot.tasks.length,
  store_path: getStoreInfo().path
};

console.log(JSON.stringify(report, null, 2));
