import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import "./core/env-loader.mjs";
import {
  createMemory,
  decideApproval,
  getApproval,
  getStoreInfo,
  getSnapshot,
  getTask,
  listWorkspaces,
  listApprovals,
  listMemories,
  listMessages,
  listTasks,
  listToolCalls,
  seedInitialData,
  upsertWorkspace,
  updateTask
} from "./data/store.mjs";
import {
  getConfigOverview,
  isRuntimeConfigConfigured
} from "./core/config-registry.mjs";
import { handleUserInstruction } from "./core/orchestrator.mjs";
import {
  createExperimentRecord,
  getAnalyticsOverview,
  recordMetric,
  runStrategyReview
} from "./core/analytics-review.mjs";
import { runAgentOptimization } from "./core/agent-optimizer.mjs";
import { runAutonomousCycle } from "./core/autonomous-cycle.mjs";
import { seedDemoMerchantFlow } from "./core/demo-data.mjs";
import { getHermesStatus } from "./core/connectors/hermes-gateway.mjs";
import { getOpenClawStatus } from "./core/connectors/openclaw-connector.mjs";
import {
  getPlatformConnectorStatus,
  submitPublishingJob,
  syncPlatformMetrics
} from "./core/connectors/platform-connector.mjs";
import {
  getWeComStatus,
  ingestWeComLead,
  receiveWeComMessage
} from "./core/connectors/wecom-connector.mjs";
import {
  getWeixinPersonalStatus,
  ingestWeixinPersonalLead,
  receiveWeixinPersonalMessage
} from "./core/connectors/weixin-personal-connector.mjs";
import {
  createLeadRecord,
  getCrmOverview,
  getLeadConversation,
  receiveCustomerMessage
} from "./core/customer-service.mjs";
import {
  createContentAssetRecord,
  createPublishingPackage,
  getContentOverview
} from "./core/content-ops.mjs";
import {
  addKnowledgeDocument,
  getKnowledgeOverview,
  queryKnowledge
} from "./core/knowledge-base.mjs";
import { getGovernanceOverview } from "./core/governance.mjs";
import { getIntegrationReadiness } from "./core/integration-readiness.mjs";
import { onboardMerchant } from "./core/merchant-onboarding.mjs";
import { generateFirstMarketingPlan } from "./core/first-marketing-plan.mjs";
import { runMetricReviewLoop } from "./core/metric-review-loop.mjs";
import { executeNextRoundTasks } from "./core/next-round-execution.mjs";
import {
  getPublishingReviewQueue,
  markPublishingJobPublished
} from "./core/publishing-review.mjs";
import { getProductionReadiness } from "./core/production-readiness.mjs";
import { getProjectStatus } from "./core/project-status.mjs";
import { runApprovedTask, runPendingTasks } from "./core/task-executor.mjs";
import { listTools } from "./core/tool-registry.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const webRoot = join(root, "apps/web/public");
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const maxJsonBodyBytes = Number(process.env.MAX_JSON_BODY_BYTES ?? 1024 * 1024);

seedInitialData();

export async function handleRequest(request, response) {
  try {
    await route(request, response);
  } catch (error) {
    const status = Number(error?.statusCode ?? 500);
    sendJson(response, status, {
      error: "internal_error",
      message: status >= 500 ? "Internal server error" : String(error.message)
    });
  }
}

const server = createServer(handleRequest);

if (shouldStartServer()) {
  server.listen(port, host, () => {
    console.log(`AI marketing agents MVP listening on http://${host}:${port}`);
  });
}

function shouldStartServer() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestWorkspaceId = getRequestWorkspaceId(request, url);

  if (request.method === "OPTIONS") {
    response.writeHead(204, securityHeaders(request));
    return response.end();
  }

  if (url.pathname === "/api/coze/openapi.yaml") {
    return sendText(
      response,
      200,
      await getCozeOpenApiYaml(request),
      "text/yaml; charset=utf-8"
    );
  }

  if (url.pathname.startsWith("/api/coze/")) {
    const cozeAccess = verifyCozeAccess(request);
    if (!cozeAccess.allowed) {
      return sendJson(response, cozeAccess.status, {
        error: "forbidden",
        message: cozeAccess.reason
      });
    }
    return routeCoze(request, response, url, requestWorkspaceId);
  }

  if (url.pathname.startsWith("/api/")) {
    const writeAccess = verifyWriteAccess(request, url);
    if (!writeAccess.allowed) {
      return sendJson(response, writeAccess.status, {
        error: "forbidden",
        message: writeAccess.reason
      });
    }
  }

  if (url.pathname === "/api/health") {
    return sendJson(response, 200, {
      ok: true,
      service: "ai-marketing-agents",
      model_configured: isRuntimeConfigConfigured("openai"),
      store: getStoreInfo()
    });
  }

  if (url.pathname === "/api/config") {
    return sendJson(response, 200, getConfigOverview());
  }

  if (url.pathname === "/api/governance") {
    return sendJson(response, 200, getGovernanceOverview());
  }

  if (url.pathname === "/api/integrations/readiness") {
    return sendJson(response, 200, getIntegrationReadiness());
  }

  if (url.pathname === "/api/project/status") {
    return sendJson(response, 200, getProjectStatus());
  }

  if (url.pathname === "/api/production/readiness") {
    return sendJson(response, 200, getProductionReadiness());
  }

  if (url.pathname === "/api/snapshot") {
    return sendJson(response, 200, getSnapshot());
  }

  if (url.pathname === "/api/workspaces" && request.method === "GET") {
    return sendJson(response, 200, {
      active_workspace_id: requestWorkspaceId,
      workspaces: listWorkspaces()
    });
  }

  if (url.pathname === "/api/workspaces" && request.method === "POST") {
    const body = await readJson(request);
    const workspace = upsertWorkspace({
      id: body.id ?? body.workspace_id,
      name: body.name,
      merchant_name: body.merchant_name,
      status: body.status
    });
    return sendJson(response, 201, { workspace });
  }

  if (url.pathname === "/api/messages") {
    return sendJson(response, 200, {
      messages: listMessages({ workspace_id: requestWorkspaceId })
    });
  }

  if (url.pathname === "/api/memories" && request.method === "GET") {
    return sendJson(response, 200, {
      memories: listMemories({
        workspace_id: requestWorkspaceId,
        type: url.searchParams.get("type") || undefined
      })
    });
  }

  if (url.pathname === "/api/memories" && request.method === "POST") {
    const body = await readJson(request);
    const memory = createMemory({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      memory_type: body.memory_type ?? "brand",
      title: body.title ?? "Untitled memory",
      content: body.content ?? "",
      summary: body.summary,
      source_type: "manual",
      created_by_agent: "user",
      importance: body.importance ?? 3
    });
    return sendJson(response, 201, { memory });
  }

  if (url.pathname === "/api/knowledge/documents" && request.method === "GET") {
    return sendJson(
      response,
      200,
      getKnowledgeOverview({ workspace_id: requestWorkspaceId })
    );
  }

  if (url.pathname === "/api/knowledge/documents" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.title || !body.content) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "title and content are required"
      });
    }

    const result = addKnowledgeDocument({
      title: body.title,
      content: body.content,
      source_type: body.source_type,
      content_type: body.content_type,
      memory_type: body.memory_type,
      importance: body.importance,
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      metadata: body.metadata
    });

    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/knowledge/search") {
    const query = url.searchParams.get("q") ?? "";
    if (!query.trim()) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "q is required"
      });
    }

    return sendJson(
      response,
      200,
      queryKnowledge(query, {
        workspace_id: requestWorkspaceId,
        limit: Number(url.searchParams.get("limit") ?? 8)
      })
    );
  }

  if (url.pathname === "/api/tasks") {
    return sendJson(response, 200, {
      tasks: listTasks({ workspace_id: requestWorkspaceId })
    });
  }

  if (url.pathname === "/api/content/assets" && request.method === "GET") {
    return sendJson(
      response,
      200,
      getContentOverview({ workspace_id: requestWorkspaceId })
    );
  }

  if (url.pathname === "/api/content/assets" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.title || !body.body) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "title and body are required"
      });
    }

    const asset = createContentAssetRecord({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      asset_type: body.asset_type,
      title: body.title,
      body: body.body,
      platform: body.platform,
      status: body.status,
      metadata: body.metadata
    });
    return sendJson(response, 201, { asset });
  }

  if (url.pathname === "/api/content/publishing-packages" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.content_asset_id) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "content_asset_id is required"
      });
    }

    const packages = createPublishingPackage({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      content_asset_id: body.content_asset_id,
      platforms: body.platforms,
      scheduled_for: body.scheduled_for
    });
    return sendJson(response, 201, { packages });
  }

  if (url.pathname === "/api/analytics" && request.method === "GET") {
    return sendJson(
      response,
      200,
      getAnalyticsOverview({ workspace_id: requestWorkspaceId })
    );
  }

  if (url.pathname === "/api/analytics/metrics" && request.method === "POST") {
    const body = await readJson(request);
    const required = ["entity_type", "entity_id", "metric_name"];
    const missing = required.filter((key) => !body[key]);
    if (missing.length > 0) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: `missing: ${missing.join(", ")}`
      });
    }

    const metric = recordMetric({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      metric_name: body.metric_name,
      metric_value: body.metric_value,
      platform: body.platform,
      metadata: body.metadata,
      measured_at: body.measured_at
    });
    return sendJson(response, 201, { metric });
  }

  if (url.pathname === "/api/analytics/experiments" && request.method === "POST") {
    const body = await readJson(request);
    const experiment = createExperimentRecord({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      name: body.name,
      hypothesis: body.hypothesis,
      status: body.status,
      related_entity_type: body.related_entity_type,
      related_entity_id: body.related_entity_id
    });
    return sendJson(response, 201, { experiment });
  }

  if (url.pathname === "/api/analytics/review" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      runStrategyReview({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        title: body.title
      })
    );
  }

  if (url.pathname === "/api/agents/optimize" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      runAgentOptimization({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        title: body.title
      })
    );
  }

  if (url.pathname === "/api/agents/autonomous-cycle" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      await runAutonomousCycle({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        title: body.title,
        instruction: body.instruction,
        create_plan: body.create_plan
      })
    );
  }

  if (url.pathname === "/api/demo/merchant-flow" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      await seedDemoMerchantFlow({
        run_id: body.run_id
      })
    );
  }

  if (url.pathname === "/api/merchant/onboarding" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      onboardMerchant({
        ...body,
        workspace_id: body.workspace_id ?? requestWorkspaceId
      })
    );
  }

  if (url.pathname === "/api/marketing/first-plan" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      generateFirstMarketingPlan({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        run_id: body.run_id
      })
    );
  }

  if (url.pathname === "/api/marketing/metric-review-loop" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      runMetricReviewLoop({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        run_id: body.run_id
      })
    );
  }

  if (url.pathname === "/api/marketing/execute-next-round" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      await executeNextRoundTasks({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        run_id: body.run_id,
        platforms: body.platforms
      })
    );
  }

  if (url.pathname === "/api/publishing/review") {
    return sendJson(
      response,
      200,
      getPublishingReviewQueue({ workspace_id: requestWorkspaceId })
    );
  }

  const manualPublishMatch = url.pathname.match(
    /^\/api\/publishing\/jobs\/([^/]+)\/manual-publish$/
  );
  if (manualPublishMatch && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      markPublishingJobPublished({
        workspace_id: body.workspace_id ?? requestWorkspaceId,
        publishing_job_id: manualPublishMatch[1],
        external_post_url: body.external_post_url,
        external_post_id: body.external_post_id,
        note: body.note,
        published_at: body.published_at,
        metrics: body.metrics
      })
    );
  }

  if (url.pathname === "/api/crm/leads" && request.method === "GET") {
    return sendJson(response, 200, getCrmOverview({ workspace_id: requestWorkspaceId }));
  }

  if (url.pathname === "/api/crm/leads" && request.method === "POST") {
    const body = await readJson(request);
    const lead = createLeadRecord({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      source_platform: body.source_platform,
      source_content_id: body.source_content_id,
      display_name: body.display_name,
      contact_method: body.contact_method,
      contact_value: body.contact_value,
      summary: body.summary
    });
    return sendJson(response, 201, { lead });
  }

  const leadConversationMatch = url.pathname.match(
    /^\/api\/crm\/leads\/([^/]+)\/conversation$/
  );
  if (leadConversationMatch && request.method === "GET") {
    return sendJson(response, 200, getLeadConversation(leadConversationMatch[1]));
  }

  if (leadConversationMatch && request.method === "POST") {
    const body = await readJson(request);
    if (!body.content) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "content is required"
      });
    }

    const result = receiveCustomerMessage({
      lead_id: leadConversationMatch[1],
      content: body.content
    });
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/approvals") {
    return sendJson(response, 200, {
      approvals: listApprovals({ workspace_id: requestWorkspaceId })
    });
  }

  const approvalDecisionMatch = url.pathname.match(
    /^\/api\/approvals\/([^/]+)\/decision$/
  );
  if (approvalDecisionMatch && request.method === "POST") {
    const body = await readJson(request);
    const approval = getApproval(approvalDecisionMatch[1]);
    if (!approval) {
      return sendJson(response, 404, {
        error: "not_found",
        message: "approval not found"
      });
    }

    const decided = decideApproval(approval.id, {
      status: body.status,
      decided_by: body.decided_by ?? "user",
      decision_note: body.decision_note
    });

    if (decided.status === "rejected") {
      const task = getTask(decided.task_id);
      if (task) {
        updateTask(task.id, {
          status: "rejected",
          output_result: {
            task_summary: "Task was rejected by approval decision.",
            key_findings: [`Approval: ${decided.id}`],
            artifacts: [decided.id],
            memory_updates: [],
            next_actions: ["Revise the task and request approval again if needed."],
            risk_flags: ["Human rejected this action."]
          },
          finished_at: new Date().toISOString()
        });
      }
      return sendJson(response, 200, {
        approval: decided,
        execution: null
      });
    }

    const execution = await runApprovedTask(decided.task_id);
    return sendJson(response, 200, {
      approval: decided,
      execution
    });
  }

  if (url.pathname === "/api/tool-calls") {
    return sendJson(response, 200, {
      tool_calls: listToolCalls({ workspace_id: requestWorkspaceId })
    });
  }

  if (url.pathname === "/api/tools") {
    return sendJson(response, 200, { tools: listTools() });
  }

  if (url.pathname === "/api/hermes/status") {
    return sendJson(response, 200, await getHermesStatus());
  }

  if (url.pathname === "/api/openclaw/status") {
    return sendJson(response, 200, await getOpenClawStatus());
  }

  if (url.pathname === "/api/platforms/status") {
    return sendJson(response, 200, await getPlatformConnectorStatus());
  }

  const publishingJobSubmitMatch = url.pathname.match(
    /^\/api\/platforms\/publishing-jobs\/([^/]+)\/submit$/
  );
  if (publishingJobSubmitMatch && request.method === "POST") {
    const body = await readJson(request);
    const result = await submitPublishingJob({
      publishing_job_id: publishingJobSubmitMatch[1],
      dry_run: body.dry_run ?? true
    });
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/platforms/metrics/sync" && request.method === "POST") {
    const body = await readJson(request);
    const result = await syncPlatformMetrics({
      platform: body.platform,
      since: body.since,
      limit: body.limit,
      include_drafts: body.include_drafts
    });
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/wecom/status") {
    return sendJson(response, 200, await getWeComStatus());
  }

  if (url.pathname === "/api/weixin-personal/status") {
    return sendJson(response, 200, getWeixinPersonalStatus());
  }

  if (url.pathname === "/api/weixin-personal/leads" && request.method === "POST") {
    const body = await readJson(request);
    const result = ingestWeixinPersonalLead({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      display_name: body.display_name,
      alias: body.alias,
      contact_value: body.contact_value,
      source_platform: body.source_platform,
      source_content_id: body.source_content_id,
      summary: body.summary
    });
    return sendJson(response, 201, result);
  }

  const weixinPersonalMessageMatch = url.pathname.match(
    /^\/api\/weixin-personal\/leads\/([^/]+)\/messages$/
  );
  if (weixinPersonalMessageMatch && request.method === "POST") {
    const body = await readJson(request);
    if (!body.content) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "content is required"
      });
    }

    const result = receiveWeixinPersonalMessage({
      lead_id: weixinPersonalMessageMatch[1],
      content: body.content
    });
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/wecom/leads" && request.method === "POST") {
    const body = await readJson(request);
    const result = await ingestWeComLead({
      display_name: body.display_name,
      external_user_id: body.external_user_id,
      contact_value: body.contact_value,
      source_platform: body.source_platform,
      source_content_id: body.source_content_id,
      summary: body.summary
    });
    return sendJson(response, 201, result);
  }

  const wecomMessageMatch = url.pathname.match(
    /^\/api\/wecom\/leads\/([^/]+)\/messages$/
  );
  if (wecomMessageMatch && request.method === "POST") {
    const body = await readJson(request);
    if (!body.content) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "content is required"
      });
    }

    const result = await receiveWeComMessage({
      lead_id: wecomMessageMatch[1],
      content: body.content
    });
    return sendJson(response, 201, result);
  }

  if (url.pathname === "/api/tasks/run" && request.method === "POST") {
    const body = await readJson(request);
    const result = await runPendingTasks({
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      parent_task_id: body.parent_task_id
    });
    return sendJson(response, 200, result);
  }

  if (url.pathname === "/api/chat" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.content || typeof body.content !== "string") {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "content is required"
      });
    }

    const result = await handleUserInstruction(body.content, {
      workspace_id: body.workspace_id ?? requestWorkspaceId,
      auto_execute: body.auto_execute ?? true
    });
    return sendJson(response, 200, result);
  }

  return serveStatic(url.pathname, response);
}

async function routeCoze(request, response, url, workspaceId) {
  if (url.pathname === "/api/coze/health") {
    return sendJson(response, 200, {
      ok: true,
      service: "marketing-os-coze-gateway",
      workspace_id: workspaceId,
      high_risk_actions: "approval_gated"
    });
  }

  if (url.pathname === "/api/coze/workspaces" && request.method === "GET") {
    return sendJson(response, 200, {
      active_workspace_id: workspaceId,
      workspaces: listWorkspaces()
    });
  }

  if (url.pathname === "/api/coze/workspaces" && request.method === "POST") {
    const body = await readJson(request);
    const workspace = upsertWorkspace({
      id: body.id ?? body.workspace_id,
      name: body.name,
      merchant_name: body.merchant_name ?? body.name,
      status: body.status
    });
    return sendJson(response, 201, {
      workspace,
      next_action: "Use this workspace_id in subsequent Coze tool calls."
    });
  }

  if (url.pathname === "/api/coze/merchant/onboarding" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      onboardMerchant({
        ...body,
        workspace_id: body.workspace_id ?? workspaceId
      })
    );
  }

  if (url.pathname === "/api/coze/marketing/first-plan" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      generateFirstMarketingPlan({
        workspace_id: body.workspace_id ?? workspaceId,
        run_id: body.run_id
      })
    );
  }

  if (url.pathname === "/api/coze/chat" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.content || typeof body.content !== "string") {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "content is required"
      });
    }
    const result = await handleUserInstruction(body.content, {
      workspace_id: body.workspace_id ?? workspaceId,
      auto_execute: body.auto_execute ?? true
    });
    return sendJson(response, 200, summarizeCozeChatResult(result));
  }

  if (url.pathname === "/api/coze/knowledge/search" && request.method === "POST") {
    const body = await readJson(request);
    const query = String(body.query ?? "").trim();
    if (!query) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "query is required"
      });
    }
    return sendJson(
      response,
      200,
      queryKnowledge(query, {
        workspace_id: body.workspace_id ?? workspaceId,
        limit: Number(body.limit ?? 5)
      })
    );
  }

  if (url.pathname === "/api/coze/crm/leads" && request.method === "POST") {
    const body = await readJson(request);
    const lead = createLeadRecord({
      workspace_id: body.workspace_id ?? workspaceId,
      source_platform: body.source_platform ?? "coze",
      source_content_id: body.source_content_id,
      display_name: body.display_name,
      contact_method: body.contact_method,
      contact_value: body.contact_value,
      summary: body.summary
    });
    return sendJson(response, 201, { lead });
  }

  if (url.pathname === "/api/coze/crm/messages" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.lead_id || !body.content) {
      return sendJson(response, 400, {
        error: "bad_request",
        message: "lead_id and content are required"
      });
    }
    const result = receiveCustomerMessage({
      workspace_id: body.workspace_id ?? workspaceId,
      lead_id: body.lead_id,
      content: body.content
    });
    return sendJson(response, 201, {
      lead: result.lead,
      assistant_reply: result.assistant_message.content,
      intent: result.intent,
      handoff: result.handoff,
      policy_note: "AI reply is a draft unless an approved official channel is configured."
    });
  }

  if (url.pathname === "/api/coze/publishing/review" && request.method === "GET") {
    const review = getPublishingReviewQueue({ workspace_id: workspaceId });
    return sendJson(response, 200, {
      totals: review.totals,
      items: review.items.slice(0, Number(url.searchParams.get("limit") ?? 10))
    });
  }

  if (url.pathname === "/api/coze/marketing/metric-review-loop" && request.method === "POST") {
    const body = await readJson(request);
    return sendJson(
      response,
      201,
      runMetricReviewLoop({
        workspace_id: body.workspace_id ?? workspaceId,
        run_id: body.run_id
      })
    );
  }

  return sendJson(response, 404, {
    error: "not_found",
    message: "Unknown Coze gateway endpoint."
  });
}

async function getCozeOpenApiYaml(request) {
  const yamlPath = join(root, "integrations/coze/openapi.yaml");
  const yaml = await readFile(yamlPath, "utf8");
  const publicBaseUrl =
    process.env.COZE_PUBLIC_BASE_URL ||
    `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host}`;

  return yaml.replaceAll(
    "https://YOUR_PUBLIC_MARKETING_OS_HOST",
    publicBaseUrl.replace(/\/+$/, "")
  );
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(webRoot, `.${safePath}`);

  if (!filePath.startsWith(`${resolve(webRoot)}${sep}`)) {
    return sendJson(response, 403, { error: "forbidden" });
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      ...securityHeaders(),
      "content-type": contentType(filePath)
    });
    response.end(body);
  } catch {
    sendJson(response, 404, { error: "not_found" });
  }
}

function contentType(filePath) {
  const extension = extname(filePath);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if ([".yaml", ".yml"].includes(extension)) return "text/yaml; charset=utf-8";
  return "application/octet-stream";
}

async function readJson(request) {
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (contentLength > maxJsonBodyBytes) {
    throw httpError(413, `Request body is too large. Limit: ${maxJsonBodyBytes} bytes.`);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxJsonBodyBytes) {
      throw httpError(413, `Request body is too large. Limit: ${maxJsonBodyBytes} bytes.`);
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "Request body must be valid JSON.");
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...securityHeaders(),
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(redactSecrets(payload), null, 2));
}

function sendText(response, status, body, contentTypeValue) {
  response.writeHead(status, {
    ...securityHeaders(),
    "content-type": contentTypeValue
  });
  response.end(body);
}

function getRequestWorkspaceId(request, url) {
  return (
    url.searchParams.get("workspace_id") ||
    request.headers["x-workspace-id"] ||
    process.env.DEFAULT_WORKSPACE_ID ||
    "default"
  );
}

function summarizeCozeChatResult(result) {
  return {
    reply: result.reply,
    root_task_id: result.root_task.id,
    child_task_count: result.child_tasks.length,
    approval_required: Boolean(result.approval),
    approval_id: result.approval?.id ?? null,
    model_route: result.model_route,
    execution_summary: result.execution_summary,
    next_action: result.approval
      ? "Open Marketing OS approval center before any high-risk action."
      : "Review generated assets, memory updates, and publishing packages in Marketing OS."
  };
}

function verifyCozeAccess(request) {
  if (process.env.COZE_PLUGIN_ENABLED !== "true") {
    return {
      allowed: false,
      status: 403,
      reason: "Coze plugin gateway is disabled. Set COZE_PLUGIN_ENABLED=true."
    };
  }

  const expectedToken =
    process.env.COZE_PLUGIN_TOKEN || process.env.LOCAL_API_WRITE_TOKEN || "";
  if (!expectedToken) {
    return {
      allowed: false,
      status: 403,
      reason: "COZE_PLUGIN_TOKEN or LOCAL_API_WRITE_TOKEN must be configured."
    };
  }

  const providedToken =
    request.headers["x-coze-token"] ||
    request.headers["x-api-token"] ||
    bearerToken(request.headers.authorization);

  if (providedToken !== expectedToken) {
    return {
      allowed: false,
      status: 401,
      reason: "A valid Coze plugin token is required."
    };
  }

  return { allowed: true };
}

function bearerToken(value) {
  if (!value) return null;
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function verifyWriteAccess(request, url) {
  if (["GET", "HEAD"].includes(request.method)) {
    return { allowed: true };
  }

  const configuredToken = process.env.LOCAL_API_WRITE_TOKEN;
  if (configuredToken) {
    const providedToken = request.headers["x-api-token"];
    if (providedToken !== configuredToken) {
      return {
        allowed: false,
        status: 401,
        reason: "A valid x-api-token header is required for write requests."
      };
    }
  }

  const hostHeader = request.headers.host ?? "";
  if (!isLocalHost(hostHeader.split(":")[0])) {
    return {
      allowed: false,
      status: 403,
      reason: "API writes are restricted to the local host."
    };
  }

  const origin = request.headers.origin;
  if (origin && !isAllowedLocalOrigin(origin, url)) {
    return {
      allowed: false,
      status: 403,
      reason: "Cross-origin write request was blocked."
    };
  }

  return { allowed: true };
}

function isAllowedLocalOrigin(origin, url) {
  try {
    const parsed = new URL(origin);
    return isLocalHost(parsed.hostname) && parsed.port === url.port;
  } catch {
    return false;
  }
}

function isLocalHost(value) {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(value);
}

function securityHeaders(request) {
  const origin = request?.headers?.origin;
  const headers = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer"
  };

  if (origin && isAllowedLocalOrigin(origin, new URL(request.url, `http://${request.headers.host}`))) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "GET,POST,OPTIONS";
    headers["access-control-allow-headers"] =
      "authorization,content-type,x-api-token,x-coze-token,x-workspace-id";
  }

  return headers;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        shouldRedactKey(key) ? "[redacted]" : redactSecrets(item)
      ])
    );
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[redacted]")
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*[^,\s"'}]+/gi, "$1=[redacted]");
}

function shouldRedactKey(key) {
  return /api[_-]?key|token|password|secret/i.test(key);
}
