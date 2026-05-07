import {
  createExperiment,
  createMemory,
  createPerformanceMetric,
  listContentAssets,
  listExperiments,
  listLeads,
  listPerformanceMetrics,
  listPublishingJobs
} from "../data/store.mjs";

const METRIC_WEIGHTS = {
  views: 1,
  likes: 3,
  comments: 5,
  saves: 6,
  shares: 6,
  leads: 20,
  handoffs: 35,
  deals: 80
};

export function recordMetric(input) {
  return createPerformanceMetric(input);
}

export function createExperimentRecord(input) {
  return createExperiment(input);
}

export function getAnalyticsOverview(options = {}) {
  const metrics = listPerformanceMetrics({
    workspace_id: options.workspace_id,
    limit: 500
  });
  const assets = listContentAssets({
    workspace_id: options.workspace_id,
    limit: 200
  });
  const jobs = listPublishingJobs({
    workspace_id: options.workspace_id,
    limit: 200
  });
  const leads = listLeads({ workspace_id: options.workspace_id, limit: 200 });
  const experiments = listExperiments({
    workspace_id: options.workspace_id,
    limit: 100
  });

  return {
    totals: {
      metrics: metrics.length,
      assets: assets.length,
      publishing_jobs: jobs.length,
      leads: leads.length,
      experiments: experiments.length
    },
    funnel: buildFunnel(metrics, leads),
    top_entities: rankEntities(metrics).slice(0, 8),
    experiments,
    recent_metrics: metrics.slice(0, 20)
  };
}

export function runStrategyReview(input = {}) {
  const overview = getAnalyticsOverview({
    workspace_id: input.workspace_id
  });
  const top = overview.top_entities[0];
  const insightLines = [
    `Total content assets: ${overview.totals.assets}`,
    `Total publishing jobs: ${overview.totals.publishing_jobs}`,
    `Total leads: ${overview.totals.leads}`,
    `Total recorded metrics: ${overview.totals.metrics}`
  ];

  if (top) {
    insightLines.push(
      `Top entity: ${top.entity_type}/${top.entity_id} with weighted score ${top.weighted_score}`
    );
  }

  const recommendations = buildRecommendations(overview);

  const memory = createMemory({
    workspace_id: input.workspace_id,
    memory_type: "strategy",
    title: input.title ?? `Strategy review ${new Date().toISOString()}`,
    content: JSON.stringify(
      {
        overview,
        insights: insightLines,
        recommendations
      },
      null,
      2
    ),
    summary: [...insightLines, ...recommendations].join(" | ").slice(0, 240),
    source_type: "analytics_review",
    source_id: top?.entity_id ?? null,
    created_by_agent: "data_review",
    importance: 4
  });

  return {
    memory,
    overview,
    insights: insightLines,
    recommendations
  };
}

function buildFunnel(metrics, leads) {
  const totals = aggregateMetrics(metrics);

  return {
    views: totals.views ?? 0,
    likes: totals.likes ?? 0,
    comments: totals.comments ?? 0,
    saves: totals.saves ?? 0,
    shares: totals.shares ?? 0,
    leads: totals.leads ?? leads.length,
    handoffs: totals.handoffs ?? leads.filter((lead) => lead.stage === "handoff_pending").length,
    deals: totals.deals ?? 0
  };
}

function aggregateMetrics(metrics) {
  return metrics.reduce((acc, metric) => {
    acc[metric.metric_name] =
      (acc[metric.metric_name] ?? 0) + Number(metric.metric_value ?? 0);
    return acc;
  }, {});
}

function rankEntities(metrics) {
  const grouped = new Map();

  for (const metric of metrics) {
    const key = `${metric.entity_type}:${metric.entity_id}`;
    const current =
      grouped.get(key) ?? {
        entity_type: metric.entity_type,
        entity_id: metric.entity_id,
        platform: metric.platform,
        weighted_score: 0,
        metrics: {}
      };

    const value = Number(metric.metric_value ?? 0);
    current.metrics[metric.metric_name] =
      (current.metrics[metric.metric_name] ?? 0) + value;
    current.weighted_score += value * (METRIC_WEIGHTS[metric.metric_name] ?? 1);
    grouped.set(key, current);
  }

  return [...grouped.values()].sort(
    (a, b) => b.weighted_score - a.weighted_score
  );
}

function buildRecommendations(overview) {
  const recommendations = [];
  const funnel = overview.funnel;

  if (funnel.views > 0 && funnel.leads / funnel.views < 0.01) {
    recommendations.push(
      "Lead conversion is below 1%; strengthen call-to-action and lead capture path."
    );
  }

  if (funnel.comments > funnel.leads) {
    recommendations.push(
      "Comments are higher than captured leads; add guided reply flow to move commenters into consultation."
    );
  }

  if (overview.top_entities[0]) {
    recommendations.push(
      "Use the top weighted entity as a pattern source for the next content experiment."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Keep collecting metrics; no strong optimization signal yet."
    );
  }

  return recommendations;
}
