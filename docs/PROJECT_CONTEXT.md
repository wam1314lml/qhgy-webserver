# 奇幻果园模块索引

## 2026-10-29 御前献珍设置

GameConfigPage活动页新增御前献珍三开关：宫廷委托领奖、最高库存水果进贡、可选勾玉刷新。activity.imperialTribute类型/默认/归一化/分享schema配套，复用付费确认和现有配置保存。执行端为ActImperialTributeMgr，详细规则及验证见AI_CONTEXT、HANDOFF同日节。

## 2026-10-27 果灵展示身份持续约定

elfOptions由脚本QhgyElfIdentity同源导出生成完整显示名称与ELF_IDENTITIES，elfPlantOptions为可种组合子集。GameConfigPage种植和好友两处共用“系列title+名称+真实ID”身份，旧选择与警告不丢系列。后续库更新使用生成器--only-elves同步两份目录，字段完整性校验必过；详见AI_CONTEXT本日节。

## 2026-10-27 果灵种植选择

新增src/pages/game-config/elfPlantOptions.ts（有效图鉴组合目录）与elfPlantRules.ts（保留已选ID、选项和解释），GameConfigPage及原配置归一化共用。生成器支持--only-elf-plants，只更新种植组合；完整elfOptions仍供好友偷取。空选/有效指定/全无效行为及验证见AI_CONTEXT、HANDOFF本日节，无新配置字段或API。

## 2026-10-23 水果库存图鉴

新增FruitImage.vue、FruitInventoryGrid.vue，由EventCardView的水果库存全部六个分类及独立折叠区使用；src/data/fruit-artwork.json与public/fruit-icons/保存270张果园原图及来源清单，scripts/sync-fruit-artwork.mjs维护。消费原EVT每行cultivated字段，支持名称搜索和六视图，不新增API或轮询，详细合同见HANDOFF。

## 2026-10-22 公会图标目录

src/data/guild-artwork.json记录本项目徽章/称号ID到原生资源的映射，public/guild-overview/qhgy-wechat-40/包含29张PNG和来源校验清单。AccountGuildSummary与accountGuild复用原公会快照，仅更新展示；scripts/test-guild-artwork.mjs校验组合及资源完整性。

## 2026-10-22 角色卡公会摘要

新增 `src/components/AccountGuildSummary.vue` / `src/utils/accountGuild.ts`；由ScriptConfig复用账号记录里的guild完整快照，显示公会三态及竞赛次数；没有新增API或轮询。

- 仓库开材料（2026-10-22）：GameConfigPage基础页，basic.bag.openMaterials总开关，五种果园道具，默认关闭。类型/默认/归一化/分享schema同步，执行端BagMgr，无新Web API。验证tools/check-bag-ui.py和分享用例。

- 好友处理（2026-10-22）：GameConfigPage种植页，plant.friend五项申请/上限/清理配置；类型/默认/归一化/分享schema及手机布局配套，果园FriendMgr执行，无新Web API。验证tools/check-friend-ui.py及scripts/test-config-share.mjs。

- 宠物狗狗（2026-10-15）：GameConfigPage基础页，兼容basic.feedCat，新增首次指引autoGuide和已结算记录autoReadLog；类型/默认/归一化/分享schema配套，宠物组手机标签独立布局。执行端为果园PetMgr及QhgyBusinessBootstrap，无新Web API；见HANDOFF对应条目。

- 公会商店（2026-10-12）：GameConfigPage公会页新增FmlShopSettings，配置union.fmlShop；36种果园商品、五种条件、排序/余额保留/解锁/刷新。脚本FmlShopConfig为规则源，生成前端规则/目录，类型/默认值/归一化/分享schema同步。无新Web API。

- 果香绘色HD17：GameConfigPage活动配置，activity.flowerEmbroidery的领奖/勾玉刷新/任务栏解锁/三类守护/花绣商店；复用ActivityShopSettings，动态商品数量和价格由脚本当期读取。后端ActFlowerEmbroideryMgr，未新增种植优先级。见HANDOFF的2026-09-28条目及二次对齐说明。

- 配额转移：QuotaTransfer.vue为用户入口，admin/QuotaTransferAdmin.vue为管理入口，PointTransactionHistory.vue为个人/后台共用分页流水。见[QUOTA_TRANSFER.md](QUOTA_TRANSFER.md)。


## 2026-09-23：EVT v2 迁移

新增/接入 `evtClient.ts`、`evtHistoryStorage.ts`、`EvtTimeline.vue`；EVT 状态独立轮询，事件按模块分页加载。详见 [EVT-MIGRATION.md](EVT-MIGRATION.md)。

- 活动配置新增百果争鲜/穿丝绣锦，绣锦商店复用花园ActivityShopSettings.vue、activityShop.ts；目录为game-config/activityShopCatalogs.json。默认值/类型/归一化与分享schema保持同步，实际业务由qhgy-assistant的HdRewardMgr执行。
- 配置分享模块：src/features/config-share/，入口 src/pages/GameConfigPage.vue。
- 复用花园短码分享模块，详见 [功能手册](CONFIG_SHARE_MANUAL.md)。
