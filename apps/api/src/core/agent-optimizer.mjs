import {
  createExperiment,
  createMemory,
  getSnapshot,
  listExperiments
} from "../data/store.mjs";
import { getConfigOverview } from "./config-registry.mjs";
import { getGovernanceOverview } from "./governance.mjs";

export function runAgentOptimization(input = {}) {
  const snapshot = getSnapshot();
  const config = getConfigOverview();
  const governance = getGovernanceOverview();
  const workspaceId = input.workspace_id;
  const diagnostics = buildDiagnostics(
    filterSnapshotByWorkspace(snapshot, workspaceId),
    config,
    governance
  );
  const recommendations = buildRecommendations(diagnostics);
  const autonomousActions = buildAutonomousActions(recommendations);
  const approvalRequired = recommendations.filter(
    (item) => item.requires_approval
  );

  const memory = createMemory({
    workspace_id: workspaceId,
    memory_type: "strategy",
    title: input.title ?? `Agent optimization review ${new Date().toISOString()}`,
    content: JSON.stringify(
      {
        diagnostics,
        recommendations,
        autonomous_actions: autonomousActions,
        approval_required: approvalRequired
      },
      null,
      2
    ),
    summary: recommendations
      .map((item) => `${item.priority}: ${item.title}`)
      .join(" | ")
      .slice(0, 240),
    source_type: "agent_optimization",
    source_id: null,
    created_by_agent: "data_review",
    importance: 4
  });

  const existingExperimentNames = new Set(
    listExperiments({
      workspace_id: workspaceId,
      limit: 500
    }).map((experiment) => experiment.name)
  );
  const experiments = autonomousActions
    .filter((action) => action.type === "experiment")
    .filter((action) => !existingExperimentNames.has(action.title))
    .map((action) =>
      createExperiment({
        workspace_id: workspaceId,
        name: action.title,
        hypothesis: action.hypothesis,
        status: "planned",
        related_entity_type: "agent_system",
        related_entity_id: "default"
      })
    );

  return {
    memory,
    diagnostics,
    recommendations,
    autonomous_actions: autonomousActions,
    experiments,
    approval_required: approvalRequired
  };
}

function filterSnapshotByWorkspace(snapshot, workspaceId = "default") {
  const match = (item) => (item.workspace_id || "default") === workspaceId;
  return {
    ...snapshot,
    memories: snapshot.memories.filter(match),
    tasks: snapshot.tasks.filter(match),
    approvals: snapshot.approvals.filter(match),
    messages: snapshot.messages.filter(match),
    tool_calls: snapshot.tool_calls.filter(match),
    knowledge_documents: snapshot.knowledge_documents.filter(match),
    knowledge_chunks: snapshot.knowledge_chunks.filter(match),
    leads: snapshot.leads.filter(match),
    customer_conversations: snapshot.customer_conversations.filter(match),
    sales_handoffs: snapshot.sales_handoffs.filter(match),
    content_assets: snapshot.content_assets.filter(match),
    publishing_jobs: snapshot.publishing_jobs.filter(match),
    performance_metrics: snapshot.performance_metrics.filter(match),
    experiments: snapshot.experiments.filter(match)
  };
}

function buildDiagnostics(snapshot, config, governance) {
  const taskCounts = countBy(snapshot.tasks, "status");
  const toolCounts = countBy(snapshot.tool_calls, "status");
  const recentFailures = snapshot.tool_calls
    .filter((toolCall) => ["failed", "blocked"].includes(toolCall.status))
    .slice(-20)
    .map((toolCall) => ({
      tool_name: toolCall.tool_name,
      status: toolCall.status,
      risk_level: toolCall.risk_level,
      output_summary: toolCall.output_summary
    }));
  const pendingApprovals = snapshot.approvals.filter(
    (approval) => approval.status === "pending"
  );
  const highRiskPending = pendingApprovals.filter((approval) =>
    ["L3", "L4"].includes(approval.risk_level)
  );
  const missingConfig = config.items
    .filter((item) => !item.configured)
    .map((item) => item.id);

  return {
    totals: {
      tasks: snapshot.tasks.length,
      memories: snapshot.memories.length,
      approvals: snapshot.approvals.length,
      tool_calls: snapshot.tool_calls.length,
      knowledge_documents: snapshot.knowledge_documents.length,
      content_assets: snapshot.content_assets.length,
      publishing_jobs: snapshot.publishing_jobs.length,
      leads: snapshot.leads.length,
      experiments: snapshot.experiments.length
    },
    task_counts: taskCounts,
    tool_call_counts: toolCounts,
    pending_approvals: pendingApprovals.length,
    high_risk_pending_approvals: highRiskPending.length,
    recent_failures: recentFailures,
    missing_config: missingConfig,
    governance_usage: governance.usage,
    governance_budgets: governance.policy.budgets
  };
}

function buildRecommendations(diagnostics) {
  const items = [];

  if (diagnostics.missing_config.includes("openclaw")) {
    items.push({
      priority: "P1",
      title: "Enable OpenClaw HTTP bridge for controlled automation",
      rationale:
        "OpenClaw is installed, but OPENCLAW_BASE_URL is not configured, so external automation remains in stub mode.",
      action:
        "Start the local OpenClaw HTTP bridge and set OPENCLAW_BASE_URL=http://127.0.0.1:9292.",
      requires_approval: false
    });
  }

  if (diagnostics.missing_config.includes("hermes")) {
    items.push({
      priority: "P2",
      title: "Keep Hermes in CLI-supervised mode until HTTP gateway is configured",
      rationale:
        "Hermes CLI is available, but HERMES_GATEWAY_URL is not set. Long-running memory tasks can still use CLI or stub behavior.",
      action:
        "Use Hermes only for strategy and memory learning tasks until an authenticated gateway URL is available.",
      requires_approval: false
    });
  }

  if (diagnostics.pending_approvals > 0) {
    items.push({
      priority: "P1",
      title: "Review pending high-risk approvals before live execution",
      rationale:
        `${diagnostics.pending_approvals} approvals are pending; ${diagnostics.high_risk_pending_approvals} are high-risk.`,
      action:
        "Approve only tasks with verified content, account, platform, and customer-contact scope.",
      requires_approval: true
    });
  }

  if (diagnostics.recent_failures.length > 0) {
    items.push({
      priority: "P2",
      title: "Use recent blocked or failed tool calls as learning material",
      rationale:
        "Blocked and failed tool calls reveal where agent plans exceed policy, configuration, or budget limits.",
      action:
        "Persist a strategy memory and create a low-risk experiment to reduce repeated blocked calls.",
      requires_approval: false
    });
  }

  if (diagnostics.totals.knowledge_documents === 0) {
    items.push({
      priority: "P1",
      title: "Add approved brand and product knowledge before scaling generation",
      rationale:
        "Content and customer-service quality depends on grounded product, offer, FAQ, and compliance documents.",
      action:
        "Upload brand/product documents through the knowledge-base API or web console.",
      requires_approval: false
    });
  }

  if (items.length === 0) {
    items.push({
      priority: "P3",
      title: "Continue collecting execution metrics",
      rationale:
        "No urgent optimization signal was detected from current task, tool, memory, or connector state.",
      action:
        "Run another review after more content, publishing, and CRM activity exists.",
      requires_approval: false
    });
  }

  return items;
}

function buildAutonomousActions(recommendations) {
  return recommendations
    .filter((item) => !item.requires_approval)
    .map((item) => ({
      type: "experiment",
      title: `Optimization: ${item.title}`,
      hypothesis: `${item.rationale} Proposed action: ${item.action}`,
      status: "planned"
    }));
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] ?? "unknown";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
