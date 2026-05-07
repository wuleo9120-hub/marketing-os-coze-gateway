import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-platform-wecom-${Date.now()}.json`
);

const { getAnalyticsOverview } = await import(
  "../apps/api/src/core/analytics-review.mjs"
);
const {
  createContentAssetRecord,
  createPublishingPackage
} = await import("../apps/api/src/core/content-ops.mjs");
const {
  getPlatformConnectorStatus,
  submitPublishingJob,
  syncPlatformMetrics
} = await import("../apps/api/src/core/connectors/platform-connector.mjs");
const {
  getWeComStatus,
  ingestWeComLead,
  receiveWeComMessage
} = await import("../apps/api/src/core/connectors/wecom-connector.mjs");
const { seedInitialData } = await import("../apps/api/src/data/store.mjs");

seedInitialData();

const platformStatus = await getPlatformConnectorStatus();
const wecomStatus = await getWeComStatus();

const asset = createContentAssetRecord({
  asset_type: "script",
  title: "自动化营销闭环演示",
  body: "展示 AI 如何从内容生成、发布包、线索承接到销售转人工。",
  platform: "douyin"
});

const [publishingPackage] = createPublishingPackage({
  content_asset_id: asset.id,
  platforms: ["douyin"]
});

const submission = await submitPublishingJob({
  publishing_job_id: publishingPackage.publishing_job.id
});

const metricsSync = await syncPlatformMetrics({
  platform: "douyin"
});

const leadImport = await ingestWeComLead({
  display_name: "李总",
  external_user_id: "external_user_stub_001",
  source_platform: "wecom",
  source_content_id: asset.id,
  summary: "客户来自抖音内容后的企微咨询。"
});

const message = await receiveWeComMessage({
  lead_id: leadImport.lead.id,
  content: "我看了你们的视频，想了解报价和怎么签合同。"
});

const analytics = getAnalyticsOverview();

if (submission.status !== "submitted_stub") {
  throw new Error(`Expected submitted_stub status, got ${submission.status}`);
}

if (metricsSync.metrics.length === 0 || analytics.totals.metrics === 0) {
  throw new Error("Expected platform metrics to be recorded.");
}

if (!message.result.handoff) {
  throw new Error("Expected WeCom high-intent message to create a handoff.");
}

const report = {
  platform_status: platformStatus,
  wecom_status: wecomStatus,
  submission: {
    mode: submission.mode,
    status: submission.status,
    publishing_job_id: submission.publishing_job.id,
    external_post_id: submission.platform_response.external_post_id
  },
  metrics: {
    synced_jobs: metricsSync.synced_jobs,
    metric_count: metricsSync.metrics.length,
    analytics_totals: analytics.totals
  },
  wecom: {
    lead_id: leadImport.lead.id,
    stage: message.result.lead.stage,
    handoff_id: message.result.handoff.id,
    conversation_count: message.conversation.messages.length
  }
};

console.log(JSON.stringify(report, null, 2));
