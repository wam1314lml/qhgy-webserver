# 奇幻果园模块索引

## 2026-10-22 公会图标目录

src/data/guild-artwork.json记录本项目徽章/称号ID到原生资源的映射，public/guild-overview/qhgy-wechat-40/包含29张PNG和来源校验清单。AccountGuildSummary与accountGuild复用原公会快照，仅更新展示；scripts/test-guild-artwork.mjs校验组合及资源完整性。

## 2026-10-22 角色卡公会摘要

新增 `src/components/AccountGuildSummary.vue` / `src/utils/accountGuild.ts`；由ScriptConfig复用账号记录里的guild完整快照，显示公会三态及竞赛次数；没有新增API或轮询。

- 宠物狗狗（2026-10-15）：GameConfigPage基础页，兼容basic.feedCat，新增首次指引autoGuide和已结算记录autoReadLog；类型/默认/归一化/分享schema配套，宠物组手机标签独立布局。执行端为果园PetMgr及QhgyBusinessBootstrap，无新Web API；见HANDOFF对应条目。

- 公会商店（2026-10-12）：GameConfigPage公会页新增FmlShopSettings，配置union.fmlShop；36种果园商品、五种条件、排序/余额保留/解锁/刷新。脚本FmlShopConfig为规则源，生成前端规则/目录，类型/默认值/归一化/分享schema同步。无新Web API。

- 果香绘色HD17：GameConfigPage活动配置，activity.flowerEmbroidery的领奖/勾玉刷新/任务栏解锁/三类守护/花绣商店；复用ActivityShopSettings，动态商品数量和价格由脚本当期读取。后端ActFlowerEmbroideryMgr，未新增种植优先级。见HANDOFF的2026-09-28条目及二次对齐说明。

- 配额转移：QuotaTransfer.vue为用户入口，admin/QuotaTransferAdmin.vue为管理入口，PointTransactionHistory.vue为个人/后台共用分页流水。见[QUOTA_TRANSFER.md](QUOTA_TRANSFER.md)。


## 2026-09-23：EVT v2 迁移

新增/接入 `evtClient.ts`、`evtHistoryStorage.ts`、`EvtTimeline.vue`；EVT 状态独立轮询，事件按模块分页加载。详见 [EVT-MIGRATION.md](EVT-MIGRATION.md)。

- 活动配置新增百果争鲜/穿丝绣锦，绣锦商店复用花园ActivityShopSettings.vue、activityShop.ts；目录为game-config/activityShopCatalogs.json。默认值/类型/归一化与分享schema保持同步，实际业务由qhgy-assistant的HdRewardMgr执行。
- 配置分享模块：src/features/config-share/，入口 src/pages/GameConfigPage.vue。
- 复用花园短码分享模块，详见 [功能手册](CONFIG_SHARE_MANUAL.md)。
