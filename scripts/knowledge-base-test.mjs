import { join } from "node:path";
import { tmpdir } from "node:os";

process.env.STORE_PATH = join(
  tmpdir(),
  `ai-marketing-agents-kb-${Date.now()}.json`
);

const {
  addKnowledgeDocument,
  getKnowledgeOverview,
  queryKnowledge
} = await import("../apps/api/src/core/knowledge-base.mjs");
const { getSnapshot, seedInitialData } = await import(
  "../apps/api/src/data/store.mjs"
);

seedInitialData();

const document = addKnowledgeDocument({
  title: "课程产品 FAQ",
  content: `
产品名称：AI 自动化营销训练营。

适合人群：本地生活商家、知识付费团队、企业销售团队。

核心卖点：帮助团队建立 AI 内容生产、线索承接、企微客服和销售转人工流程。

常见问题：客户经常问是否支持抖音、小红书、视频号。回答时要强调官方接口优先，无法官方自动发布的平台先生成发布包和人工确认流程。

禁用表达：不要承诺百分百成交，不要承诺绕过平台风控。
  `,
  memory_type: "brand"
});

const search = queryKnowledge("视频号 官方接口 发布包", { limit: 3 });
const overview = getKnowledgeOverview();
const snapshot = getSnapshot();

if (document.chunk_count < 1) {
  throw new Error("Expected at least one knowledge chunk.");
}

if (search.results.length < 1) {
  throw new Error("Expected knowledge search results.");
}

const report = {
  document,
  search,
  overview: overview.totals,
  memories: snapshot.memories.length,
  store_documents: snapshot.knowledge_documents.length,
  store_chunks: snapshot.knowledge_chunks.length
};

console.log(JSON.stringify(report, null, 2));

