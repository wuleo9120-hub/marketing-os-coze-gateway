import {
  createExperimentRecord,
  recordMetric,
  runStrategyReview
} from "./analytics-review.mjs";
import {
  createContentAssetRecord,
  createPublishingPackage
} from "./content-ops.mjs";
import { addKnowledgeDocument } from "./knowledge-base.mjs";
import { createMemory, listMemories } from "../data/store.mjs";

const DEFAULT_PLATFORMS = ["douyin", "xiaohongshu", "shipinhao"];

export function generateFirstMarketingPlan(input = {}) {
  const workspaceId = input.workspace_id;
  const merchant = getLatestMerchant(workspaceId);
  if (!merchant) {
    const error = new Error("merchant onboarding data is required first");
    error.statusCode = 400;
    throw error;
  }

  const runId = input.run_id ?? `first_plan_${Date.now()}`;
  const platforms = merchant.platforms?.length
    ? merchant.platforms.filter((platform) => DEFAULT_PLATFORMS.includes(platform))
    : DEFAULT_PLATFORMS;

  const plan = buildPlan({ merchant, runId, platforms });
  const planMemory = createMemory({
    workspace_id: workspaceId,
    memory_type: "strategy",
    title: `${merchant.name} 首轮营销计划`,
    content: JSON.stringify(plan, null, 2),
    summary: `${merchant.name} 首周 ${platforms.length} 平台营销计划，主题：${plan.week_theme}`,
    source_type: "first_marketing_plan",
    source_id: runId,
    created_by_agent: "brand_strategy",
    importance: 5
  });

  const planDocument = addKnowledgeDocument({
    workspace_id: workspaceId,
    title: `${merchant.name} 首轮营销计划 ${runId}`,
    source_type: "first_marketing_plan",
    memory_type: "strategy",
    importance: 4,
    metadata: { run_id: runId, merchant_name: merchant.name },
    content: formatPlanDocument(plan)
  });

  const assets = plan.contents.map((content) =>
    createContentAssetRecord({
      workspace_id: workspaceId,
      asset_type: "script",
      title: content.title,
      body: formatContentAsset(content, merchant),
      platform: content.platform,
      status: "draft",
      metadata: {
        run_id: runId,
        merchant_name: merchant.name,
        topic: content.topic,
        cta: content.cta
      }
    })
  );

  const packages = assets.flatMap((asset) =>
    createPublishingPackage({
      content_asset_id: asset.id,
      platforms: [asset.platform]
    })
  );

  const customerScript = addKnowledgeDocument({
    workspace_id: workspaceId,
    title: `${merchant.name} 首轮客服话术 ${runId}`,
    source_type: "first_marketing_plan",
    memory_type: "customer",
    importance: 4,
    metadata: { run_id: runId, merchant_name: merchant.name },
    content: buildCustomerScript(plan, merchant)
  });

  const metrics = createMetricTemplates({ assets, runId });
  const experiment = createExperimentRecord({
    workspace_id: workspaceId,
    name: `${merchant.name} 首周 CTA A/B 测试 ${runId}`,
    hypothesis:
      "直接引导客户留言关键词并展示个人微信/人工咨询路径，会提升从互动到线索的转化率。",
    status: "planned",
    related_entity_type: "first_marketing_plan",
    related_entity_id: runId
  });
  const review = runStrategyReview({
    workspace_id: workspaceId,
    title: `${merchant.name} 首轮营销计划基线复盘 ${runId}`
  });

  return {
    run_id: runId,
    merchant: {
      name: merchant.name,
      industry: merchant.industry,
      platforms
    },
    plan,
    memory: planMemory,
    knowledge_documents: [planDocument.document, customerScript.document],
    content_assets: assets,
    publishing_packages: packages.map((item) => ({
      asset_id: item.asset.id,
      publishing_job_id: item.publishing_job.id,
      platform: item.publishing_job.platform,
      status: item.publishing_job.status
    })),
    metrics,
    experiment,
    strategy_review_memory_id: review.memory.id,
    next_actions: [
      "在内容资产中检查脚本和发布包。",
      "正式发布前逐条人工确认平台发布内容。",
      "发布后回填播放、互动、线索和成交指标，触发策略复盘。"
    ]
  };
}

function getLatestMerchant(workspaceId) {
  const memories = listMemories({
    workspace_id: workspaceId,
    type: "brand",
    limit: 100
  });
  const merchantMemory = memories.find(
    (memory) =>
      memory.source_type === "merchant_onboarding" &&
      memory.title.endsWith("商家画像")
  );

  if (!merchantMemory) return null;

  try {
    return JSON.parse(merchantMemory.content);
  } catch {
    return null;
  }
}

function buildPlan({ merchant, runId, platforms }) {
  const product = merchant.products?.[0] ?? merchant.offer ?? merchant.industry;
  const audience = merchant.audience;
  const weekTheme = `${merchant.name}${product}首周获客计划`;

  return {
    run_id: runId,
    week_theme: weekTheme,
    goal: merchant.conversion_goal,
    audience,
    positioning: merchant.brand_intro,
    guardrails: [
      "不承诺百分百成交。",
      "不绕过平台规则。",
      "个人微信只做二维码承接、线索记录和人工确认。"
    ],
    contents: platforms.map((platform, index) =>
      buildPlatformContent({
        merchant,
        platform,
        index,
        product,
        audience
      })
    ),
    customer_service_focus: [
      "先确认客户需求场景、预算、时间和地区。",
      "客户问价格时先给区间和影响因素，不直接承诺最终价。",
      "出现付款、签约、合同、报价等信号时转人工。"
    ],
    metric_targets: [
      "views",
      "likes",
      "comments",
      "saves",
      "shares",
      "leads",
      "handoffs",
      "deals"
    ]
  };
}

function buildPlatformContent({ merchant, platform, index, product, audience }) {
  const platformLabel = {
    douyin: "抖音",
    xiaohongshu: "小红书",
    shipinhao: "视频号"
  }[platform];
  const topics = {
    douyin: `${product}的真实场景和前后对比`,
    xiaohongshu: `${audience}收藏型决策清单`,
    shipinhao: `${merchant.city || "本地"}客户故事和信任建立`
  };
  const hooks = {
    douyin: `如果你正在找${product}，先看这 20 秒。`,
    xiaohongshu: `${audience}选择${product}前，建议先看这份清单。`,
    shipinhao: `一个真实客户为什么选择${merchant.name}。`
  };
  const cta = {
    douyin: "评论关键词“咨询”，领取方案清单。",
    xiaohongshu: "收藏后私信“方案”，获取咨询建议。",
    shipinhao: "留言你的需求场景，由人工顾问继续跟进。"
  };

  return {
    platform,
    title: `${merchant.name} ${platformLabel} 首周内容 ${index + 1}`,
    topic: topics[platform] ?? `${merchant.name}首周内容`,
    hook: hooks[platform] ?? `${merchant.name}可以解决什么问题？`,
    outline: [
      "3 秒痛点钩子。",
      "展示产品/服务过程或客户场景。",
      "解释一个选择理由。",
      "给出低门槛咨询动作。"
    ],
    cta: cta[platform] ?? "留言咨询，由人工继续跟进。",
    caption:
      `${merchant.name}｜${merchant.industry}｜${merchant.offer || product}。` +
      `适合${audience}，想了解可以先留言。`
  };
}

function formatContentAsset(content, merchant) {
  return `
平台：${content.platform}
商家：${merchant.name}
标题：${content.title}
主题：${content.topic}
开头钩子：${content.hook}

脚本结构：
${content.outline.map((item) => `- ${item}`).join("\n")}

正文/标题补充：
${content.caption}

CTA：
${content.cta}

安全边界：
- 正式发布前需要人工确认。
- 不承诺绕过平台规则。
- 个人微信承接只生成草稿，最终发送由人工确认。
  `.trim();
}

function formatPlanDocument(plan) {
  return `
主题：${plan.week_theme}
目标：${plan.goal}
目标客户：${plan.audience}
定位：${plan.positioning}

内容计划：
${plan.contents
  .map(
    (content) =>
      `- ${content.platform}: ${content.topic} | CTA: ${content.cta}`
  )
  .join("\n")}

客服重点：
${plan.customer_service_focus.map((item) => `- ${item}`).join("\n")}

指标：
${plan.metric_targets.map((item) => `- ${item}`).join("\n")}
  `.trim();
}

function buildCustomerScript(plan, merchant) {
  return `
商家：${merchant.name}
适用计划：${plan.week_theme}

首轮客服话术：
1. 你好，我先了解一下你的需求场景、预算范围、时间安排和所在城市。
2. 如果你方便，可以简单说下你最关注的是效果、价格、周期还是服务细节。
3. 价格会根据具体需求变化，我可以先给你一个大致区间，再请人工顾问确认最终方案。
4. 如果你已经准备下单、签约、付款或需要合同，我会马上转人工继续跟进。

个微承接边界：
- AI 回复只作为草稿。
- 人工确认后再在个人微信发送。
- 不自动加好友、不自动群发、不自动承诺价格。
  `.trim();
}

function createMetricTemplates({ assets, runId }) {
  return assets.flatMap((asset) =>
    ["views", "likes", "comments", "leads"].map((metricName) =>
      recordMetric({
        workspace_id: asset.workspace_id,
        entity_type: "content_asset",
        entity_id: asset.id,
        metric_name: metricName,
        metric_value: 0,
        platform: asset.platform,
        metadata: {
          run_id: runId,
          template: true
        }
      })
    )
  );
}
