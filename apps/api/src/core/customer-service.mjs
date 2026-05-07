import {
  addCustomerConversationMessage,
  createLead,
  createMemory,
  createSalesHandoff,
  getLead,
  listCustomerConversationMessages,
  listLeads,
  listSalesHandoffs,
  updateLead
} from "../data/store.mjs";
import { queryKnowledge } from "./knowledge-base.mjs";

const HIGH_INTENT_TERMS = [
  "价格",
  "报价",
  "多少钱",
  "购买",
  "签约",
  "合同",
  "付款",
  "怎么合作",
  "咨询方式",
  "加微信",
  "企微"
];

export function createLeadRecord(input) {
  const lead = createLead(input);

  createMemory({
    workspace_id: lead.workspace_id,
    memory_type: "customer",
    title: `Lead created: ${lead.display_name}`,
    content: JSON.stringify(lead, null, 2),
    summary: `${lead.display_name} from ${lead.source_platform}`,
    source_type: "lead",
    source_id: lead.id,
    created_by_agent: "customer_service",
    importance: 3
  });

  return lead;
}

export function getCrmOverview(options = {}) {
  return {
    leads: listLeads({ workspace_id: options.workspace_id }),
    handoffs: listSalesHandoffs({ workspace_id: options.workspace_id })
  };
}

export function receiveCustomerMessage(input) {
  const lead = getLead(input.lead_id);
  if (!lead) {
    throw new Error(`Lead not found: ${input.lead_id}`);
  }
  if (input.workspace_id && lead.workspace_id !== input.workspace_id) {
    const error = new Error(`Lead not found in workspace: ${input.lead_id}`);
    error.statusCode = 404;
    throw error;
  }

  const customerMessage = addCustomerConversationMessage({
    workspace_id: lead.workspace_id,
    lead_id: lead.id,
    role: "customer",
    content: input.content
  });

  const knowledge = queryKnowledge(input.content, {
    workspace_id: lead.workspace_id,
    limit: 4
  }).results;
  const intent = scoreIntent(input.content, knowledge);
  const updatedLead = updateLead(lead.id, {
    score: Math.max(lead.score ?? 0, intent.score),
    stage: intent.stage,
    summary: buildLeadSummary(lead, input.content, intent)
  });

  const reply = buildAssistantReply({
    lead: updatedLead,
    message: input.content,
    intent,
    knowledge
  });

  const assistantMessage = addCustomerConversationMessage({
    workspace_id: lead.workspace_id,
    lead_id: lead.id,
    role: "assistant",
    content: reply,
    knowledge_refs: knowledge.map((item) => ({
      chunk_id: item.chunk_id,
      document_id: item.document_id,
      document_title: item.document_title,
      score: item.score
    })),
    metadata: {
      intent
    }
  });

  let handoff = null;
  if (intent.should_handoff) {
    handoff = createSalesHandoff({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      reason: intent.reason,
      summary: `客户 ${lead.display_name} 出现高意向信号：${intent.reason}。最近问题：${input.content}`,
      status: "pending"
    });
    updateLead(lead.id, {
      stage: "handoff_pending"
    });
  }

  return {
    lead: getLead(lead.id),
    customer_message: customerMessage,
    assistant_message: assistantMessage,
    knowledge_results: knowledge,
    intent,
    handoff
  };
}

export function getLeadConversation(leadId) {
  const lead = getLead(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  return {
    lead,
    messages: listCustomerConversationMessages({
      workspace_id: lead.workspace_id,
      leadId
    })
  };
}

function scoreIntent(message, knowledge) {
  const matched = HIGH_INTENT_TERMS.filter((term) => message.includes(term));
  const score = Math.min(100, 20 + matched.length * 25 + knowledge.length * 5);
  const shouldHandoff = score >= 70 || matched.some((term) => ["报价", "签约", "合同", "付款"].includes(term));

  return {
    score,
    stage: shouldHandoff ? "high_intent" : "qualified",
    matched_terms: matched,
    should_handoff: shouldHandoff,
    reason:
      matched.length > 0
        ? `matched terms: ${matched.join(", ")}`
        : "general inquiry"
  };
}

function buildAssistantReply({ lead, message, intent, knowledge }) {
  const grounding =
    knowledge[0]?.content ??
    "我先根据你提供的信息做初步判断，再请你补充需求细节。";

  const base = [
    `${lead.display_name}，我了解了。`,
    `结合我们资料来看：${grounding.slice(0, 180)}`,
    "为了给你更准确的建议，我想确认三个点：你目前的行业/产品是什么？主要获客平台是哪一个？现在最想解决的是内容生产、线索承接，还是客服转化？"
  ];

  if (intent.should_handoff) {
    base.push(
      "你这个问题已经比较接近具体合作/报价阶段，我会把你的情况整理给人工顾问继续跟进。"
    );
  } else if (message.includes("微信") || message.includes("联系方式")) {
    base.push(
      "你可以留下企业微信或手机号，我们会按你的业务情况安排后续沟通。"
    );
  }

  return base.join("\n");
}

function buildLeadSummary(lead, message, intent) {
  return `${lead.display_name} asked: ${message.slice(0, 120)}. Intent score: ${intent.score}.`;
}
