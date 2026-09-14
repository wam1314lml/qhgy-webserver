# 奇幻果园配置分享功能手册

本项目复用花园已完成的模块（前端来源 garden-webserver e0552c8，Web API 来源 garden-web 9b06927），没有新建 Redis 连接或重新实现短码服务。原花园完整说明保存在 [复用参考](CONFIG_SHARE_REFERENCE.md)，以下差异以本项目代码为准。

## 使用

配置页点击“分享”，生成当前设置的短码（包含未保存修改）。成功后只显示分享文本、生成/到期时间及复制，无“重新生成”按钮。前缀为“杰尼龟~奇幻果园~生成日期~有效期:24小时~到期时间~短码”，实际格式以生成文本为准。

导入支持完整分享文本或裸 16 位短码，读取后预览变更，点击应用时再次验证时效。应用到表单后显示确认弹窗，只能点击“确定”关闭；用户仍须核对并点击原页面“保存”，随后按原流程停止再启动账号。

只覆盖分享码中存在、当前仍支持的配置字段；旧码缺失的新字段保持接收方当前值。false、0、空列表有效；固定对象逐叶合并，数组/动态映射整体替换。跨字段归一化若影响码中没有的设置则提示冲突。旧码兼容仅限其 24 小时有效期内。

## 文件与复用边界

- 前端：J:/CodeBuddy/qhgy-webserver/qhgy-webserver；Web API：J:/CodeBuddy/qhgy-web/qhgy-web。
- src/features/config-share/ConfigShareDialog.vue、adapter.ts、api.ts 直接复制花园；projectAdapter.ts 从花园适配器提取为工厂，页面注入原有归一化逻辑。
- project.json 定义稳定 ID qhgy、展示名、schemaVersion、显式类型覆盖与排除字段；project.schema.json 自动生成，不手改。
- scripts/config-share-schema.mjs 从页面实际 ref<GameConfig> 的类型（支持独立类型文件）生成白名单。没有复制另一套默认值。新增配置需同步现有 GameConfig 类型；不明确的 any/混合 JSON 类型必须在 project.json 显式描述，不能默认放行。
- scripts/sync-config-share.mjs 沿用花园同步流程，prebuild 自动生成前端 schema；发布时必须同步 Web API 的 core.ts/project.schema.json 并执行 --check。
- Web API 的 service.ts、router.ts 直接复制花园。routes/configShares.ts 只替换项目 schema，复用 authenticateToken 和 dynamicRedisManager；index.ts 在全局 JSON 解析前挂载接口。保存配置接口复用原有 saveConfigRateLimit。

项目适配：复用 normalizeGameConfigSelects 与竞赛分数校验；花市上架密码排除。

通用协议仅做必要适配：Token/Secret 的凭据匹配收窄，防止误删游戏业务开关；新增 scalar 支持页面字符串/数字联合类型，json 仅用于明确声明的高级 JSON 字段，继续执行大小、深度、危险键和递归凭据检查。动态映射键中的凭据同样过滤。未加入本轮已取消的额外 CC 防护。

## 接口与存储

接口仍为 POST /api/config-shares 和 POST /api/config-shares/resolve，沿用登录凭据。项目 ID 同时用于协议验证和 Redis key 命名，六个项目互相隔离，不允许跨项目导入。

复用现有 Redis/Cluster，SET EX 86400 NX，读取不续期。沿用花园现有限流：入口全局 600/分钟、IP 120/分钟；生成单用户 5/分钟和20/24小时、项目 60/分钟和2000/24小时；读取单用户30/分钟、项目300/分钟。保留正文64KB、配置48KB等限制。没有添加额外进程内CC模块。

配置不包含登录凭据或密码，好友名单等业务设置会分享；只发给需要的人。CONFIG_SHARE_TRUSTED_PROXY_IPS 与花园用法一致，部署时配置真实可信代理地址并覆盖 X-Real-IP。

## 开发、验证与发布

前端运行：

```powershell
node scripts/sync-config-share.mjs --server-root J:/CodeBuddy/qhgy-web/qhgy-web
node scripts/sync-config-share.mjs --check --server-root J:/CodeBuddy/qhgy-web/qhgy-web
node scripts/test-config-share.mjs
npm run build
```

Web API 的 server 目录运行：

```powershell
node scripts/test-config-share.cjs
npm run build
```

前端回归直接提取实际页面的默认配置和归一化依赖，复用花园真实 Vue 内存渲染交互测试；服务端复用花园10组回归，改为当前项目有效字段样例。没有连接真实用户或线上Redis。先发布 Web API，再发布前端，并使用测试账号验收真实 Cluster TTL、代理配置及手机显示。

复制到其他项目时，先拉取目标前端，再复制模块与脚本，仅调整 project.json、类型覆盖、页面归一化注入及现有鉴权/Redis接线。不要把此项目的账号配置、名单或运行日志当作模板。
