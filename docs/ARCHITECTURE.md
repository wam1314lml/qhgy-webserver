# 奇幻果园配置分享架构

## 2026-09-23：EVT v2 迁移

EvtClient → 独立状态/历史接口 → 内存 EvtHistoryStore → EventCardView + DynamicScroller 虚拟时间线。页面仅保存已加载历史，不写入整天 localStorage。详见 [EVT-MIGRATION.md](EVT-MIGRATION.md)。

配置页 → 通用分享弹窗 → 项目适配器与既有归一化 → 原 Axios 鉴权 → Web API 分享路由 → 原 Redis/Cluster。

项目 ID 为 qhgy；导入只改表单，保存仍走原接口。前端维护字段schema，后端采用通用存储；普通新增字段不再同步服务端schema，游戏脚本无需新增分享协议。
