import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-cs-${Date.now()}.json`
);

const { addKnowledgeDocument } = await import(
  "../apps/api/src/core/knowledge-base.mjs"
);
const {
  createLeadRecord,
  getLeadConversation,
  receiveCustomerMessage
} = await import("../apps/api/src/core/customer-service.mjs");
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

addKnowledgeDocument({
  title: "客服 FAQ",
  content: `
AI 自动化营销中控系统支持内容生成、视频脚本、线索承接、企微客服和销售转人工。
涉及报价、合同、付款、签约时，AI 应先收集需求并转人工顾问，不直接承诺价格。
客户问微信时，优先引导企业微信或官方客服入口。
  `,
  memory_type: "brand"
});

const lead = createLeadRecord({
  display_name: "王总",
  source_platform: "douyin",
  contact_method: "wecom",
  contact_value: "pending"
});

const result = receiveCustomerMessage({
  lead_id: lead.id,
  content: "我想了解价格和怎么签约，可以加微信聊吗？"
});

const conversation = getLeadConversation(lead.id);
const snapshot = getSnapshot();

if (!result.handoff) {
  throw new Error("Expected high-intent message to create handoff.");
}

if (conversation.messages.length < 2) {
  throw new Error("Expected customer and assistant messages.");
}

const report = {
  lead: result.lead,
  intent: result.intent,
  assistant_reply: result.assistant_message.content,
  handoff: result.handoff,
  conversation_count: conversation.messages.length,
  totals: {
    leads: snapshot.leads.length,
    conversations: snapshot.customer_conversations.length,
    handoffs: snapshot.sales_handoffs.length
  }
};

console.log(JSON.stringify(report, null, 2));

