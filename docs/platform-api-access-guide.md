# 平台接口获取指引

## 原则

真实平台接入按“成交闭环优先、内容发布其次”的顺序推进。系统可以先用发布包、人工确认、指标回填跑通流程，等官方接口或服务商权限到位后再切换 connector。

不要把 API Key、secret、OAuth token 粘贴到对话框。把它们写入本地 `.env`，系统只会通过 `/api/config` 和 `/api/integrations/readiness` 展示脱敏状态。

## 企业微信

用途：客户留资、联系我二维码、加微承接、AI 客服、转人工。

优先级：最高，适合正式规模化自动化。

获取路径：

1. 注册并认证企业微信主体。
2. 在企业微信管理后台开启客户联系。
3. 创建自建应用，并配置可调用客户联系的应用。
4. 获取 `WECOM_CORP_ID`、`WECOM_AGENT_ID`、应用 secret、客户联系 secret。
5. 配置回调 URL、`WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`。
6. 先生成“联系我”二维码，引导客户主动添加，再让 AI 客服接待。

官方入口：

- https://developer.work.weixin.qq.com/
- https://developer.work.weixin.qq.com/document/path/92109
- https://developer.work.weixin.qq.com/document/path/92228

替代路径：先使用固定企业微信二维码或咨询表单，人工导入线索，系统继续负责 AI 回复建议和转人工。

## 个人微信

用途：早期商家常用的微信承接、二维码留资、人工确认、AI 回复草稿。

优先级：可作为初期承接方式，但不作为无人值守自动化通道。

系统策略：

1. 可以展示个人微信二维码或记录个人微信号。
2. 客户主动添加后，人工在微信里确认好友。
3. 系统记录线索、客户阶段、对话摘要和下一步跟进。
4. AI 生成回复草稿、成交信号判断和转人工建议。
5. 不自动加好友、不自动发送私信、不批量群发个人联系人。

可配置：

```text
WEIXIN_PERSONAL_QR_URL=
WEIXIN_PERSONAL_QR_PATH=
WEIXIN_PERSONAL_ACCOUNT_LABEL=
```

OpenClaw 和 Hermes 的边界：

- OpenClaw：只做受控页面辅助、草稿准备、提醒人工，不接管个人微信最终发送。
- Hermes：负责长期客户记忆、话术复盘、自我优化建议，不直接操作个人微信账号。

更优升级路径：当咨询量上来后，把个人微信承接迁移到企业微信客户联系或微信客服。这样可以保留微信生态体验，同时获得更稳定的 API、成员管理、客户归属、离职继承和审计能力。

## 抖音

用途：视频/图文发布、发布状态、内容管理、播放互动指标。

优先级：高。

获取路径：

1. 注册抖音开放平台账号。
2. 创建网站应用或移动应用。
3. 配置 OAuth 回调域名。
4. 申请内容发布、内容管理相关权限。
5. 让商家账号完成 OAuth 授权。
6. 写入 `DOUYIN_CLIENT_KEY`、`DOUYIN_CLIENT_SECRET`、`DOUYIN_REDIRECT_URI`，后续保存商家授权 token。

官方入口：

- https://open.douyin.com/platform/resource/docs/ability/content-management/douyin-publish-solution/

替代路径：系统生成抖音发布包，由人工在创作者中心发布；OpenClaw 只做草稿准备和检查，不做未经确认的最终发布。

## 小红书

用途：笔记发布包、标题、正文、封面建议、话题、店铺/小程序承接。

优先级：中。

获取路径：

1. 确认商家是否有专业号、店铺、小程序或官方服务商合作资格。
2. 如走小程序能力，完成主体认证、类目与备案。
3. 如需要笔记发布 API，联系小红书业务方或官方服务商确认是否定向开放。
4. 有权限后写入 `XHS_APP_ID`、`XHS_APP_SECRET` 或服务商 token。

官方入口：

- https://miniapp.xiaohongshu.com/

替代路径：系统生成笔记发布包，人工发布后回填链接和数据。

## 视频号 / 微信生态

用途：视频号发布包、评论区引导、微信小店/小程序/微信客服承接。

优先级：中。

获取路径：

1. 确认商家是否有视频号、公众号、小程序、微信小店或微信客服。
2. 内容发布先使用发布包和人工确认。
3. 交易和咨询优先接微信小店、小程序、微信客服或企业微信。
4. 有官方或服务商能力后写入 `WECHAT_APP_ID`、`WECHAT_APP_SECRET` 等配置。

官方入口：

- https://developers.weixin.qq.com/

替代路径：视频号助手人工发布，系统记录发布链接和指标，用企业微信承接客户咨询。

## 本机端口权限

Codex 沙箱会拦截本机端口监听。推荐只授权项目固定脚本：

```bash
./scripts/dev-server.sh 8791
```

不要为了方便开放任意 `node`、`python` 或 shell 脚本执行权限。固定脚本只会进入本项目目录并启动 `apps/api/src/server.mjs`，风险更小，也更容易审计。
