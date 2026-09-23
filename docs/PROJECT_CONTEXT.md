# 奇幻果园模块索引

## 2026-09-23：EVT v2 迁移

新增/接入 `evtClient.ts`、`evtHistoryStorage.ts`、`EvtTimeline.vue`；EVT 状态独立轮询，事件按模块分页加载。详见 [EVT-MIGRATION.md](EVT-MIGRATION.md)。

- 活动配置新增百果争鲜/穿丝绣锦，绣锦商店复用花园ActivityShopSettings.vue、activityShop.ts；目录为game-config/activityShopCatalogs.json。默认值/类型/归一化与分享schema保持同步，实际业务由qhgy-assistant的HdRewardMgr执行。
- 配置分享模块：src/features/config-share/，入口 src/pages/GameConfigPage.vue。
- 复用花园短码分享模块，详见 [功能手册](CONFIG_SHARE_MANUAL.md)。
