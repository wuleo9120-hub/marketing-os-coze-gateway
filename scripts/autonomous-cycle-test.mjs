import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-cycle-${Date.now()}.json`
);

const { seedInitialData, getSnapshot } = await import(
  "../apps/api/src/data/store.mjs"
);
const { runAutonomousCycle } = await import(
  "../apps/api/src/core/autonomous-cycle.mjs"
);

seedInitialData();

const result = await runAutonomousCycle({
  title: "Autonomous cycle test",
  instruction:
    "请系统自主复盘当前自动化营销系统状态，生成下一阶段低风险建设任务并自动执行。"
});

if (!result.cycle_memory?.id) {
  throw new Error("Expected autonomous cycle to write a cycle memory.");
}

if (!result.plan?.root_task_id) {
  throw new Error("Expected autonomous cycle to create a root task.");
}

if (result.queue_execution.failed > 0) {
  throw new Error("Expected autonomous cycle to avoid failed low-risk tasks.");
}

const snapshot = getSnapshot();

const report = {
  cycle_memory_id: result.cycle_memory.id,
  plan: result.plan,
  queue_execution: result.queue_execution,
  optimization: {
    memory_id: result.optimization.memory_id,
    recommendations: result.optimization.recommendations.length,
    experiments: result.optimization.experiments.length,
    approval_required: result.optimization.approval_required.length
  },
  totals: {
    tasks: snapshot.tasks.length,
    memories: snapshot.memories.length,
    experiments: snapshot.experiments.length,
    approvals: snapshot.approvals.length
  }
};

console.log(JSON.stringify(report, null, 2));
