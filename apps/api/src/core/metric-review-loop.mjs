import {
  createExperimentRecord,
  getAnalyticsOverview,
  runStrategyReview
} from "./analytics-review.mjs";
import {
  createMemory,
  createTask,
  getContentAsset,
  getSnapshot
} from "../data/store.mjs";

export function runMetricReviewLoop(input = {}) {
  const runId = input.run_id ?? `metric_review_${Date.now()}`;
  const snapshot = getSnapshot();
  const workspaceId = input.workspace_id;
  const analytics = getAnalyticsOverview({
    workspace_id: workspaceId
  });
  const publishedJobs = snapshot.publishing_jobs.filter(
    (job) =>
      (job.workspace_id || "default") === (workspaceId || "default") &&
      ["published_manual", "published", "submitted", "submitted_stub"].includes(
        job.status
      )
  );
  const ranked = analytics.top_entities.slice(0, 5);
  const topEntity = ranked[0] ?? null;
  const topAsset = resolveTopAsset(topEntity);
  const recommendations = buildRecommendations({ analytics, topEntity, topAsset });
  const strategyReview = runStrategyReview({
    workspace_id: workspaceId,
    title: `Real metric review ${runId}`
  });

  const loopMemory = createMemory({
    workspace_id: workspaceId,
    memory_type: "strategy",
    title: `真实指标复盘循环 ${runId}`,
    content: JSON.stringify(
      {
        run_id: runId,
        analytics,
        published_jobs: publishedJobs.map((job) => ({
          id: job.id,
          platform: job.platform,
          status: job.status,
          content_asset_id: job.content_asset_id,
          platform_response: job.platform_response
        })),
        top_entity: topEntity,
        top_asset: topAsset,
        recommendations
      },
      null,
      2
    ),
    summary: recommendations.map((item) => item.title).join(" | ").slice(0, 240),
    source_type: "metric_review_loop",
    source_id: runId,
    created_by_agent: "data_review",
    importance: 5
  });

  const experiment = createExperimentRecord({
    workspace_id: workspaceId,
    name: `Next round content test ${runId}`,
    hypothesis:
      recommendations[0]?.hypothesis ??
      "Use the best available content pattern to generate the next content round and improve lead conversion.",
    status: "planned",
    related_entity_type: topEntity?.entity_type ?? "metric_review_loop",
    related_entity_id: topEntity?.entity_id ?? runId
  });

  const tasks = createNextRoundTasks({
    runId,
    workspaceId,
    recommendations,
    topAsset,
    analytics
  });

  return {
    run_id: runId,
    strategy_review_memory_id: strategyReview.memory.id,
    loop_memory: loopMemory,
    analytics_summary: {
      funnel: analytics.funnel,
      top_entities: ranked,
      published_jobs: publishedJobs.length
    },
    recommendations,
    experiment,
    tasks,
    next_actions: [
      "运行任务队列，生成下一轮内容草稿。",
      "人工审核新内容资产和发布包。",
      "发布 24 小时后继续回填真实指标。"
    ]
  };
}

function resolveTopAsset(topEntity) {
  if (!topEntity) return null;
  if (topEntity.entity_type === "content_asset") {
    return getContentAsset(topEntity.entity_id);
  }
  return null;
}

function buildRecommendations({ analytics, topEntity, topAsset }) {
  const funnel = analytics.funnel;
  const recommendations = [];

  if (topEntity) {
    recommendations.push({
      priority: "P1",
      title: "复用最高权重内容的结构",
      rationale: `当前最高权重实体为 ${topEntity.entity_type}/${topEntity.entity_id}，分数 ${topEntity.weighted_score}。`,
      hypothesis:
        "保留表现最好内容的钩子、场景和 CTA，换一个客户痛点重新表达，可以提升下一轮线索率。"
    });
  }

  if (funnel.views > 0 && funnel.leads / funnel.views < 0.01) {
    recommendations.push({
      priority: "P1",
      title: "强化评论到咨询的转化路径",
      rationale: "当前线索/曝光低于 1%，说明 CTA 或承接路径还不够明确。",
      hypothesis:
        "在标题、正文和评论区统一使用一个关键词 CTA，可以提高咨询线索转化。"
    });
  }

  if (funnel.comments > funnel.leads) {
    recommendations.push({
      priority: "P2",
      title: "把评论互动转成私域咨询",
      rationale: "评论数高于线索数，说明用户有兴趣但没有进入承接链路。",
      hypothesis:
        "用 FAQ 式回复和个人微信/人工咨询提示承接评论，可以提升有效线索数。"
    });
  }

  if (topAsset?.body) {
    recommendations.push({
      priority: "P2",
      title: "基于最佳内容生成同主题变体",
      rationale: `最佳内容资产为 ${topAsset.title}。`,
      hypothesis:
        "把最佳内容改写成平台差异化版本，可以减少重新探索成本。"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "P3",
      title: "继续收集真实发布指标",
      rationale: "当前真实指标还不足以形成强信号。",
      hypothesis:
        "至少完成 3 条内容发布和 24 小时指标回填后，再生成下一轮优化会更稳定。"
    });
  }

  return recommendations;
}

function createNextRoundTasks({
  runId,
  workspaceId,
  recommendations,
  topAsset,
  analytics
}) {
  const baseObjective = [
    "基于真实指标复盘结果，生成下一轮低风险内容草稿。",
    `核心建议：${recommendations.map((item) => item.title).join("；")}`,
    topAsset ? `参考最佳资产：${topAsset.title}` : "当前无明确最佳资产，使用整体漏斗表现。"
  ].join("\n");

  return [
    createTask({
      workspace_id: workspaceId,
      agent_type: "content_creation",
      objective: baseObjective,
      input_context: {
        expected_output: "Next round content drafts",
        source: "metric_review_loop",
        run_id: runId,
        funnel: analytics.funnel,
        top_asset_id: topAsset?.id ?? null
      },
      risk_level: "L1",
      approval_required: false,
      assigned_tools: ["memory", "knowledge_base", "content_generator_stub"]
    }),
    createTask({
      workspace_id: workspaceId,
      agent_type: "data_review",
      objective:
        "基于真实指标复盘结果，给下一轮内容实验定义成功指标和复盘时间点。",
      input_context: {
        expected_output: "Metric review plan",
        source: "metric_review_loop",
        run_id: runId,
        funnel: analytics.funnel
      },
      risk_level: "L1",
      approval_required: false,
      assigned_tools: ["memory", "analytics_stub"]
    })
  ];
}
