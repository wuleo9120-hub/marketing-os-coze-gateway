import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-agent-kb-${Date.now()}.json`
);

const { addKnowledgeDocument } = await import(
  "../apps/api/src/core/knowledge-base.mjs"
);
const { createTask, getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);
const { runTask } = await import("../apps/api/src/core/task-executor.mjs");

seedInitialData();

addKnowledgeDocument({
  title: "AI 营销系统产品资料",
  content: `
产品：AI 自动化营销中控系统。
核心能力：多 Agent 协作、共同记忆、知识库、内容生成、视频脚本、发布审批、企微客服、销售转人工。
客服话术：客户问能否自动发布时，要说明优先走官方 API，没有官方 API 的平台先生成发布包并人工确认。
禁用词：不要承诺百分百成交，不要承诺绕过平台风控，不要承诺自动添加私人微信。
  `,
  memory_type: "brand"
});

const task = createTask({
  agent_type: "content_creation",
  objective: "基于 AI 自动化营销中控系统资料，生成短视频脚本注意事项。",
  input_context: {
    expected_output: "Grounded content draft",
    user_instruction: "请基于产品资料生成内容"
  },
  risk_level: "L1",
  approval_required: false,
  assigned_tools: ["memory", "knowledge_base", "content_generator_stub"]
});

const execution = await runTask(task);
const snapshot = getSnapshot();
const completedTask = snapshot.tasks.find((item) => item.id === task.id);
const context = completedTask?.output_result?.agent_context;

if (execution.status !== "completed") {
  throw new Error(`Expected task to complete: ${execution.status}`);
}

if (!context || context.knowledge_result_count < 1) {
  throw new Error("Expected agent context to include retrieved knowledge.");
}

const report = {
  execution,
  retrieval_query: context.retrieval_query,
  knowledge_result_count: context.knowledge_result_count,
  first_knowledge_hit: context.knowledge_summary[0],
  key_findings: completedTask.output_result.key_findings
};

console.log(JSON.stringify(report, null, 2));

