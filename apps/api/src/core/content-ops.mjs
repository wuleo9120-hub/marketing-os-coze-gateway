import {
  createContentAsset,
  createMemory,
  createPublishingJob,
  getContentAsset,
  listContentAssets,
  listPublishingJobs
} from "../data/store.mjs";

const PLATFORMS = ["douyin", "xiaohongshu", "shipinhao"];

export function createContentAssetRecord(input) {
  const asset = createContentAsset({
    workspace_id: input.workspace_id,
    asset_type: input.asset_type ?? "script",
    title: input.title,
    body: input.body,
    platform: input.platform,
    status: input.status ?? "draft",
    metadata: input.metadata ?? {},
    created_by_task_id: input.created_by_task_id
  });

  createMemory({
    workspace_id: asset.workspace_id,
    memory_type: "content",
    title: `Content asset: ${asset.title}`,
    content: asset.body,
    summary: asset.body.slice(0, 240),
    source_type: "content_asset",
    source_id: asset.id,
    created_by_agent: "content_ops",
    importance: 3
  });

  return asset;
}

export function createAssetsFromAgentResult({ task, result }) {
  if (!["content_creation", "video_production"].includes(task.agent_type)) {
    return [];
  }

  const title = `${task.agent_type} draft for ${task.id}`;
  const body = buildAssetBody(task, result);

  return [
    createContentAssetRecord({
      workspace_id: task.workspace_id,
      asset_type: task.agent_type === "video_production" ? "video_brief" : "script",
      title,
      body,
      status: "draft",
      created_by_task_id: task.id,
      metadata: {
        source_agent: task.agent_type,
        artifacts: result.artifacts ?? [],
        key_findings: result.key_findings ?? []
      }
    })
  ];
}

export function createPublishingPackage(input) {
  const asset = getContentAsset(input.content_asset_id);
  if (!asset) {
    throw new Error(`Content asset not found: ${input.content_asset_id}`);
  }

  const platforms = input.platforms?.length ? input.platforms : PLATFORMS;
  const workspaceId = input.workspace_id ?? asset.workspace_id;

  return platforms.map((platform) => {
    const platformAsset = createContentAssetRecord({
      workspace_id: workspaceId,
      asset_type: "publishing_package",
      title: `${asset.title} - ${platform}`,
      body: formatPlatformPackage({ asset, platform }),
      platform,
      status: "pending_approval",
      created_by_task_id: input.created_by_task_id ?? asset.created_by_task_id,
      metadata: {
        source_asset_id: asset.id,
        platform,
        package_version: 1
      }
    });

    const job = createPublishingJob({
      workspace_id: workspaceId,
      content_asset_id: platformAsset.id,
      platform,
      status: "pending_approval",
      scheduled_for: input.scheduled_for ?? null,
      approval_id: input.approval_id ?? null
    });

    return {
      asset: platformAsset,
      publishing_job: job
    };
  });
}

export function createPublishingPackagesForTask({ task, approval_id }) {
  const sourceAssets = listContentAssets({
    workspace_id: task.workspace_id,
    limit: 20
  }).filter(
    (asset) => asset.status === "draft"
  );

  const sourceAsset =
    sourceAssets.find((asset) => asset.created_by_task_id === task.parent_task_id) ??
    sourceAssets[0] ??
    createContentAssetRecord({
      workspace_id: task.workspace_id,
      asset_type: "script",
      title: `Publishing source for ${task.id}`,
      body: task.objective,
      status: "draft",
      created_by_task_id: task.id
    });

  return createPublishingPackage({
    content_asset_id: sourceAsset.id,
    workspace_id: task.workspace_id,
    platforms: inferPlatforms(task),
    created_by_task_id: task.id,
    approval_id
  });
}

export function getContentOverview(options = {}) {
  return {
    assets: listContentAssets({ workspace_id: options.workspace_id }),
    publishing_jobs: listPublishingJobs({ workspace_id: options.workspace_id })
  };
}

function buildAssetBody(task, result) {
  return [
    `Objective: ${task.objective}`,
    "",
    `Summary: ${result.task_summary}`,
    "",
    "Key findings:",
    ...(result.key_findings ?? []).map((item) => `- ${item}`),
    "",
    "Next actions:",
    ...(result.next_actions ?? []).map((item) => `- ${item}`)
  ].join("\n");
}

function formatPlatformPackage({ asset, platform }) {
  const platformName = {
    douyin: "抖音",
    xiaohongshu: "小红书",
    shipinhao: "视频号"
  }[platform] ?? platform;

  return [
    `平台：${platformName}`,
    `来源资产：${asset.id}`,
    "",
    "标题建议：",
    `${asset.title}`,
    "",
    "正文/脚本：",
    asset.body,
    "",
    "发布注意：",
    "- 正式发布前需要人工确认。",
    "- 不承诺绕过平台规则。",
    "- 根据平台格式补充封面、话题和落地页入口。"
  ].join("\n");
}

function inferPlatforms(task) {
  const text = `${task.objective}\n${task.input_context?.user_instruction ?? ""}`;
  const platforms = [];
  if (/抖音|douyin/i.test(text)) platforms.push("douyin");
  if (/小红书|xiaohongshu/i.test(text)) platforms.push("xiaohongshu");
  if (/视频号|shipinhao/i.test(text)) platforms.push("shipinhao");
  return platforms.length > 0 ? platforms : PLATFORMS;
}
