const INTEGRATIONS = [
  {
    id: "douyin",
    display_name: "Douyin Publishing",
    platform: "抖音",
    path: "official_api",
    status_when_missing: "needs_app_review",
    required_env: [
      "DOUYIN_CLIENT_KEY",
      "DOUYIN_CLIENT_SECRET",
      "DOUYIN_REDIRECT_URI"
    ],
    optional_env: ["DOUYIN_DEFAULT_OPEN_ID"],
    capabilities: [
      "video_or_image_publish",
      "publish_status",
      "video_management",
      "play_and_interaction_metrics"
    ],
    acquisition_steps: [
      "注册/登录抖音开放平台。",
      "创建网站应用或移动应用。",
      "在应用详情中配置回调域名和 OAuth 授权。",
      "申请并确认视频发布及管理权限。",
      "让商家账号完成 OAuth 授权，保存 open_id、access_token、refresh_token。",
      "先用 dry-run 发布包和测试账号验证，再进入真实发布审批流。"
    ],
    fallback_paths: [
      "生成平台发布包，由人工在抖音创作者中心发布。",
      "通过 OpenClaw Bridge 做受控草稿准备，不自动点击最终发布。",
      "使用第三方服务商，但必须确认是否获得抖音开放平台授权。"
    ],
    source_urls: [
      "https://open.douyin.com/platform/resource/docs/ability/content-management/douyin-publish-solution/"
    ]
  },
  {
    id: "xiaohongshu",
    display_name: "Xiaohongshu Content Workflow",
    platform: "小红书",
    path: "manual_or_partner",
    status_when_missing: "limited_public_content_api",
    required_env: [],
    optional_env: ["XHS_APP_ID", "XHS_APP_SECRET", "XHS_PARTNER_TOKEN"],
    capabilities: [
      "content_package_generation",
      "manual_publish_checklist",
      "miniapp_or_shop_integration_when_available"
    ],
    acquisition_steps: [
      "优先确认商家是否有小红书专业号、店铺、小程序或服务商合作资格。",
      "如走小程序能力，进入小红书小程序开放平台完成主体认证、类目与备案。",
      "如需要笔记/内容发布 API，联系小红书业务方或官方服务商确认是否定向开放。",
      "未获得官方能力前，只生成笔记发布包、标题、封面建议、话题和人工发布清单。"
    ],
    fallback_paths: [
      "人工发布小红书笔记，系统记录发布链接和指标。",
      "OpenClaw 只辅助整理草稿、标签和检查清单，不绕过平台规则。",
      "通过小红书小程序/店铺承接线索，而不是强求自动发布接口。"
    ],
    source_urls: ["https://miniapp.xiaohongshu.com/"]
  },
  {
    id: "shipinhao",
    display_name: "WeChat Channels Workflow",
    platform: "视频号",
    path: "manual_or_wechat_ecosystem",
    status_when_missing: "no_general_public_publish_api",
    required_env: [],
    optional_env: [
      "WECHAT_APP_ID",
      "WECHAT_APP_SECRET",
      "WECHAT_SHOP_APP_ID",
      "WECHAT_SHOP_SECRET"
    ],
    capabilities: [
      "video_account_publish_package",
      "manual_publish_checklist",
      "wechat_shop_or_mini_program_conversion"
    ],
    acquisition_steps: [
      "确认商家是否有视频号、公众号、小程序、微信小店或微信客服。",
      "若做交易闭环，优先接微信小店/小程序/微信客服相关官方能力。",
      "视频内容发布先使用发布包和人工确认，记录发布链接和指标。",
      "如后续官方或服务商开放内容发布能力，再接入 connector。"
    ],
    fallback_paths: [
      "使用视频号助手人工发布。",
      "用系统生成标题、脚本、封面、话题和评论区引导。",
      "用企业微信/微信客服承接线索。"
    ],
    source_urls: ["https://developers.weixin.qq.com/"]
  },
  {
    id: "wecom",
    display_name: "WeCom Customer Contact",
    platform: "企业微信",
    path: "official_api",
    status_when_missing: "needs_enterprise_admin",
    required_env: [
      "WECOM_CORP_ID",
      "WECOM_AGENT_ID",
      "WECOM_EXTERNAL_CONTACT_SECRET",
      "WECOM_CALLBACK_TOKEN",
      "WECOM_ENCODING_AES_KEY"
    ],
    optional_env: ["WECOM_DEFAULT_USER_ID", "WECOM_CONTACT_WAY_CONFIG_ID"],
    capabilities: [
      "contact_way_qrcode",
      "external_customer_profile",
      "customer_service_messages",
      "customer_group_and_moment_workflows"
    ],
    acquisition_steps: [
      "注册并认证企业微信主体。",
      "在管理后台开启客户联系，并配置可使用客户联系功能的成员。",
      "创建自建应用，并在客户联系 API 页面配置可调用应用。",
      "获取 corpid、应用 agentid、应用 secret、客户联系 secret。",
      "配置回调 URL、Token、EncodingAESKey。",
      "先生成联系我二维码，引导客户主动添加，再由 AI 客服和人工承接。"
    ],
    fallback_paths: [
      "先使用系统生成咨询表单或企业微信二维码落地页。",
      "人工导入线索到 CRM，再由 AI 客服生成回复建议。",
      "未开通客户联系前，不自动添加客户，只收集咨询方式。"
    ],
    source_urls: [
      "https://developer.work.weixin.qq.com/",
      "https://developer.work.weixin.qq.com/document/path/92109",
      "https://developer.work.weixin.qq.com/document/path/92228"
    ]
  },
  {
    id: "weixin_personal",
    display_name: "Personal WeChat Assisted Workflow",
    platform: "个人微信",
    path: "assistive_human_in_loop",
    status_when_missing: "manual_qr_or_operator_workflow",
    required_env: [],
    optional_env: [
      "WEIXIN_PERSONAL_QR_URL",
      "WEIXIN_PERSONAL_QR_PATH",
      "WEIXIN_PERSONAL_ACCOUNT_LABEL"
    ],
    capabilities: [
      "qr_intake",
      "manual_lead_recording",
      "ai_reply_drafts",
      "conversation_summary",
      "human_handoff"
    ],
    acquisition_steps: [
      "准备专门用于业务承接的个人微信号，并设置清晰账号标签。",
      "导出或上传个人微信二维码，配置 WEIXIN_PERSONAL_QR_URL 或在落地页中展示。",
      "客户主动添加后，由人工确认好友申请，系统记录线索和对话摘要。",
      "AI 只生成回复草稿、跟进建议和成交信号判断，最终发送由人工确认。",
      "当咨询量或合规要求变高时，迁移到企业微信客户联系或微信客服。"
    ],
    fallback_paths: [
      "使用固定个人微信二维码承接客户，系统只记录线索和生成回复建议。",
      "OpenClaw 只辅助打开页面、准备草稿或提醒人工，不自动加好友、不自动发私信。",
      "Hermes 负责长期记忆、客户摘要和话术优化，不直接操作个人微信账号。"
    ],
    source_urls: ["https://developers.weixin.qq.com/"]
  }
];

export function getIntegrationReadiness() {
  const items = INTEGRATIONS.map((integration) => {
    const required = integration.required_env.map((name) => envStatus(name, true));
    const optional = integration.optional_env.map((name) => envStatus(name, false));
    const missingRequired = required.filter((item) => !item.configured);
    const hasRequiredCredentials = required.length > 0 && missingRequired.length === 0;
    const hasOptionalCredentials = optional.some((item) => item.configured);
    const configured =
      hasRequiredCredentials || (required.length === 0 && hasOptionalCredentials);
    const readiness =
      configured && required.length === 0
        ? "partner_or_ecosystem_credentials_present"
        : configured
          ? "ready_for_connector"
          : integration.status_when_missing;

    return {
      ...integration,
      readiness,
      configured,
      required_env: required,
      optional_env: optional,
      next_action:
        configured
          ? "Connector credentials are present. Run a dry-run integration test before live use."
          : missingRequired.length > 0
            ? `Missing: ${missingRequired.map((item) => item.name).join(", ")}`
            : "No general self-serve publish credentials are configured. Use the fallback workflow until official or partner access is granted."
    };
  });

  return {
    generated_at: new Date().toISOString(),
    summary: {
      integrations: items.length,
      ready: items.filter((item) => item.configured).length,
      needs_action: items.filter((item) => !item.configured).length
    },
    items
  };
}

function envStatus(name, required) {
  const value = process.env[name] ?? "";
  return {
    name,
    required,
    configured: Boolean(value),
    masked_value: value ? mask(value) : null
  };
}

function mask(value) {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
