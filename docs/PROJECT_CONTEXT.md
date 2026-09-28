# 奇幻果园模块索引

- 果香绘色HD17：GameConfigPage活动配置，activity.flowerEmbroidery的领奖/勾玉刷新/任务栏解锁/三类守护/花绣商店；复用ActivityShopSettings，动态商品数量和价格由脚本当期读取。后端ActFlowerEmbroideryMgr，未新增种植优先级。见HANDOFF的2026-09-28条目及二次对齐说明。

- 配额转移：QuotaTransfer.vue为用户入口，admin/QuotaTransferAdmin.vue为管理入口，PointTransactionHistory.vue为个人/后台共用分页流水。见[QUOTA_TRANSFER.md](QUOTA_TRANSFER.md)。


## 2026-09-23：EVT v2 迁移

新增/接入 `evtClient.ts`、`evtHistoryStorage.ts`、`EvtTimeline.vue`；EVT 状态独立轮询，事件按模块分页加载。详见 [EVT-MIGRATION.md](EVT-MIGRATION.md)。

- 活动配置新增百果争鲜/穿丝绣锦，绣锦商店复用花园ActivityShopSettings.vue、activityShop.ts；目录为game-config/activityShopCatalogs.json。默认值/类型/归一化与分享schema保持同步，实际业务由qhgy-assistant的HdRewardMgr执行。
- 配置分享模块：src/features/config-share/，入口 src/pages/GameConfigPage.vue。
- 复用花园短码分享模块，详见 [功能手册](CONFIG_SHARE_MANUAL.md)。
