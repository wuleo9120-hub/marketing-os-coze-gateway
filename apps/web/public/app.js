const elements = {
  healthStatus: document.querySelector("#healthStatus"),
  projectStatus: document.querySelector("#projectStatus"),
  activeWorkspaceLabel: document.querySelector("#activeWorkspaceLabel"),
  workspaceSelect: document.querySelector("#workspaceSelect"),
  workspaceForm: document.querySelector("#workspaceForm"),
  workspaceName: document.querySelector("#workspaceName"),
  messages: document.querySelector("#messages"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  merchantOnboardingForm: document.querySelector("#merchantOnboardingForm"),
  merchantName: document.querySelector("#merchantName"),
  merchantIndustry: document.querySelector("#merchantIndustry"),
  merchantCity: document.querySelector("#merchantCity"),
  merchantBrandIntro: document.querySelector("#merchantBrandIntro"),
  merchantProducts: document.querySelector("#merchantProducts"),
  merchantAudience: document.querySelector("#merchantAudience"),
  merchantFaq: document.querySelector("#merchantFaq"),
  merchantCompliance: document.querySelector("#merchantCompliance"),
  merchantPlatforms: document.querySelector("#merchantPlatforms"),
  merchantWeixinQr: document.querySelector("#merchantWeixinQr"),
  merchantWeixinLabel: document.querySelector("#merchantWeixinLabel"),
  firstMarketingPlanButton: document.querySelector("#firstMarketingPlanButton"),
  merchantOnboardingResult: document.querySelector("#merchantOnboardingResult"),
  memoryForm: document.querySelector("#memoryForm"),
  memoryTitle: document.querySelector("#memoryTitle"),
  memoryContent: document.querySelector("#memoryContent"),
  knowledgeForm: document.querySelector("#knowledgeForm"),
  knowledgeTitle: document.querySelector("#knowledgeTitle"),
  knowledgeContent: document.querySelector("#knowledgeContent"),
  knowledgeSearchForm: document.querySelector("#knowledgeSearchForm"),
  knowledgeQuery: document.querySelector("#knowledgeQuery"),
  knowledgeResults: document.querySelector("#knowledgeResults"),
  leadForm: document.querySelector("#leadForm"),
  leadName: document.querySelector("#leadName"),
  leadPlatform: document.querySelector("#leadPlatform"),
  leadContact: document.querySelector("#leadContact"),
  customerMessageForm: document.querySelector("#customerMessageForm"),
  messageLeadId: document.querySelector("#messageLeadId"),
  customerMessage: document.querySelector("#customerMessage"),
  crmItems: document.querySelector("#crmItems"),
  weixinPersonalStatus: document.querySelector("#weixinPersonalStatus"),
  weixinPersonalLeadForm: document.querySelector("#weixinPersonalLeadForm"),
  weixinPersonalLeadName: document.querySelector("#weixinPersonalLeadName"),
  weixinPersonalAlias: document.querySelector("#weixinPersonalAlias"),
  weixinPersonalSource: document.querySelector("#weixinPersonalSource"),
  weixinPersonalMessageForm: document.querySelector("#weixinPersonalMessageForm"),
  weixinPersonalLeadId: document.querySelector("#weixinPersonalLeadId"),
  weixinPersonalMessage: document.querySelector("#weixinPersonalMessage"),
  weixinPersonalItems: document.querySelector("#weixinPersonalItems"),
  assetForm: document.querySelector("#assetForm"),
  assetTitle: document.querySelector("#assetTitle"),
  assetBody: document.querySelector("#assetBody"),
  publishingPackageForm: document.querySelector("#publishingPackageForm"),
  packageAssetId: document.querySelector("#packageAssetId"),
  packagePlatforms: document.querySelector("#packagePlatforms"),
  contentItems: document.querySelector("#contentItems"),
  manualPublishForm: document.querySelector("#manualPublishForm"),
  manualPublishJobId: document.querySelector("#manualPublishJobId"),
  manualPublishUrl: document.querySelector("#manualPublishUrl"),
  manualPublishViews: document.querySelector("#manualPublishViews"),
  manualPublishLikes: document.querySelector("#manualPublishLikes"),
  manualPublishComments: document.querySelector("#manualPublishComments"),
  manualPublishLeads: document.querySelector("#manualPublishLeads"),
  publishingReviewItems: document.querySelector("#publishingReviewItems"),
  metricForm: document.querySelector("#metricForm"),
  metricEntityType: document.querySelector("#metricEntityType"),
  metricEntityId: document.querySelector("#metricEntityId"),
  metricName: document.querySelector("#metricName"),
  metricValue: document.querySelector("#metricValue"),
  metricPlatform: document.querySelector("#metricPlatform"),
  reviewButton: document.querySelector("#reviewButton"),
  metricReviewLoopButton: document.querySelector("#metricReviewLoopButton"),
  executeNextRoundButton: document.querySelector("#executeNextRoundButton"),
  optimizeButton: document.querySelector("#optimizeButton"),
  cycleButton: document.querySelector("#cycleButton"),
  demoFlowButton: document.querySelector("#demoFlowButton"),
  analyticsItems: document.querySelector("#analyticsItems"),
  configItems: document.querySelector("#configItems"),
  productionItems: document.querySelector("#productionItems"),
  integrationItems: document.querySelector("#integrationItems"),
  memories: document.querySelector("#memories"),
  tasks: document.querySelector("#tasks"),
  approvals: document.querySelector("#approvals"),
  taskCount: document.querySelector("#taskCount"),
  memoryCount: document.querySelector("#memoryCount"),
  approvalCount: document.querySelector("#approvalCount"),
  toolCount: document.querySelector("#toolCount"),
  knowledgeCount: document.querySelector("#knowledgeCount"),
  leadCount: document.querySelector("#leadCount"),
  assetCount: document.querySelector("#assetCount"),
  metricCount: document.querySelector("#metricCount"),
  tools: document.querySelector("#tools"),
  refreshButton: document.querySelector("#refreshButton")
};

const workspaceStorageKey = "ai-marketing-active-workspace";
let activeWorkspaceId =
  localStorage.getItem(workspaceStorageKey) || "default";

elements.workspaceSelect.addEventListener("change", async () => {
  activeWorkspaceId = elements.workspaceSelect.value || "default";
  localStorage.setItem(workspaceStorageKey, activeWorkspaceId);
  await refreshAll();
});

elements.workspaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = elements.workspaceName.value.trim();
  if (!name) return;

  const workspaceId = normalizeWorkspaceId(name);
  await postJson("/api/workspaces", {
    id: workspaceId,
    name,
    merchant_name: name
  });
  activeWorkspaceId = workspaceId;
  localStorage.setItem(workspaceStorageKey, activeWorkspaceId);
  elements.workspaceName.value = "";
  await refreshAll();
});

elements.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = elements.chatInput.value.trim();
  if (!content) return;

  elements.chatInput.value = "";
  await postJson("/api/chat", { content });
  await refreshAll();
});

elements.merchantOnboardingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = elements.merchantName.value.trim();
  const industry = elements.merchantIndustry.value.trim();
  const brandIntro = elements.merchantBrandIntro.value.trim();
  const audience = elements.merchantAudience.value.trim();
  if (!name || !industry || !brandIntro || !audience) return;

  const result = await postJson("/api/merchant/onboarding", {
    name,
    industry,
    city: elements.merchantCity.value.trim(),
    brand_intro: brandIntro,
    products: elements.merchantProducts.value.trim(),
    audience,
    faq: elements.merchantFaq.value.trim(),
    compliance: elements.merchantCompliance.value.trim(),
    platforms: elements.merchantPlatforms.value.trim(),
    weixin_personal_qr_url: elements.merchantWeixinQr.value.trim(),
    weixin_personal_account_label: elements.merchantWeixinLabel.value.trim()
  });

  renderMerchantOnboardingResult(result);
  elements.merchantName.value = "";
  elements.merchantIndustry.value = "";
  elements.merchantCity.value = "";
  elements.merchantBrandIntro.value = "";
  elements.merchantProducts.value = "";
  elements.merchantAudience.value = "";
  elements.merchantFaq.value = "";
  elements.merchantCompliance.value = "";
  elements.merchantPlatforms.value = "";
  elements.merchantWeixinQr.value = "";
  elements.merchantWeixinLabel.value = "";
  await refreshAll();
});

elements.firstMarketingPlanButton.addEventListener("click", async () => {
  const result = await postJson("/api/marketing/first-plan", {
    run_id: `web_first_plan_${Date.now()}`
  });
  renderFirstMarketingPlanResult(result);
  await refreshAll();
});

elements.memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.memoryTitle.value.trim();
  const content = elements.memoryContent.value.trim();
  if (!title || !content) return;

  elements.memoryTitle.value = "";
  elements.memoryContent.value = "";
  await postJson("/api/memories", {
    memory_type: "brand",
    title,
    content,
    importance: 4
  });
  await refreshAll();
});

elements.knowledgeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.knowledgeTitle.value.trim();
  const content = elements.knowledgeContent.value.trim();
  if (!title || !content) return;

  elements.knowledgeTitle.value = "";
  elements.knowledgeContent.value = "";
  await postJson("/api/knowledge/documents", {
    title,
    content,
    memory_type: "brand"
  });
  await refreshAll();
});

elements.knowledgeSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = elements.knowledgeQuery.value.trim();
  if (!query) return;

  const result = await getJson(
    `/api/knowledge/search?q=${encodeURIComponent(query)}`
  );
  renderKnowledgeResults(result.results);
});

elements.leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = elements.leadName.value.trim();
  if (!displayName) return;

  await postJson("/api/crm/leads", {
    display_name: displayName,
    source_platform: elements.leadPlatform.value.trim() || "manual",
    contact_method: elements.leadContact.value.trim() ? "manual" : null,
    contact_value: elements.leadContact.value.trim() || null
  });

  elements.leadName.value = "";
  elements.leadPlatform.value = "";
  elements.leadContact.value = "";
  await refreshAll();
});

elements.customerMessageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const leadId = elements.messageLeadId.value.trim();
  const content = elements.customerMessage.value.trim();
  if (!leadId || !content) return;

  await postJson(`/api/crm/leads/${encodeURIComponent(leadId)}/conversation`, {
    content
  });
  elements.customerMessage.value = "";
  await refreshAll();
});

elements.weixinPersonalLeadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = elements.weixinPersonalLeadName.value.trim();
  if (!displayName) return;

  await postJson("/api/weixin-personal/leads", {
    display_name: displayName,
    alias: elements.weixinPersonalAlias.value.trim() || null,
    contact_value: elements.weixinPersonalAlias.value.trim() || null,
    source_content_id: elements.weixinPersonalSource.value.trim() || null,
    source_platform: "weixin_personal"
  });

  elements.weixinPersonalLeadName.value = "";
  elements.weixinPersonalAlias.value = "";
  elements.weixinPersonalSource.value = "";
  await refreshAll();
});

elements.weixinPersonalMessageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const leadId = elements.weixinPersonalLeadId.value.trim();
  const content = elements.weixinPersonalMessage.value.trim();
  if (!leadId || !content) return;

  await postJson(
    `/api/weixin-personal/leads/${encodeURIComponent(leadId)}/messages`,
    { content }
  );

  elements.weixinPersonalMessage.value = "";
  await refreshAll();
});

elements.assetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.assetTitle.value.trim();
  const body = elements.assetBody.value.trim();
  if (!title || !body) return;

  await postJson("/api/content/assets", {
    title,
    body,
    asset_type: "script"
  });
  elements.assetTitle.value = "";
  elements.assetBody.value = "";
  await refreshAll();
});

elements.publishingPackageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const assetId = elements.packageAssetId.value.trim();
  if (!assetId) return;

  const platforms = elements.packagePlatforms.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  await postJson("/api/content/publishing-packages", {
    content_asset_id: assetId,
    platforms
  });
  elements.packageAssetId.value = "";
  await refreshAll();
});

elements.manualPublishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const jobId = elements.manualPublishJobId.value.trim();
  if (!jobId) return;

  await postJson(`/api/publishing/jobs/${encodeURIComponent(jobId)}/manual-publish`, {
    external_post_url: elements.manualPublishUrl.value.trim() || null,
    metrics: {
      views: Number(elements.manualPublishViews.value || 0),
      likes: Number(elements.manualPublishLikes.value || 0),
      comments: Number(elements.manualPublishComments.value || 0),
      leads: Number(elements.manualPublishLeads.value || 0)
    }
  });

  elements.manualPublishJobId.value = "";
  elements.manualPublishUrl.value = "";
  elements.manualPublishViews.value = "";
  elements.manualPublishLikes.value = "";
  elements.manualPublishComments.value = "";
  elements.manualPublishLeads.value = "";
  await refreshAll();
});

elements.metricForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!elements.metricEntityType.value || !elements.metricEntityId.value || !elements.metricName.value) {
    return;
  }

  await postJson("/api/analytics/metrics", {
    entity_type: elements.metricEntityType.value.trim(),
    entity_id: elements.metricEntityId.value.trim(),
    metric_name: elements.metricName.value.trim(),
    metric_value: Number(elements.metricValue.value || 0),
    platform: elements.metricPlatform.value.trim() || null
  });

  elements.metricName.value = "";
  elements.metricValue.value = "";
  await refreshAll();
});

elements.reviewButton.addEventListener("click", async () => {
  await postJson("/api/analytics/review", {
    title: "Manual strategy review"
  });
  await refreshAll();
});

elements.metricReviewLoopButton.addEventListener("click", async () => {
  const result = await postJson("/api/marketing/metric-review-loop", {
    run_id: `web_metric_review_${Date.now()}`
  });
  renderMetricReviewLoopResult(result);
  await refreshAll();
});

elements.executeNextRoundButton.addEventListener("click", async () => {
  const result = await postJson("/api/marketing/execute-next-round", {
    run_id: `web_next_round_${Date.now()}`
  });
  renderNextRoundExecutionResult(result);
  await refreshAll();
});

elements.optimizeButton.addEventListener("click", async () => {
  await postJson("/api/agents/optimize", {
    title: "Manual agent optimization review"
  });
  await refreshAll();
});

elements.cycleButton.addEventListener("click", async () => {
  await postJson("/api/agents/autonomous-cycle", {
    title: "Manual autonomous cycle",
    instruction:
      "请系统自主检查当前自动化营销系统状态，生成下一阶段低风险建设任务并自动执行。"
  });
  await refreshAll();
});

elements.demoFlowButton.addEventListener("click", async () => {
  await postJson("/api/demo/merchant-flow", {
    run_id: `web_demo_${Date.now()}`
  });
  await refreshAll();
});

elements.refreshButton.addEventListener("click", refreshAll);
elements.approvals.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-approval-action]");
  if (!button) return;

  await postJson(`/api/approvals/${button.dataset.approvalId}/decision`, {
    status: button.dataset.approvalAction,
    decided_by: "user"
  });
  await refreshAll();
});

async function refreshAll() {
  const [
    health,
    workspaces,
    snapshot,
    messages,
    tools,
    knowledge,
    crm,
    content,
    analytics,
    config,
    integrations,
    project,
    weixinPersonal,
    publishingReview,
    production
  ] = await Promise.all([
    getJson("/api/health"),
    getJson("/api/workspaces"),
    getJson("/api/snapshot"),
    getJson("/api/messages"),
    getJson("/api/tools"),
    getJson("/api/knowledge/documents"),
    getJson("/api/crm/leads"),
    getJson("/api/content/assets"),
    getJson("/api/analytics"),
    getJson("/api/config"),
    getJson("/api/integrations/readiness"),
    getJson("/api/project/status"),
    getJson("/api/weixin-personal/status"),
    getJson("/api/publishing/review"),
    getJson("/api/production/readiness")
  ]);

  elements.healthStatus.textContent = health.model_configured
    ? "模型已配置"
    : "模型待配置";

  syncActiveWorkspace(workspaces);
  renderMessages(messages.messages);
  renderMemories(filterWorkspaceItems(snapshot.memories));
  renderTasks(filterWorkspaceItems(snapshot.tasks));
  renderApprovals(filterWorkspaceItems(snapshot.approvals));
  renderTools(tools.tools);
  renderCrm(crm);
  renderContent(content);
  renderAnalytics(analytics);
  renderConfig(config);
  renderIntegrations(integrations);
  renderProjectStatus(project);
  renderWeixinPersonal(weixinPersonal, crm);
  renderPublishingReview(publishingReview);
  renderProductionReadiness(production);

  const workspaceTasks = filterWorkspaceItems(snapshot.tasks);
  const workspaceMemories = filterWorkspaceItems(snapshot.memories);
  const workspaceApprovals = filterWorkspaceItems(snapshot.approvals);
  elements.taskCount.textContent = workspaceTasks.length;
  elements.memoryCount.textContent = workspaceMemories.length;
  elements.approvalCount.textContent = workspaceApprovals.filter(
    (approval) => approval.status === "pending"
  ).length;
  elements.toolCount.textContent = tools.tools.length;
  elements.knowledgeCount.textContent = knowledge.totals.documents;
  elements.leadCount.textContent = crm.leads.length;
  elements.assetCount.textContent = content.assets.length;
  elements.metricCount.textContent = analytics.totals.metrics;
}

function renderMessages(messages) {
  if (messages.length === 0) {
    elements.messages.innerHTML = `
      <div class="message assistant">系统地基已就绪。你可以先输入一个营销目标，我会拆成多 Agent 任务并写入共同记忆。</div>
    `;
    return;
  }

  elements.messages.innerHTML = messages
    .map(
      (message) => `
        <div class="message ${escapeHtml(message.role)}">${escapeHtml(
          message.content
        )}</div>
      `
    )
    .join("");
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderProjectStatus(project) {
  const phases = project.phases
    .map(
      (phase) => `
        <article class="phase ${escapeHtml(phase.status)}">
          <div class="item-title">
            <span>${escapeHtml(phase.name)}</span>
            <span class="tag ${phase.status === "blocked" ? "danger" : phase.status === "partial" ? "warning" : ""}">
              ${escapeHtml(phase.status)}
            </span>
          </div>
          <p class="muted">${escapeHtml(phase.items.slice(0, 2).join(" / "))}</p>
        </article>
      `
    )
    .join("");
  const nextTasks = project.next_tasks
    .slice(0, 4)
    .map(
      (task) => `
        <li>
          <strong>${escapeHtml(task.priority)}</strong>
          ${escapeHtml(task.title)}
          <span class="muted">(${escapeHtml(task.status)})</span>
        </li>
      `
    )
    .join("");

  elements.projectStatus.innerHTML = `
    <div class="status-summary">
      <div>
        <p class="eyebrow">项目进度</p>
        <h2>${escapeHtml(project.summary.stage)}</h2>
        <p class="muted">${escapeHtml(project.summary.primary_blocker)}</p>
      </div>
      <div class="progress-ring">
        <span>${escapeHtml(project.summary.progress_percent)}%</span>
        <p>完成度</p>
      </div>
    </div>
    <div class="phase-grid">${phases}</div>
    <div class="next-task-strip">
      <span class="muted">下一步任务</span>
      <ol>${nextTasks}</ol>
    </div>
  `;
}

function renderMerchantOnboardingResult(result) {
  elements.merchantOnboardingResult.innerHTML = `
    <article class="item">
      <div class="item-title">
        <span>${escapeHtml(result.merchant.name)}</span>
        <span class="tag">已写入</span>
      </div>
      <p class="muted">记忆：${escapeHtml(result.totals.memories)} 条</p>
      <p class="muted">知识文档：${escapeHtml(result.totals.knowledge_documents)} 份</p>
      <p class="muted">下一步：${escapeHtml(result.next_actions[0])}</p>
    </article>
  `;
}

function renderFirstMarketingPlanResult(result) {
  elements.merchantOnboardingResult.innerHTML = `
    <article class="item">
      <div class="item-title">
        <span>${escapeHtml(result.plan.week_theme)}</span>
        <span class="tag">计划已生成</span>
      </div>
      <p class="muted">内容资产：${escapeHtml(result.content_assets.length)} 条</p>
      <p class="muted">发布包：${escapeHtml(result.publishing_packages.length)} 个</p>
      <p class="muted">指标模板：${escapeHtml(result.metrics.length)} 条</p>
      <p class="muted">下一步：${escapeHtml(result.next_actions[0])}</p>
    </article>
  `;
}

function renderMemories(memories) {
  elements.memories.innerHTML =
    memories
      .slice()
      .reverse()
      .map(
        (memory) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(memory.title)}</span>
              <span class="tag">${escapeHtml(memory.memory_type)}</span>
            </div>
            <p class="muted">${escapeHtml(memory.summary)}</p>
          </article>
        `
      )
      .join("") || `<p class="muted">暂无记忆。</p>`;
}

function renderTasks(tasks) {
  elements.tasks.innerHTML =
    tasks
      .slice()
      .reverse()
      .map(
        (task) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(task.agent_type)}</span>
              <span class="tag ${task.risk_level === "L3" ? "warning" : ""}">
                ${escapeHtml(task.risk_level)}
              </span>
            </div>
            <p class="muted">${escapeHtml(task.objective)}</p>
            <p class="muted">状态：${escapeHtml(task.status)}</p>
          </article>
        `
      )
      .join("") || `<p class="muted">暂无任务。</p>`;
}

function renderApprovals(approvals) {
  elements.approvals.innerHTML =
    approvals
      .slice()
      .reverse()
      .map(
        (approval) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(approval.title)}</span>
              <span class="tag danger">${escapeHtml(approval.risk_level)}</span>
            </div>
            <p class="muted">${escapeHtml(approval.description)}</p>
            <p class="muted">状态：${escapeHtml(approval.status)}</p>
            ${renderApprovalActions(approval)}
          </article>
        `
      )
      .join("") || `<p class="muted">暂无待审批事项。</p>`;
}

function renderApprovalActions(approval) {
  if (approval.status !== "pending") return "";

  return `
    <div class="actions">
      <button
        type="button"
        data-approval-id="${escapeHtml(approval.id)}"
        data-approval-action="approved"
      >
        批准执行
      </button>
      <button
        class="secondary"
        type="button"
        data-approval-id="${escapeHtml(approval.id)}"
        data-approval-action="rejected"
      >
        拒绝
      </button>
    </div>
  `;
}

function renderTools(tools) {
  elements.tools.innerHTML =
    tools
      .map(
        (tool) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(tool.display_name)}</span>
              <span class="tag ${tool.requires_approval ? "danger" : ""}">
                ${escapeHtml(tool.risk_level)}
              </span>
            </div>
            <p class="muted">${escapeHtml(tool.description)}</p>
            <p class="muted">状态：${tool.configured ? "已配置" : "待配置"}</p>
            <p class="muted">类型：${escapeHtml(tool.category)}</p>
          </article>
        `
      )
      .join("") || `<p class="muted">暂无工具。</p>`;
}

function renderConfig(config) {
  elements.configItems.innerHTML =
    config.items
      .map(
        (item) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(item.display_name)}</span>
              <span class="tag ${item.configured ? "" : "warning"}">
                ${escapeHtml(item.mode)}
              </span>
            </div>
            <p class="muted">${escapeHtml(item.env_var)}</p>
            <p class="muted">状态：${item.configured ? "已配置" : "待配置"}</p>
            ${
              item.masked_value
                ? `<p class="muted">值：${escapeHtml(item.masked_value)}</p>`
                : ""
            }
          </article>
        `
      )
      .join("") || `<p class="muted">暂无配置项。</p>`;
}

function renderProductionReadiness(production) {
  elements.productionItems.innerHTML =
    [
      `
        <article class="item">
          <div class="item-title">
            <span>${escapeHtml(production.summary.status)}</span>
            <span class="tag ${production.summary.status === "production_ready" ? "" : "warning"}">
              ${escapeHtml(production.summary.readiness_percent)}%
            </span>
          </div>
          <p class="muted">${escapeHtml(production.summary.primary_gap)}</p>
          <p class="muted">存储：${escapeHtml(production.summary.current_storage)} · ${escapeHtml(production.store.file_size_bytes)} bytes</p>
        </article>
      `,
      ...production.checks.slice(0, 7).map(
        (check) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(check.title)}</span>
              <span class="tag ${check.ready ? "" : "warning"}">
                ${escapeHtml(check.status)}
              </span>
            </div>
            <p class="muted">缺少：${escapeHtml(check.missing_required_env.join(", ") || "无")}</p>
            <p class="muted">${escapeHtml(check.recommendation)}</p>
          </article>
        `
      )
    ].join("");
}

function renderIntegrations(integrations) {
  elements.integrationItems.innerHTML =
    integrations.items
      .map((item) => {
        const missing = item.required_env
          .filter((env) => !env.configured)
          .map((env) => env.name)
          .join(", ");
        const fallback = item.fallback_paths.slice(0, 2).join(" / ");
        const steps = item.acquisition_steps
          .slice(0, 3)
          .map((step) => `<li>${escapeHtml(step)}</li>`)
          .join("");
        const sources = item.source_urls
          .slice(0, 2)
          .map(
            (url) =>
              `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">官方入口</a>`
          )
          .join(" · ");

        return `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(item.platform)}</span>
              <span class="tag ${item.configured ? "" : "warning"}">
                ${escapeHtml(item.path)}
              </span>
            </div>
            <p class="muted">准备度：${escapeHtml(item.readiness)}</p>
            ${
              missing
                ? `<p class="muted">缺少：${escapeHtml(missing)}</p>`
                : `<p class="muted">必需配置已齐，可做 dry-run 联调。</p>`
            }
            <p class="muted">下一步：${escapeHtml(item.next_action)}</p>
            <ol class="compact-list">${steps}</ol>
            <p class="muted">替代路径：${escapeHtml(fallback)}</p>
            <p class="muted">${sources}</p>
          </article>
        `;
      })
      .join("") || `<p class="muted">暂无接口准备度数据。</p>`;
}

function renderKnowledgeResults(results) {
  elements.knowledgeResults.innerHTML =
    results
      .map(
        (result) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(result.document_title)}</span>
              <span class="tag">score ${escapeHtml(result.score)}</span>
            </div>
            <p class="muted">${escapeHtml(result.content)}</p>
          </article>
        `
      )
      .join("") || `<p class="muted">没有命中。</p>`;
}

function renderCrm(crm) {
  const leads = crm.leads.slice(0, 8);
  const handoffs = crm.handoffs.filter((handoff) => handoff.status === "pending");

  elements.crmItems.innerHTML =
    [
      ...leads.map(
        (lead) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(lead.display_name)}</span>
              <span class="tag">${escapeHtml(lead.stage)}</span>
            </div>
            <p class="muted">ID：${escapeHtml(lead.id)}</p>
            <p class="muted">来源：${escapeHtml(lead.source_platform)}</p>
            <p class="muted">分数：${escapeHtml(lead.score)}</p>
          </article>
        `
      ),
      ...handoffs.map(
        (handoff) => `
          <article class="item">
            <div class="item-title">
              <span>转人工</span>
              <span class="tag warning">pending</span>
            </div>
            <p class="muted">${escapeHtml(handoff.summary)}</p>
          </article>
        `
      )
    ].join("") || `<p class="muted">暂无线索。</p>`;
}

function renderWeixinPersonal(status, crm) {
  const qr = status.qr_url
    ? `<img class="qr-preview" src="${escapeHtml(status.qr_url)}" alt="个人微信二维码" />`
    : `<div class="qr-placeholder">未配置二维码</div>`;
  const label = status.account_label || "个人微信";
  const leads = crm.leads
    .filter((lead) => lead.source_platform === "weixin_personal")
    .slice(0, 5);

  elements.weixinPersonalStatus.innerHTML = `
    <article class="item weixin-status-card">
      <div class="qr-box">${qr}</div>
      <div>
        <div class="item-title">
          <span>${escapeHtml(label)}</span>
          <span class="tag ${status.configured ? "" : "warning"}">
            ${escapeHtml(status.mode)}
          </span>
        </div>
        <p class="muted">${escapeHtml(status.message)}</p>
        <p class="muted">策略：AI 生成草稿，人工确认发送。</p>
      </div>
    </article>
  `;

  elements.weixinPersonalItems.innerHTML =
    leads
      .map(
        (lead) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(lead.display_name)}</span>
              <span class="tag">${escapeHtml(lead.stage)}</span>
            </div>
            <p class="muted">ID：${escapeHtml(lead.id)}</p>
            <p class="muted">微信：${escapeHtml(lead.contact_value || "待补充")}</p>
            <p class="muted">分数：${escapeHtml(lead.score)}</p>
          </article>
        `
      )
      .join("") || `<p class="muted">暂无个微线索。</p>`;
}

function renderContent(content) {
  const assets = content.assets.slice(0, 6);
  const jobs = content.publishing_jobs.slice(0, 6);

  elements.contentItems.innerHTML =
    [
      ...assets.map(
        (asset) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(asset.title)}</span>
              <span class="tag">${escapeHtml(asset.status)}</span>
            </div>
            <p class="muted">ID：${escapeHtml(asset.id)}</p>
            <p class="muted">类型：${escapeHtml(asset.asset_type)}</p>
            <p class="muted">${escapeHtml(asset.body.slice(0, 160))}</p>
          </article>
        `
      ),
      ...jobs.map(
        (job) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(job.platform)}</span>
              <span class="tag warning">${escapeHtml(job.status)}</span>
            </div>
            <p class="muted">发布任务：${escapeHtml(job.id)}</p>
            <p class="muted">资产：${escapeHtml(job.content_asset_id)}</p>
          </article>
        `
      )
    ].join("") || `<p class="muted">暂无内容资产。</p>`;
}

function renderPublishingReview(review) {
  const items = review.items.slice(0, 8);

  elements.publishingReviewItems.innerHTML =
    [
      `
        <article class="item">
          <div class="item-title">
            <span>审核队列</span>
            <span class="tag">${escapeHtml(review.totals.pending)} 待确认</span>
          </div>
          <p class="muted">已发布：${escapeHtml(review.totals.published)} / 总任务：${escapeHtml(review.totals.jobs)}</p>
        </article>
      `,
      ...items.map(
        (item) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(item.job.platform)}</span>
              <span class="tag ${item.needs_human_confirmation ? "warning" : ""}">
                ${escapeHtml(item.review_status)}
              </span>
            </div>
            <p class="muted">发布任务：${escapeHtml(item.job.id)}</p>
            <p class="muted">资产：${escapeHtml(item.asset?.title || item.job.content_asset_id || "无")}</p>
            <p class="muted">${escapeHtml((item.asset?.body || "").slice(0, 120))}</p>
          </article>
        `
      )
    ].join("");
}

function renderMetricReviewLoopResult(result) {
  elements.analyticsItems.innerHTML = `
    <article class="item">
      <div class="item-title">
        <span>真实指标复盘循环</span>
        <span class="tag">已生成</span>
      </div>
      <p class="muted">发布任务：${escapeHtml(result.analytics_summary.published_jobs)}</p>
      <p class="muted">建议：${escapeHtml(result.recommendations.length)} 条</p>
      <p class="muted">新任务：${escapeHtml(result.tasks.length)} 个</p>
      <p class="muted">实验：${escapeHtml(result.experiment.id)}</p>
      <p class="muted">下一步：${escapeHtml(result.next_actions[0])}</p>
    </article>
  `;
}

function renderNextRoundExecutionResult(result) {
  elements.analyticsItems.innerHTML = `
    <article class="item">
      <div class="item-title">
        <span>下一轮任务执行</span>
        <span class="tag">已执行</span>
      </div>
      <p class="muted">任务：${escapeHtml(result.execution_summary.completed)} 完成 / ${escapeHtml(result.execution_summary.queued)} 队列</p>
      <p class="muted">内容资产：${escapeHtml(result.content_assets.length)} 条</p>
      <p class="muted">发布包：${escapeHtml(result.publishing_packages.length)} 个</p>
      <p class="muted">下一步：${escapeHtml(result.next_actions[0])}</p>
    </article>
  `;
}

function renderAnalytics(analytics) {
  const funnel = analytics.funnel;
  const top = analytics.top_entities.slice(0, 4);

  elements.analyticsItems.innerHTML =
    [
      `
        <article class="item">
          <div class="item-title">
            <span>漏斗</span>
            <span class="tag">${escapeHtml(analytics.totals.metrics)} metrics</span>
          </div>
          <p class="muted">views ${escapeHtml(funnel.views)} · leads ${escapeHtml(funnel.leads)} · handoffs ${escapeHtml(funnel.handoffs)} · deals ${escapeHtml(funnel.deals)}</p>
        </article>
      `,
      ...top.map(
        (entity) => `
          <article class="item">
            <div class="item-title">
              <span>${escapeHtml(entity.entity_type)}</span>
              <span class="tag">${escapeHtml(entity.weighted_score)}</span>
            </div>
            <p class="muted">${escapeHtml(entity.entity_id)}</p>
          </article>
        `
      )
    ].join("");
}

async function getJson(url) {
  const response = await fetch(apiUrl(url), {
    headers: workspaceHeaders()
  });
  if (!response.ok) throw new Error(`GET ${url} failed`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(apiUrl(url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...workspaceHeaders()
    },
    body: JSON.stringify({
      workspace_id: activeWorkspaceId,
      ...body
    })
  });
  if (!response.ok) throw new Error(`POST ${url} failed`);
  return response.json();
}

function apiUrl(url) {
  const parsed = new URL(url, window.location.origin);
  if (parsed.pathname.startsWith("/api/")) {
    parsed.searchParams.set("workspace_id", activeWorkspaceId);
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function workspaceHeaders() {
  return {
    "x-workspace-id": activeWorkspaceId
  };
}

function syncActiveWorkspace(payload) {
  const workspaces = payload.workspaces?.length
    ? payload.workspaces
    : [{ id: "default", name: "AI Marketing Workspace" }];
  if (!workspaces.some((workspace) => workspace.id === activeWorkspaceId)) {
    activeWorkspaceId = payload.active_workspace_id || workspaces[0].id || "default";
    localStorage.setItem(workspaceStorageKey, activeWorkspaceId);
  }

  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  elements.activeWorkspaceLabel.textContent =
    active?.merchant_name || active?.name || activeWorkspaceId;
  elements.workspaceSelect.innerHTML = workspaces
    .map(
      (workspace) => `
        <option
          value="${escapeHtml(workspace.id)}"
          ${workspace.id === activeWorkspaceId ? "selected" : ""}
        >
          ${escapeHtml(workspace.merchant_name || workspace.name || workspace.id)}
        </option>
      `
    )
    .join("");
}

function filterWorkspaceItems(items) {
  return items.filter(
    (item) => (item.workspace_id || "default") === activeWorkspaceId
  );
}

function normalizeWorkspaceId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `merchant_${Date.now()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

refreshAll().catch((error) => {
  elements.healthStatus.textContent = "服务异常";
  elements.messages.innerHTML = `<div class="message assistant">${escapeHtml(
    error.message
  )}</div>`;
});
