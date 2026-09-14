# 配置短码分享功能手册（跨项目复刻）

版本：1；首次实现：2026-09-14；示例项目：杰尼龟～花园。

## 1. 用户操作与功能边界

进入游戏配置页，点击顶部“分享”。弹窗包含“生成分享码”和“导入分享码”。

1. 生成：取当前表单，包括未保存修改，按项目现有保存规则归一化后过滤敏感字段，提交给 Web API。服务端返回 16 位随机短码，成功后隐藏生成按钮，只显示分享内容和复制；失败可以重试，当前弹窗不提供“重新生成”。
2. 分享：点击“复制完整分享文本”，内容包含项目名、服务端生成时间、24 小时有效期、到期时间（UTC+8）和短码。复制失败可长按文本复制。
3. 导入：其他已登录用户粘贴整段分享文本或裸短码，点击“读取并预览”。显示各模块拟修改数量。
4. 应用：再次向服务端确认短码有效，基于最新表单重新计算后应用。成功后弹窗提醒核对并保存，用户必须点击“确定”关闭，点击遮罩或按 Esc 不会关闭。不会自动保存或启动游戏账号。
5. 生效：用户检查页面设置并点击原有“保存”；花园仍需停止再启动账号。

示意文本（示例短码无实际配置）：

```text
杰尼龟~花园~生成:2026-09-14 10:00:00~有效期:24小时~到期:2026-09-15 10:00:00(UTC+8)~aBcdEF12_345-789
```

生成后有效 24 小时，不是当天午夜过期；任何读取和导入都不会续期。到期后必须重新生成。Redis 数据被运维清理、淘汰或丢失也会导致提前不可用，不能把 TTL 当作持久备份承诺。

短码是随机查询编号，不是配置压缩结果。服务端保存有大小上限的 JSON，避免增加压缩/解压资源消耗。分享全文可读，拿到短码的已登录用户能读取其中的设置，不提供保密或作者身份认证。

仅分享功能设置，不分享账号对象、凭据、角色身份或运行记录。花园明确排除花市上架密码；好友/公会成员名单属于功能配置，会分享，并在生成页面提示。

## 2. 仓库与文件职责

前端仓库：`garden-webserver/garden-webserver`。

| 文件 | 职责 |
|---|---|
| `src/features/config-share/core.ts` | 不依赖框架/网络的协议、字段 schema、安全检查、字段合并、分享文本格式 |
| `adapter.ts` | 通用项目适配器接口 |
| `gardenProject.ts` | 花园项目 ID、名称、schema 生成与特殊列表/动态映射规则 |
| `garden.schema.json` | 自动生成的白名单，用于同步服务端及一致性检查 |
| `gardenAdapter.ts` | 花园现有配置归一化、关联冲突检查、变更分组 |
| `api.ts` | 复用现有鉴权 Axios，构造生成/读取请求 |
| `ConfigShareDialog.vue` | 通用 Vue + Ant Design Vue 弹窗，依赖注入项目适配器及 API |
| `src/pages/GameConfigPage.vue` | 顶部入口、传入当前配置、接收应用结果 |
| `scripts/sync-config-share.mjs` | 生成 schema，可同步共享 core/schema 到 Web API 仓库 |
| `scripts/test-config-share.mjs` | 兼容、安全、真实配置和 Vue 模板回归 |

Web API 仓库：`garden-web/garden-web`。

| 文件 | 职责 |
|---|---|
| `server/src/features/config-share/core.ts` | 从前端唯一来源同步的协议副本，禁止独立修改 |
| 同目录 `garden.schema.json` | 从前端同步的服务端字段白名单 |
| 同目录 `service.ts` | Redis 短码、24 小时 TTL、原子限流；注入项目、Redis、时钟和随机码生成器 |
| 同目录 `router.ts` | Express 路由工厂，注入鉴权；可信代理 IP 判断、错误响应、请求大小限制 |
| `server/src/routes/configShares.ts` | 花园项目与已有 dynamicRedisManager/authenticateToken 的接线 |
| `server/src/index.ts` | 在全局 JSON 解析前挂载分享路由 |
| `server/scripts/test-config-share.cjs` | 存储、限流、多实例、故障、实际本机 HTTP 回归 |

脚本端 `garden-assistant` 不参与短码存储或解析。导入保存后继续读取原有 `setting`，无需新增游戏协议或游戏管理器。

## 3. API 协议

必须使用站点正常用户登录凭据。分享者与接收者可以是不同用户。接口不列出所有分享码，不接受客户端指定 Redis key、TTL、项目任意路由或存储服务器。

### POST /api/config-shares

请求：

```json
{
  "format": 1,
  "project": "garden",
  "schemaVersion": 1,
  "config": { "basic": { "mail": true } }
}
```

返回 HTTP 201：

```json
{
  "success": true,
  "data": {
    "format": 1,
    "project": "garden",
    "schemaVersion": 1,
    "code": "aBcdEF12_345-789",
    "createdAt": 1789351200000,
    "expiresAt": 1789437600000
  }
}
```

时间是服务端生成的 Unix 毫秒数；生成响应不重复返回配置正文。

### POST /api/config-shares/resolve

```json
{ "project": "garden", "code": "aBcdEF12_345-789" }
```

返回 HTTP 200，`data` 包含上述元信息和白名单过滤后的 `config`。读取和最终应用都使用此接口；不发送目标账号 ID，也不修改账号配置。

| HTTP | 含义 |
|---|---|
| 400 | 格式、字段类型、项目或版本错误 |
| 401 | 未登录或凭据无效 |
| 404 | 短码不存在或已过期（统一提示，不泄露区别） |
| 413 / 415 | 请求过大 / 不接受压缩请求体 |
| 429 | 限流；返回 `Retry-After` 头和 `retryAfter` 秒数 |
| 503 | Redis 不可用、超时或存储异常；分享功能停止服务 |

所有响应为 `Cache-Control: no-store`。短码放在 POST 正文，不放查询字符串；不要在代理/WAF/APM中记录请求正文、配置或短码。

## 4. 兼容合同（必须保留）

采用字段路径 JSON，不采用依赖顺序的数组编码，也不需要历史默认模板压缩。

- 固定配置对象递归按已存在的叶子字段覆盖。
- 花园任务优先级是固定配置对象，各任务类型逐项合并；新增任务类型的优先级不会被旧码重置。
- 旧码没有的字段保留接收方现值，禁止先把旧码与最新默认值合并再覆盖。
- 已删除或当前不支持的字段忽略。错误类型拒绝，不猜测转换。
- `false`、`0`、空数组是有效值；数组和动态映射作为单个配置整体替换。
- 根项目 `project` 使用稳定机器 ID；展示前缀使用项目中文名。前端和服务端都检查项目，不能只靠文案判断。
- 普通新增/删除字段保持 `schemaVersion=1`，新增字段从当前默认配置进入 schema，旧记录天然兼容。
- 字段重命名、类型/语义变化不能直接复用旧路径：在项目适配层增加显式旧版本迁移，并保留旧版本解析，直到旧码全部过期；必要时提升 schemaVersion。当前未实现任何假想 v2 迁移，未知版本直接拒绝。
- 协议封装变化提升 `format` 并保留对应解码器，不能把任何未知版本按当前版本猜读。
- 花园归一化可能联动其他设置，因此比较导入前后的归一化结果。若会影响码中没有的字段，拒绝并提示关联冲突；只投影码中已有字段回表单，不能静默重置新增设置。

例：旧码只有自动收邮件，新页面增加元宝刷新档位。接收方选择 16 元宝，导入后档位仍为 16 元宝。

“旧码兼容”指在记录有效期间，页面升级仍可导入；不代表超过 24 小时仍能找回配置。

## 5. Redis Cluster 复用

复用 `dynamicRedisManager.getRedisClient('127.0.0.1')`。现有 `USE_REDIS_CLUSTER=true` 时该方法返回共享 Cluster 客户端；单机模式沿用已有本地 Redis 连接。分享功能不会读取用户传入的服务器地址或建立另一套 Cluster。

当前 redis 5.x 驱动的 Cluster 客户端只有 `isOpen`，没有单机的 `isReady`。接线通过 `availableShareRedis` 区分两者；不能直接用 `client.isReady` 判断 Cluster，否则会将已连接集群误判为不可用。测试覆盖安装版本的实际客户端接口，但不会连接网络。

Key：

```text
config-share:garden:v1:data:<16位随机码>
config-share:garden:v1:limit:<限流作用域>:<用户/IP摘要>
```

- 随机码使用 Node `crypto.randomBytes(12).toString('base64url')`，96 位随机量；禁止 Math.random、时间戳、递增 ID。
- `SET key json EX 86400 NX`，碰撞最多重试 3 次，不覆盖已有记录。
- 读取只用 GET，同时检查记录内 expiresAt；不延长 TTL，不依赖用户修改后的前缀日期。
- 限流使用单 key Lua 一次完成计数和 TTL。每次 EVAL 仅访问传入的一个 key，没有跨槽事务；不同限制分别执行，不需要把所有数据挤在同一 hash slot。
- 不用 KEYS、全库扫描、定时清理或逐条删除。所有数据和限流 key 都有过期时间。
- Redis 断连或超时返回 503；禁止回退成无额度的进程内 Map。单次服务操作超时 2.5 秒。
- 额度上限限制分享记录增长，但共用 Cluster 仍需观察内存、淘汰策略、延迟和业务负载。大规模流量应在网络入口拦截，不能只靠业务 Redis 计数。

## 6. 限流与输入防护

当前默认值集中在 `service.ts` 的 `SHARE_LIMITS`，窗口从第一条计数开始，有独立 TTL：

| 作用域 | 限制 |
|---|---|
| 分享入口所有请求（鉴权前），全项目 | 600 次 / 60 秒 |
| 分享入口所有请求（鉴权前），单 IP | 120 次 / 60 秒 |
| 生成，单用户 | 5 次 / 60 秒、20 次 / 24 小时 |
| 生成，全项目 | 60 次 / 60 秒、2000 次 / 24 小时 |
| 读取，单用户 | 30 次 / 60 秒 |
| 读取，全项目 | 300 次 / 60 秒 |

无效短码、错误配置等尝试也消耗额度；多实例使用相同 Redis key，不能切换 API 实例绕过。最终应用额外读取一次，也计入读取额度。额度是默认起点，应结合监控调整，不是针对所有规模的保证。

顺序：独立路由 → 全局/IP限制 → 已有登录鉴权 → 用户/操作额度 → JSON解析 → 白名单验证 → 存取。不要把此路由移到全局 `express.json()` 后面。已有 HMAC 门在路由之后，此功能的安全边界是服务端登录校验和限流，不依赖前端可读取的签名秘密。

- HTTP 正文最大 64 KB；不接受 gzip 等压缩请求体。
- 配置 JSON 最大 48 KB，字符串最长 256 字符，列表最多 1024 项，对象最多 512 个键，深度最多 12，总节点最多 12000。
- 解析前端分享文本最多 512 字符，裸码必须严格匹配 16 位 Base64url 字符集。
- 全层级禁止 `__proto__`、`constructor`、`prototype`，包括未知字段内部；不直接 deepMerge 用户输入。
- schema 显式允许字段，敏感命名另行排除；新项目要审查默认配置中的身份、凭据和私人信息，不能只相信正则过滤。
- 不动态执行配置、不渲染分享中的 HTML、不记录原始分享内容。

### 代理 IP 配置

当前应用全局存在 `trust proxy=true`，分享模块不直接信任 `req.ip` 或任意 X-Forwarded-For。

`CONFIG_SHARE_TRUSTED_PROXY_IPS` 是允许代理的**精确地址列表**，英文逗号分隔，默认只含回环地址。仅当 TCP 对端属于列表且 `X-Real-IP` 是合法 IP 时才使用它，否则按 TCP 对端限流。

部署在 Docker/反代时，配置实际代理地址，并确保该代理**覆盖** `X-Real-IP`，禁止客户端绕过代理直连后端。现有 Nginx 示例已有 `proxy_set_header X-Real-IP $remote_addr`。不应直接把客户端 X-Forwarded-For 的第一项作为限流 IP。若尚未配置代理地址，代理后所有访问会共享一个 IP 桶，安全但可能误限流。

### 保存配置的已有接口

`gameAccounts.ts` 的 PUT setting 路由补接现有 `saveConfigRateLimit`（单用户 5 秒冷却），仍执行登录和账号归属校验。该旧限流器沿用项目既有 Redis 故障放行策略，与分享功能故障时返回 503 的策略不同；本次未改其他账号操作、全局网关或已有登录策略。

## 7. 其他项目复刻步骤

1. 先读目标项目 AGENTS/架构/配置保存规则，检查工作树并按要求拉取。找到其真实前端、Web API、鉴权和 Redis 连接，不要误接游戏账号 Redis 或重写连接管理器。
2. 复制前端 `core.ts`、`adapter.ts`、`api.ts`、`ConfigShareDialog.vue`；在非 Vue 项目只复用 core 与协议，重写 UI。
3. 新建 `<project>Project.ts`：设置唯一稳定 projectId、中文名称、schemaVersion；从该项目默认配置生成白名单。为所有空数组、动态映射补充类型。花园的 ID/名单命名规则只是示例，不能直接套用到任意项目。
4. 新建 `<project>Adapter.ts`：复用目标项目现有校验和归一化；保留缺失字段；验证归一化不会间接修改缺失字段。按照目标页面模块生成变更摘要，并提供项目专属 `privacyNotice` / `applyNotice` 提示，通用弹窗不硬编码花园名称或业务规则。
5. 在页面放一个分享入口，注入 current、adapter、api；apply 只替换表单，仍走用户主动保存。保持已有账号授权、保存流程和启动规则。
6. 复制服务端 `service.ts`、`router.ts` 和同步的 core/schema。用目标项目鉴权函数、Redis provider、可信代理名单创建路由。路由工厂不依赖花园项目名；同一 Cluster 内必须用不同 projectId。
7. 调整同步脚本输入和输出文件名；core/schema 必须有一个唯一来源及副本一致性检查。不要分别手改两端 schema，也不要从浏览器上传“允许字段列表”让服务器相信。
8. 在全局正文解析前挂载 `/api/config-shares`。保留限流、大小限制、no-store、错误状态和服务不可用策略；给已有保存接口补足服务端限流和归属检查。
9. 复刻本手册第 8 节验收，先上线服务端再上线前端。不把任何真实账号、密码、完整日志作为样本提交。

## 8. 开发与发布检查

花园前端执行（服务端路径可换）：

```powershell
node scripts/sync-config-share.mjs --server-root J:/CodeBuddy/garden-web/garden-web
node scripts/sync-config-share.mjs --check --server-root J:/CodeBuddy/garden-web/garden-web
node scripts/test-config-share.mjs
node scripts/test-fml-race-accept-rules.mjs
npm run build
```

`prebuild` 自动更新前端 schema；新增设置时，要在发布前同步 Web API 副本并运行 `--check`。仅更新前端会使新字段被旧服务端忽略。CI 应把跨仓副本检查作为发布门禁。

Web API 的 `server/` 目录执行：

```powershell
node scripts/test-config-share.cjs
npm run build
```

必须验证：跨用户分享、24小时到期、读取不续期、旧码缺少新增字段、false/0/空列表覆盖、密码排除、错误项目/版本、类型错误、原型污染、超大输入、并发限流、每日额度、Redis故障、伪造IP头、过期后应用失败，以及应用后仍需保存。

本地测试使用 Redis 替身和实际本机 HTTP 请求，不连接线上账号/Cluster，不验证生产 Redis 故障转移。部署验收需使用独立测试用户检查真实 Cluster TTL、可信代理 IP 和 429；应在测试环境模拟时钟，不等待或修改真实用户的记录。

首次验收：前端16组回归（含真实Vue弹窗的内存渲染宿主交互）、服务端10组回归、既有竞赛配置回归、两端常规构建通过。显式前端全量类型检查与修改前HEAD对比同为41条既有错误，无新增；普通build中的vue-tsc命令未显式指定app工程，不能据此声称完整类型检查零错误。没有可用浏览器时仅验证模板和逻辑，手机布局仍需实际浏览器验收。

来源：[Redis SET](https://redis.io/docs/latest/commands/set/)、[Redis EVAL](https://redis.io/docs/latest/commands/eval/)、[Express 代理信任](https://expressjs.com/en/guide/behind-proxies/)、[OWASP 拒绝服务防护](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)。
