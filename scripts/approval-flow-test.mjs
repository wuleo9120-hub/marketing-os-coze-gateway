import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-approval-${Date.now()}.json`
);

const { handleUserInstruction } = await import(
  "../apps/api/src/core/orchestrator.mjs"
);
const {
  decideApproval,
  getSnapshot,
  getStoreInfo,
  seedInitialData,
  updateTask
} = await import("../apps/api/src/data/store.mjs");
const { runApprovedTask } = await import(
  "../apps/api/src/core/task-executor.mjs"
);

seedInitialData();

const approvalScenario = await handleUserInstruction(
  "请生成抖音发布包并发布前等待审批。",
  { auto_execute: true }
);

const approvalSnapshot = getSnapshot();
const pendingApproval = approvalSnapshot.approvals.find((approval) =>
  matchesApprovalTask(approvalSnapshot, approval, "publishing_ops")
);

if (!pendingApproval) {
  throw new Error("Expected a pending approval.");
}

const approved = decideApproval(pendingApproval.id, {
  status: "approved",
  decided_by: "approval-flow-test",
  decision_note: "Approved for smoke testing."
});
const approvedExecution = await runApprovedTask(approved.task_id);

const rejectScenario = await handleUserInstruction(
  "请准备批量群发客户触达任务，必须先审批。",
  { auto_execute: true }
);

const rejectSnapshot = getSnapshot();
const approvalToReject = rejectSnapshot.approvals.find((approval) =>
  matchesApprovalTask(rejectSnapshot, approval, "customer_service")
);

if (!approvalToReject) {
  throw new Error("Expected a second pending approval.");
}

const rejected = decideApproval(approvalToReject.id, {
  status: "rejected",
  decided_by: "approval-flow-test",
  decision_note: "Rejected for smoke testing."
});
updateTask(rejected.task_id, {
  status: "rejected",
  output_result: {
    task_summary: "Task was rejected by approval-flow-test.",
    key_findings: [`Approval: ${rejected.id}`],
    artifacts: [rejected.id],
    memory_updates: [],
    next_actions: ["No execution will happen for this rejected task."],
    risk_flags: ["Human rejected this action."]
  },
  finished_at: new Date().toISOString()
});

const finalSnapshot = getSnapshot();

const report = {
  approval_scenario: {
    root_task_id: approvalScenario.root_task.id,
    approval_id: approved.id,
    approval_status: approved.status,
    execution_status: approvedExecution.status
  },
  rejection_scenario: {
    root_task_id: rejectScenario.root_task.id,
    approval_id: rejected.id,
    approval_status: rejected.status,
    task_status: finalSnapshot.tasks.find((task) => task.id === rejected.task_id)
      ?.status
  },
  totals: {
    tasks: finalSnapshot.tasks.length,
    approvals: finalSnapshot.approvals.length,
    tool_calls: finalSnapshot.tool_calls.length,
    memories: finalSnapshot.memories.length
  },
  store: getStoreInfo()
};

console.log(JSON.stringify(report, null, 2));

function matchesApprovalTask(snapshot, approval, agentType) {
  if (approval.status !== "pending") return false;
  const task = snapshot.tasks.find((item) => item.id === approval.task_id);
  return task?.agent_type === agentType;
}
