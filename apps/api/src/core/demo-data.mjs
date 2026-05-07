import { runStrategyReview } from "./analytics-review.mjs";
import { runAutonomousCycle } from "./autonomous-cycle.mjs";
import {
  submitPublishingJob,
  syncPlatformMetrics
} from "./connectors/platform-connector.mjs";
import {
  createContentAssetRecord,
  createPublishingPackage
} from "./content-ops.mjs";
import {
  createLeadRecord,
  receiveCustomerMessage
} from "./customer-service.mjs";
import { runAgentOptimization } from "./agent-optimizer.mjs";
import { addKnowledgeDocument } from "./knowledge-base.mjs";
import {
  createMemory,
  getSnapshot,
  listPublishingJobs
} from "../data/store.mjs";

const MERCHANT = {
  name: "云朵烘焙工作室",
  industry: "本地烘焙与亲子体验",
  city: "杭州",
  audience: "25-40 岁宝妈、年轻白领、企业行政",
  offer: "生日蛋糕定制、下午茶团购、亲子烘焙课",
  platforms: ["douyin", "xiaohongshu", "shipinhao"]
};

export async function seedDemoMerchantFlow(input = {}) {
  const runId = input.run_id ?? `demo_${Date.now()}`;
  const startedAt = new Date().toISOString();

  const brandMemory = createMemory({
    memory_type: "brand",
    title: `${MERCHANT.name} 虚拟商家画像 ${runId}`,
    content: JSON.stringify(
      {
        ...MERCHANT,
        positioning:
          "主打有温度的手作烘焙、本地同城配送、亲子陪伴体验和企业下午茶轻定制。",
        tone: "温暖、真实、轻松、有生活感",
        conversion_goal:
          "引导用户留下企业微信或手机号，由人工确认档期、预算和配送范围。"
      },
      null,
      2
    ),
    summary: `${MERCHANT.name}：${MERCHANT.offer}，目标用户：${MERCHANT.audience}`,
    source_type: "demo_seed",
    source_id: runId,
    created_by_agent: "demo_seed",
    importance: 4
  });

  const knowledge = seedKnowledge(runId);
  const assets = seedContentAssets(runId);
  const packages = assets.flatMap((asset) =>
    createPublishingPackage({
      content_asset_id: asset.id,
      platforms: MERCHANT.platforms,
      scheduled_for: null
    })
  );

  const submittedJobs = [];
  for (const job of listPublishingJobs({ limit: 100 }).filter(
    (item) =>
      packages.some((pkg) => pkg.publishing_job.id === item.id)
  )) {
    submittedJobs.push(
      await submitPublishingJob({
        publishing_job_id: job.id,
        dry_run: true
      })
    );
  }

  const metricSync = await syncPlatformMetrics({
    include_drafts: false,
    limit: 100
  });

  const crm = seedLeadsAndConversations(runId);
  const strategyReview = runStrategyReview({
    title: `${MERCHANT.name} 虚拟数据复盘 ${runId}`
  });
  const optimization = runAgentOptimization({
    title: `${MERCHANT.name} 虚拟流程 Agent 优化 ${runId}`
  });
  const cycle = await runAutonomousCycle({
    title: `${MERCHANT.name} 虚拟流程自主循环 ${runId}`,
    instruction:
      "请系统基于云朵烘焙虚拟商家数据，检查营销闭环状态，生成下一阶段低风险优化任务并自动执行。"
  });

  const snapshot = getSnapshot();

  return {
    run_id: runId,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    merchant: MERCHANT,
    brand_memory: brandMemory,
    knowledge_documents: knowledge.map((item) => item.document),
    content_assets: assets,
    publishing_packages: packages.map((item) => ({
      asset_id: item.asset.id,
      publishing_job_id: item.publishing_job.id,
      platform: item.publishing_job.platform,
      status: item.publishing_job.status
    })),
    submitted_jobs: submittedJobs.map((item) => ({
      mode: item.mode,
      status: item.status,
      publishing_job_id: item.publishing_job.id,
      platform: item.publishing_job.platform
    })),
    metric_sync: {
      mode: metricSync.mode,
      synced_jobs: metricSync.synced_jobs,
      metric_count: metricSync.metrics.length
    },
    crm: {
      leads: crm.leads.map((lead) => ({
        id: lead.id,
        display_name: lead.display_name,
        source_platform: lead.source_platform,
        stage: lead.stage,
        score: lead.score
      })),
      handoffs: crm.conversations
        .filter((item) => item.handoff)
        .map((item) => ({
          lead_id: item.lead.id,
          handoff_id: item.handoff.id,
          reason: item.handoff.reason
        }))
    },
    strategy_review: {
      memory_id: strategyReview.memory.id,
      recommendations: strategyReview.recommendations
    },
    optimization: {
      memory_id: optimization.memory.id,
      recommendations: optimization.recommendations.length,
      experiments: optimization.experiments.length,
      approval_required: optimization.approval_required.length
    },
    autonomous_cycle: {
      memory_id: cycle.cycle_memory.id,
      executed: cycle.plan?.execution_summary?.executed ?? 0,
      waiting_approval: cycle.plan?.execution_summary?.waiting_approval ?? 0,
      failed: cycle.plan?.execution_summary?.failed ?? 0
    },
    totals: {
      memories: snapshot.memories.length,
      knowledge_documents: snapshot.knowledge_documents.length,
      content_assets: snapshot.content_assets.length,
      publishing_jobs: snapshot.publishing_jobs.length,
      metrics: snapshot.performance_metrics.length,
      leads: snapshot.leads.length,
      handoffs: snapshot.sales_handoffs.length,
      experiments: snapshot.experiments.length,
      tasks: snapshot.tasks.length
    }
  };
}

function seedKnowledge(runId) {
  return [
    addKnowledgeDocument({
      title: `${MERCHANT.name} 品牌与产品资料 ${runId}`,
      source_type: "demo_seed",
      memory_type: "brand",
      importance: 4,
      content: `
商家：${MERCHANT.name}
城市：${MERCHANT.city}
主营：生日蛋糕定制、下午茶团购、亲子烘焙课。
目标客群：${MERCHANT.audience}。
核心卖点：当天现做、可同城配送、可低糖少奶油、可做企业下午茶套餐。
转化目标：引导客户留下手机号或企业微信，由人工确认日期、人数、预算、口味和配送地址。
      `
    }),
    addKnowledgeDocument({
      title: `${MERCHANT.name} 客服 FAQ 与风控边界 ${runId}`,
      source_type: "demo_seed",
      memory_type: "customer",
      importance: 4,
      content: `
客户问价格：先确认人数、尺寸、配送区域和日期，再给区间，不直接承诺最终价。
客户问微信：优先引导企业微信或官方客服入口，记录咨询方式后转人工。
客户问配送：杭州主城区可配送，远郊需人工确认。
禁用表达：不承诺全网最低价，不承诺医疗或健康功效，不承诺绕过平台规则。
高意向信号：报价、团购、付款、合同、加微信、企业下午茶、定金。
      `
    }),
    addKnowledgeDocument({
      title: `${MERCHANT.name} 平台内容方向 ${runId}`,
      source_type: "demo_seed",
      memory_type: "content",
      importance: 3,
      content: `
抖音：适合 15-30 秒制作过程、成品反转、生日惊喜、探店式镜头。
小红书：适合图文笔记、口味测评、生日布置清单、亲子周末攻略。
视频号：适合本地熟人社交、企业下午茶案例、门店日常和客户故事。
CTA：评论“蛋糕”领取口味清单；私信“亲子课”咨询周末名额；企业客户留下人数和预算。
      `
    })
  ];
}

function seedContentAssets(runId) {
  return [
    createContentAssetRecord({
      asset_type: "script",
      title: `${MERCHANT.name} 抖音短视频脚本：生日蛋糕惊喜 ${runId}`,
      platform: "douyin",
      status: "draft",
      metadata: {
        run_id: runId,
        synthetic: true
      },
      body: `
开场 3 秒：镜头扫过普通白盒，字幕“她以为只是普通蛋糕”。
中段：打开盒子，展示手绘生日蛋糕细节、低糖奶油和水果夹心。
转折：朋友在门店取蛋糕，工作人员写祝福卡。
结尾 CTA：评论“生日”领取尺寸和口味清单，杭州同城可咨询配送。
      `
    }),
    createContentAssetRecord({
      asset_type: "note",
      title: `${MERCHANT.name} 小红书笔记：亲子烘焙周末攻略 ${runId}`,
      platform: "xiaohongshu",
      status: "draft",
      metadata: {
        run_id: runId,
        synthetic: true
      },
      body: `
标题：杭州周末亲子活动｜一起做一只可以带回家的小蛋糕
正文：适合 4-10 岁小朋友，90 分钟体验，包含围裙、材料、老师指导和成品打包。
种草点：孩子参与感强、拍照好看、成品可带走、家长不用收拾厨房。
CTA：评论“亲子课”咨询本周名额。
      `
    }),
    createContentAssetRecord({
      asset_type: "script",
      title: `${MERCHANT.name} 视频号脚本：企业下午茶案例 ${runId}`,
      platform: "shipinhao",
      status: "draft",
      metadata: {
        run_id: runId,
        synthetic: true
      },
      body: `
开场：今天给一家 60 人团队准备下午茶。
镜头：蛋挞、司康、迷你杯子蛋糕、低糖水果盒装盘。
说明：可按预算搭配，可开票，提前 2 天确认人数和配送时间。
CTA：企业行政可留下人数、预算和日期，人工顾问给搭配方案。
      `
    })
  ];
}

function seedLeadsAndConversations(runId) {
  const leads = [
    createLeadRecord({
      display_name: "李女士",
      source_platform: "xiaohongshu",
      source_content_id: runId,
      contact_method: "pending",
      contact_value: null,
      summary: "咨询亲子烘焙课周末名额。"
    }),
    createLeadRecord({
      display_name: "陈先生",
      source_platform: "douyin",
      source_content_id: runId,
      contact_method: "pending",
      contact_value: null,
      summary: "咨询生日蛋糕价格和配送。"
    }),
    createLeadRecord({
      display_name: "周经理",
      source_platform: "shipinhao",
      source_content_id: runId,
      contact_method: "pending",
      contact_value: null,
      summary: "企业下午茶团购需求。"
    })
  ];

  const messages = [
    "亲子课这个周末还有名额吗？可以留个咨询方式吗？",
    "生日蛋糕 8 寸多少钱，滨江能配送吗？可以加微信看款式吗？",
    "我们公司 60 人下午茶想要报价，能开发票吗，怎么合作？"
  ];

  const conversations = leads.map((lead, index) =>
    receiveCustomerMessage({
      lead_id: lead.id,
      content: messages[index]
    })
  );

  return {
    leads: conversations.map((item) => item.lead),
    conversations
  };
}
