import { handleUserInstruction } from "../apps/api/src/core/orchestrator.mjs";
import { getSnapshot, getStoreInfo, seedInitialData } from "../apps/api/src/data/store.mjs";

seedInitialData();

const instruction =
  process.argv.slice(2).join(" ").trim() ||
  "继续构建 AI 原生多 Agent 自动化营销系统，生成下一阶段工程任务并自动执行所有低风险构建任务。";

const result = await handleUserInstruction(instruction, {
  auto_execute: true
});

const snapshot = getSnapshot();

const report = {
  instruction,
  reply: result.reply,
  root_task_id: result.root_task.id,
  child_task_count: result.child_tasks.length,
  execution_summary: result.execution_summary,
  totals: {
    memories: snapshot.memories.length,
    tasks: snapshot.tasks.length,
    approvals: snapshot.approvals.length,
    tool_calls: snapshot.tool_calls.length
  },
  store: getStoreInfo()
};

console.log(JSON.stringify(report, null, 2));

