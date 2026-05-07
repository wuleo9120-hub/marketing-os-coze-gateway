import {
  createMemory,
  getContentAsset,
  getPublishingJob,
  listPublishingJobs,
  updateContentAsset,
  updatePublishingJob
} from "../data/store.mjs";
import { recordMetric } from "./analytics-review.mjs";

const INITIAL_METRICS = ["views", "likes", "comments", "shares", "leads"];

export function getPublishingReviewQueue(options = {}) {
  const jobs = listPublishingJobs({
    workspace_id: options.workspace_id,
    limit: 100
  });

  return {
    totals: {
      jobs: jobs.length,
      pending: jobs.filter((job) => job.status === "pending_approval").length,
      published: jobs.filter((job) => job.status === "published_manual").length
    },
    items: jobs.map((job) => {
      const asset = job.content_asset_id ? getContentAsset(job.content_asset_id) : null;
      return {
        job,
        asset,
        review_status: inferReviewStatus(job),
        needs_human_confirmation: ["pending_approval", "draft"].includes(job.status)
      };
    })
  };
}

export function markPublishingJobPublished(input) {
  const job = getPublishingJob(input.publishing_job_id);
  if (!job) {
    const error = new Error(`Publishing job not found: ${input.publishing_job_id}`);
    error.statusCode = 404;
    throw error;
  }
  if (input.workspace_id && job.workspace_id !== input.workspace_id) {
    const error = new Error(`Publishing job not found in workspace: ${input.publishing_job_id}`);
    error.statusCode = 404;
    throw error;
  }

  const asset = job.content_asset_id ? getContentAsset(job.content_asset_id) : null;
  const publishedAt = input.published_at || new Date().toISOString();
  const platformResponse = {
    mode: "manual",
    external_post_url: input.external_post_url || null,
    external_post_id: input.external_post_id || null,
    note: input.note || "Marked as manually published by operator.",
    published_at: publishedAt
  };

  const updatedJob = updatePublishingJob(job.id, {
    status: "published_manual",
    platform_response: {
      ...(job.platform_response ?? {}),
      ...platformResponse
    }
  });

  let updatedAsset = asset;
  if (asset) {
    updatedAsset = updateContentAsset(asset.id, {
      status: "published_manual",
      metadata: {
        ...asset.metadata,
        manual_publish: platformResponse
      }
    });
  }

  const metrics = recordInitialMetrics({
    input,
    job: updatedJob,
    asset: updatedAsset
  });

  const memory = createMemory({
    workspace_id: job.workspace_id,
    memory_type: "workflow",
    title: `Manual publish: ${job.platform}/${job.id}`,
    content: JSON.stringify(
      {
        publishing_job: updatedJob,
        content_asset: updatedAsset,
        metrics
      },
      null,
      2
    ),
    summary: `Manual publish recorded for ${job.platform} job ${job.id}.`,
    source_type: "manual_publish",
    source_id: job.id,
    created_by_agent: "publishing_ops",
    importance: 4
  });

  return {
    publishing_job: updatedJob,
    content_asset: updatedAsset,
    metrics,
    memory,
    next_actions: [
      "24 小时后回填真实播放、互动和线索指标。",
      "指标足够后运行策略复盘，更新下一轮内容方向。"
    ]
  };
}

function recordInitialMetrics({ input, job, asset }) {
  const metricsInput = input.metrics ?? {};
  const entityId = asset?.id ?? job.id;
  const entityType = asset ? "content_asset" : "publishing_job";

  return INITIAL_METRICS.map((metricName) =>
    recordMetric({
      workspace_id: job.workspace_id,
      entity_type: entityType,
      entity_id: entityId,
      metric_name: metricName,
      metric_value: Number(metricsInput[metricName] ?? 0),
      platform: job.platform,
      metadata: {
        source: "manual_publish_review",
        publishing_job_id: job.id,
        external_post_url: input.external_post_url || null
      }
    })
  );
}

function inferReviewStatus(job) {
  if (job.status === "published_manual") return "published";
  if (job.status === "pending_approval") return "needs_review";
  if (job.status?.includes("submitted")) return "submitted";
  return job.status ?? "unknown";
}
