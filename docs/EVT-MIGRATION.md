# 奇幻果园 EVT v2 迁移（2026-09-23）

本仓库角色：front。本次标准以花园 `EVT-MIGRATION-GUIDE.md` 为基础，按用户要求将**所有模块**改为滚动最近 24 小时不限条数。杂货店不在本次范围。

## 存储与保留

- 状态只保存在账号子进程和 log_server 内存，经本机命名管道传输；这不是操作系统共享内存。不新增状态 JSON 或 Redis 持久化。状态变化合并发送与事件落盘机制独立。
- 事件立即追加到常驻文件流：脚本运行目录下 `logs/evt-events/<大区_账号>/<北京时间 YYYY-MM-DDTHH>.jsonl`（此处路径相对脚本仓库）。JSONL 只是每行一个 JSON 的流式文件格式，没有定时批量改写文件。
- 小时文件名采用北京时间，事件 `ts` 保持 Unix 毫秒；跨小时/跨日自动开新文件。安全转义不适合文件名的字符；旧 hash/UTC 目录和旧 EVT 文件只读兼容，不搬移、不重写。
- 查询严格过滤最近 24 小时；后台按完整小时、每小时清理一次，因此磁盘边界片段可能保留约 24–26 小时。清理只针对新 EVT 小时目录，旧兼容文件不会自动删掉。
- 停号/重启/零点不清空事件。状态进程重启后重新同步，不承诺恢复已停止账号的历史状态快照。已有业务 Record/Redis 存档和普通日志不是 EVT 状态，仍遵守原项目规则。
- 事件不按文件大小或条数裁剪。磁盘故障时队列和缓存仍有保护上限；无法接受的写入会报错，不承诺故障中无限堆积。正常账号子进程不缓存一整天事件。

## 接口与页面

脚本 log_server 提供 `/evt-state`、`/evt-history`、`/evt-stream-poll`；网站经 `/api/game-accounts/` 代理，先检查登录和账号归属，再转换网站账号 ID 为脚本账号 ID。

新前端分开读取状态与历史，按模块分页/增量补新记录，虚拟列表只渲染可见行。每页上限用于限制单次响应，不是全天保留条数上限。关闭弹窗释放视图；刷新失败保留已有记录，400/410 游标错误可恢复。普通文本日志的 2500 条规则不受 EVT 策略影响。

## 本项目适配

沿用实际 QHGY EventLogger → logger 入口。app 停号不再删除旧 EVT 文件。业务 mgr_cankao 不参与改造。

## 发布与验证

1. 脚本：在实际运行根目录安装仓库原有依赖，更新并重启 `log_server.js`，再重启账号子进程。脚本端和 log_server 必须属于同一部署路径/使用一致的 `EVT_STATE_ENDPOINT`；不同项目不可共用一个手动指定的管道名。
2. 网站后端：在 `server` 执行 `npm run build` 并重启服务。
3. 前端：执行 `npm run build`，发布 dist；织梦前端本次不更新。
4. 先验证少量账号的状态、真实事件、停启恢复和跨日分页，再逐步扩到生产规模。自动化检查使用临时文件和虚构账号，没有启动生产账号或购买操作。

复查命令：

```text
# 脚本实际运行根目录
node scripts/check-evt-state.mjs
node scripts/check-evt-history.mjs
node scripts/check-evt-routes.mjs
node scripts/check-evt-producer.mjs
# 网站后端 server 目录
node scripts/test-evt-proxy.cjs --script-root <脚本实际运行根目录>
node scripts/test-config-share.cjs
npm run build
# 新前端仓库（织梦除外）
node scripts/test-evt-history.mjs
node scripts/test-evt-browser.mjs
npm run build
```

六个脚本已通过 22 项状态、46 项历史、6 项路由检查及真实 logger/命名管道/HTTP 集成；六个 API 通过代理、配置回归和构建；五个前端通过 19 项检查、生产构建和实际浏览器 10000 条事件的滚动/锚点/筛选/窄屏测试。共享历史实现另以 210123 条事件验证完整分页和稀疏索引。水世界海商卡与花开业务布局有额外回归。

这些检查不等于 1200 个生产账号连续运行一天的容量验证。水世界原有 Docker/Redis 全流程测试在本机缺少 Docker，未执行；其 EVT 新链路已用实际本机 HTTP/管道和临时文件验证。
