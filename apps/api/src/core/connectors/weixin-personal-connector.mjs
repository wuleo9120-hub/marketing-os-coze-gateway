import {
  createLeadRecord,
  getLeadConversation,
  receiveCustomerMessage
} from "../customer-service.mjs";
import { getRuntimeConfig } from "../config-registry.mjs";

export function getWeixinPersonalConfig() {
  const qr = getRuntimeConfig("weixin_personal");

  return {
    qr_url: qr.value,
    configured: qr.configured,
    mode: qr.configured ? "assistive_qr" : "manual",
    env_var: qr.env_var,
    account_label: process.env.WEIXIN_PERSONAL_ACCOUNT_LABEL ?? null,
    policy: {
      unattended_friend_add: false,
      unattended_messaging: false,
      human_confirmation_required: true,
      allowed_actions: [
        "show_personal_wechat_qr",
        "record_lead_after_customer_adds_wechat",
        "draft_reply",
        "summarize_conversation",
        "handoff_to_human"
      ],
      blocked_actions: [
        "auto_add_friend",
        "auto_send_private_message",
        "bulk_message_personal_contacts",
        "bypass_wechat_client_or_platform_controls"
      ]
    }
  };
}

export function getWeixinPersonalStatus() {
  const config = getWeixinPersonalConfig();

  return {
    ok: true,
    configured: config.configured,
    mode: config.mode,
    status: config.configured ? "qr_configured" : "manual_only",
    message: config.configured
      ? "Personal WeChat assisted mode can show the configured QR code and create local CRM leads."
      : "WEIXIN_PERSONAL_QR_URL is not configured. Personal WeChat can still be used manually by entering leads in CRM.",
    account_label: config.account_label,
    qr_url: config.qr_url,
    policy: config.policy
  };
}

export function ingestWeixinPersonalLead(input) {
  const lead = createLeadRecord({
    workspace_id: input.workspace_id,
    source_platform: input.source_platform ?? "weixin_personal",
    source_content_id: input.source_content_id,
    display_name: input.display_name ?? "个微客户",
    contact_method: "weixin_personal",
    contact_value: input.contact_value ?? input.alias ?? "manual_pending",
    summary:
      input.summary ??
      "Customer was captured through personal WeChat assisted workflow."
  });

  return {
    mode: getWeixinPersonalConfig().mode,
    lead,
    policy_note:
      "The system recorded the lead only. Friend acceptance and outbound messages require human confirmation in WeChat."
  };
}

export function receiveWeixinPersonalMessage(input) {
  const result = receiveCustomerMessage({
    lead_id: input.lead_id,
    content: input.content
  });

  return {
    mode: getWeixinPersonalConfig().mode,
    result,
    conversation: getLeadConversation(input.lead_id),
    policy_note:
      "AI responses are drafts for operator review unless a compliant official messaging channel is configured."
  };
}
