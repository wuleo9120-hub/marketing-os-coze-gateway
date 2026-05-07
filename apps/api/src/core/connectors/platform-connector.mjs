import {
  createMemory,
  getContentAsset,
  getPublishingJob,
  listPublishingJobs,
  updateContentAsset,
  updatePublishingJob
} from "../../data/store.mjs";
import { recordMetric } from "../analytics-review.mjs";
import { getRuntimeConfig } from "../config-registry.mjs";

const DEFAULT_TIMEOUT_MS = 8000;
const METRICS = ["views", "likes", "comments", "shares", "leads"];

export function getPlatformConnectorConfig() {
  const config = getRuntimeConfig("platform_connector");
  return {
    base_url: config.value,
    configured: config.configured,
    mode: config.mode,
    env_var: config.env_var
  };
}

export async function getPlatformConnectorStatus() {
  const config = getPlatformConnectorConfig();

  if (!config.configured) {
    return {
      ok: true,
      configured: false,
      mode: "stub",
      status: "not_configured",
      message:
        "PLATFORM_CONNECTOR_URL is not configured. Platform publishing and metrics use local stub behavior."
    };
  }

  try {
    const response = await fetchWithTimeout(new URL("/health", config.base_url), {
      method: "GET"
    });

    return {
      ok: response.ok,
      configured: true,
      mode: "gateway",
      status: response.ok ? "reachable" : "unhealthy",
      status_code: response.status,
      body: await safeJson(response)
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      mode: "gateway",
      status: "unreachable",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function submitPublishingJob(input) {
  const job = getPublishingJob(input.publishing_job_id);
  if (!job) {
    throw new Error(`Publishing job not found: ${input.publishing_job_id}`);
  }

  const asset = job.content_asset_id ? getContentAsset(job.content_asset_id) : null;
  const config = getPlatformConnectorConfig();

  if (!config.configured) {
    const platformResponse = {
      mode: "stub",
      external_post_id: `${job.platform}_${job.id}`,
      submitted_at: new Date().toISOString(),
      note: "No real platform account action was executed."
    };

    const updatedJob = updatePublishingJob(job.id, {
      status: "submitted_stub",
      platform_response: platformResponse
    });

    if (asset) {
      updateContentAsset(asset.id, {
        status: "submitted_stub",
        metadata: {
          ...asset.metadata,
          platform_response: platformResponse
        }
      });
    }

    createMemory({
      memory_type: "tool",
      title: `Platform submit stub: ${job.platform}/${job.id}`,
      content: JSON.stringify(
        {
          publishing_job: updatedJob,
          content_asset: asset,
          policy: "Stub mode updated local state only."
        },
        null,
        2
      ),
      summary: `Submitted ${job.platform} publishing job in stub mode.`,
      source_type: "platform_connector",
      source_id: job.id,
      created_by_agent: "publishing_ops",
      importance: 3
    });

    return {
      mode: "stub",
      status: "submitted_stub",
      publishing_job: updatedJob,
      content_asset: asset,
      platform_response: platformResponse
    };
  }

  const response = await fetchWithTimeout(new URL("/publishing-jobs", config.base_url), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      publishing_job: job,
      content_asset: asset,
      approval_id: job.approval_id,
      dry_run: input.dry_run ?? true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Platform connector request failed: ${response.status} ${body}`);
  }

  const body = await response.json();
  const updatedJob = updatePublishingJob(job.id, {
    status: body.status ?? "submitted",
    platform_response: body
  });

  return {
    mode: "gateway",
    status: updatedJob.status,
    publishing_job: updatedJob,
    platform_response: body
  };
}

export async function syncPlatformMetrics(input = {}) {
  const jobs = listPublishingJobs({
    platform: input.platform,
    limit: input.limit ?? 50
  }).filter((job) =>
    input.include_drafts
      ? true
      : ["submitted_stub", "submitted", "published", "published_stub"].includes(
          job.status
        )
  );

  if (getPlatformConnectorConfig().configured) {
    return syncMetricsFromGateway(input, jobs);
  }

  const metrics = [];
  for (const job of jobs) {
    const seed = scoreSeed(job.id);
    const values = {
      views: 300 + seed * 17,
      likes: 20 + seed,
      comments: 4 + (seed % 12),
      shares: 2 + (seed % 8),
      leads: 1 + (seed % 5)
    };

    for (const metricName of METRICS) {
      metrics.push(
        recordMetric({
          entity_type: "publishing_job",
          entity_id: job.id,
          metric_name: metricName,
          metric_value: values[metricName],
          platform: job.platform,
          metadata: {
            source: "platform_connector_stub",
            content_asset_id: job.content_asset_id
          }
        })
      );
    }

    if (job.content_asset_id) {
      metrics.push(
        recordMetric({
          entity_type: "content_asset",
          entity_id: job.content_asset_id,
          metric_name: "leads",
          metric_value: values.leads,
          platform: job.platform,
          metadata: {
            source: "platform_connector_stub",
            publishing_job_id: job.id
          }
        })
      );
    }
  }

  return {
    mode: "stub",
    synced_jobs: jobs.length,
    metrics
  };
}

async function syncMetricsFromGateway(input, jobs) {
  const config = getPlatformConnectorConfig();
  const response = await fetchWithTimeout(new URL("/metrics/sync", config.base_url), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jobs,
      platform: input.platform,
      since: input.since
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Platform metrics sync failed: ${response.status} ${body}`);
  }

  const body = await response.json();
  const metrics = (body.metrics ?? []).map((metric) => recordMetric(metric));

  return {
    mode: "gateway",
    synced_jobs: jobs.length,
    metrics,
    gateway_response: body
  };
}

function scoreSeed(value) {
  return [...String(value)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 50;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
