import { createMemory, upsertWorkspace } from "../data/store.mjs";
import { addKnowledgeDocument } from "./knowledge-base.mjs";

const PLATFORM_LABELS = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  shipinhao: "视频号",
  weixin_personal: "个人微信",
  wecom: "企业微信"
};

export function onboardMerchant(input) {
  const merchant = normalizeMerchant(input);
  const missing = validateMerchant(merchant);
  if (missing.length > 0) {
    const error = new Error(`missing required fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const runId = `merchant_${Date.now()}`;
  const workspace = upsertWorkspace({
    id: merchant.workspace_id,
    name: merchant.name,
    merchant_name: merchant.name
  });
  const memories = seedMerchantMemories(merchant, runId);
  const documents = seedMerchantKnowledge(merchant, runId);

  return {
    run_id: runId,
    workspace,
    merchant,
    memories,
    knowledge_documents: documents.map((item) => item.document),
    totals: {
      memories: memories.length,
      knowledge_documents: documents.length,
      chunks: documents.reduce((sum, item) => sum + item.chunk_count, 0)
    },
    next_actions: [
      "在对话式总控里要求 AI 生成本周营销计划。",
      "生成内容资产和发布包前，先检查禁用词和平台边界。",
      "个人微信承接只使用二维码、线索记录和回复草稿，最终发送由人工确认。"
    ]
  };
}

function normalizeMerchant(input) {
  return {
    name: text(input.name),
    workspace_id: normalizeWorkspaceId(input.workspace_id ?? input.workspaceId),
    industry: text(input.industry),
    city: text(input.city),
    brand_intro: text(input.brand_intro),
    products: splitLines(input.products),
    audience: text(input.audience),
    offer: text(input.offer),
    price_range: text(input.price_range),
    faq: splitLines(input.faq),
    compliance: splitLines(input.compliance),
    tone: text(input.tone) || "专业、真实、有温度",
    platforms: normalizePlatforms(input.platforms),
    weixin_personal_qr_url: text(input.weixin_personal_qr_url),
    weixin_personal_account_label: text(input.weixin_personal_account_label),
    conversion_goal:
      text(input.conversion_goal) ||
      "引导客户留下咨询方式，由人工确认需求并推进成交。"
  };
}

function validateMerchant(merchant) {
  const required = ["name", "industry", "brand_intro", "audience"];
  return required.filter((key) => !merchant[key]);
}

function seedMerchantMemories(merchant, runId) {
  return [
    createMemory({
      workspace_id: merchant.workspace_id,
      memory_type: "brand",
      title: `${merchant.name} 商家画像`,
      content: JSON.stringify(merchant, null, 2),
      summary: `${merchant.name}：${merchant.industry}，目标客户：${merchant.audience}`,
      source_type: "merchant_onboarding",
      source_id: runId,
      created_by_agent: "merchant_onboarding",
      importance: 5
    }),
    createMemory({
      workspace_id: merchant.workspace_id,
      memory_type: "workflow",
      title: `${merchant.name} 转化和承接边界`,
      content: buildConversionPolicy(merchant),
      summary: `${merchant.name} 的转化目标、微信承接方式和人工确认边界。`,
      source_type: "merchant_onboarding",
      source_id: runId,
      created_by_agent: "merchant_onboarding",
      importance: 4
    }),
    createMemory({
      workspace_id: merchant.workspace_id,
      memory_type: "content",
      title: `${merchant.name} 内容语气和平台方向`,
      content: buildPlatformStrategy(merchant),
      summary: `${merchant.name} 的平台内容方向和品牌语气。`,
      source_type: "merchant_onboarding",
      source_id: runId,
      created_by_agent: "merchant_onboarding",
      importance: 4
    })
  ];
}

function seedMerchantKnowledge(merchant, runId) {
  return [
    addKnowledgeDocument({
      workspace_id: merchant.workspace_id,
      title: `${merchant.name} 品牌和产品资料`,
      source_type: "merchant_onboarding",
      memory_type: "brand",
      importance: 5,
      metadata: { run_id: runId, merchant_name: merchant.name },
      content: buildBrandDocument(merchant)
    }),
    addKnowledgeDocument({
      workspace_id: merchant.workspace_id,
      title: `${merchant.name} 客服 FAQ 和成交边界`,
      source_type: "merchant_onboarding",
      memory_type: "customer",
      importance: 5,
      metadata: { run_id: runId, merchant_name: merchant.name },
      content: buildCustomerDocument(merchant)
    }),
    addKnowledgeDocument({
      workspace_id: merchant.workspace_id,
      title: `${merchant.name} 平台内容策略`,
      source_type: "merchant_onboarding",
      memory_type: "content",
      importance: 4,
      metadata: { run_id: runId, merchant_name: merchant.name },
      content: buildPlatformStrategy(merchant)
    })
  ];
}

function buildBrandDocument(merchant) {
  return `
商家名称：${merchant.name}
行业：${merchant.industry}
城市：${merchant.city || "未填写"}
品牌介绍：${merchant.brand_intro}
产品/服务：
${list(merchant.products)}
目标客户：${merchant.audience}
核心卖点：${merchant.offer || "未填写"}
价格范围：${merchant.price_range || "未填写"}
品牌语气：${merchant.tone}
转化目标：${merchant.conversion_goal}
  `.trim();
}

function buildCustomerDocument(merchant) {
  return `
商家：${merchant.name}
客服 FAQ：
${list(merchant.faq)}

禁用词和合规边界：
${list(merchant.compliance)}

微信承接：
- 个人微信账号标签：${merchant.weixin_personal_account_label || "未配置"}
- 个人微信二维码：${merchant.weixin_personal_qr_url || "未配置"}
- 个人微信模式只允许二维码承接、线索记录、回复草稿和人工确认。
- 不允许自动加好友、自动私信或群发个人联系人。

高意向信号：
- 报价、多少钱、购买、签约、合同、付款、加微信、今天能做吗、怎么合作。
  `.trim();
}

function buildPlatformStrategy(merchant) {
  const platforms = merchant.platforms
    .map((platform) => PLATFORM_LABELS[platform] ?? platform)
    .join("、");

  return `
商家：${merchant.name}
平台：${platforms || "未填写"}
品牌语气：${merchant.tone}
核心人群：${merchant.audience}
内容方向：
- 抖音：短视频钩子、场景痛点、制作过程、前后对比、强 CTA。
- 小红书：图文笔记、清单、测评、避坑、真实体验和收藏价值。
- 视频号：熟人社交、本地信任、客户故事、门店日常和服务案例。
- 个人微信：只做承接和人工确认，AI 负责回复草稿和客户摘要。

转化 CTA：
${merchant.conversion_goal}
  `.trim();
}

function buildConversionPolicy(merchant) {
  return `
${merchant.name} 的转化目标：${merchant.conversion_goal}

微信承接方式：
- 个人微信二维码：${merchant.weixin_personal_qr_url || "未配置"}
- 账号标签：${merchant.weixin_personal_account_label || "未配置"}

执行边界：
- AI 可以生成回复草稿、整理客户需求、识别高意向并提醒转人工。
- OpenClaw 只能辅助准备草稿或提醒人工，不自动加好友、不自动私信。
- Hermes 可以沉淀长期记忆和提出优化建议，不直接操作客户账号。
  `.trim();
}

function splitLines(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value)
    .split(/\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePlatforms(value) {
  const items = Array.isArray(value) ? value : splitLines(value);
  return items
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function list(items) {
  if (!items.length) return "- 未填写";
  return items.map((item) => `- ${item}`).join("\n");
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeWorkspaceId(value) {
  const raw = text(value);
  if (!raw) return "default";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || `merchant_${hashText(raw || "default")}`;
}

function hashText(value) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return hash.toString(16);
}
