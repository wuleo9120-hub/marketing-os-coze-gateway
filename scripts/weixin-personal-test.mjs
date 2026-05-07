import assert from "node:assert/strict";

import {
  getWeixinPersonalStatus,
  ingestWeixinPersonalLead,
  receiveWeixinPersonalMessage
} from "../apps/api/src/core/connectors/weixin-personal-connector.mjs";

const status = getWeixinPersonalStatus();
assert.equal(status.ok, true);
assert.equal(status.policy.unattended_friend_add, false);
assert.equal(status.policy.unattended_messaging, false);

const { lead, policy_note } = ingestWeixinPersonalLead({
  display_name: "个微测试客户",
  contact_value: "wechat_alias_demo",
  summary: "测试个人微信辅助承接。"
});

assert.equal(lead.contact_method, "weixin_personal");
assert.match(policy_note, /human confirmation|人工|Friend acceptance/i);

const reply = receiveWeixinPersonalMessage({
  lead_id: lead.id,
  content: "我想了解价格，今天可以下单吗？"
});

assert.ok(reply.result.assistant_message.content);
assert.ok(reply.conversation.messages.length >= 2);

console.log("weixin-personal-test passed", {
  mode: status.mode,
  lead_id: lead.id,
  stage: reply.result.lead.stage,
  handoff: reply.result.handoff?.id ?? null
});
