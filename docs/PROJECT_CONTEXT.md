## 2026-11-08 共享文档：30分钟无操作退出与公告免提示

验证：31类空闲行为、10类公告日期/存储检查、计时模块严格类型检查、生产构建和9项真实浏览器计时/重登检查通过。另8项实际公告重登/次日00:00恢复/用户隔离/取消勾选及1280、320px布局检查通过。均使用本地合成接口，未访问真实账号。


来源：[网页-小程序端](https://www.kdocs.cn/l/crvsFVHkJmqi)，本轮读取2页正文及公告标注图；其余项目标题下无新增独立需求。不新增游戏配置字段。

- 登录空闲计时统一为30分钟。真实点击、鼠标移动、触摸、键盘输入、表单变更及滚轮操作更新最后活动时间；自动轮询、程序触发事件、程序滚动和单纯切回窗口不续时。后台挂起/休眠恢复先核对期限，再允许继续操作。
- `utils/idleLogout.ts`集中管理监听及计时；按项目与用户存储最后活动时间，同源多标签页共享操作时间。刷新/恢复已登录页面不绕过已过期会话；真正登录成功才重置计时。退出后清理监听/定时器，不清除公告免提示偏好；存储写失败时仍保留内存计时。保持原有认证失效/维护窗口处理，不伪造续期、不忽略401、不增加心跳请求。
- 登录公告右下角“今日不再提示”勾选即生效，同设备/项目/用户重登重开保留；北京时间次日00:00恢复，取消勾选撤销。沿用现有公告接口、内容清理及显示时长。果园/杂货店/赘婿本轮补齐，其余项目保留先前实现。
- 小程序没有对应的网页自动退出计时，本轮不新增；花园/寻道小程序此前公告免提示保持，未重新上传。
- 本轮保留所有原有未提交改动；仅本地维护，未提交、推送或部署。线上后台令牌期限、真实会话连续性仍需配套联调，不能将本地模拟验收当作线上已更新。

## 2026-11-07 水果库存品质视图

新增utils/fruitInventoryQuality.ts，统一品质选项、名称、归一化及排序类型，供EventCardView/FruitInventoryGrid静态复用。水果库存“按品质”支持全部/单品质、组内库存升降序及分组标题；复用现有水果图片、快照、搜索与完整复制，无新API或脚本字段。tools/check-inventory-quality-ui.py验证正式dist，产物放node_modules/.cache/inventory-quality-20261107。

## 2026-11-07 仲夏夜之梦七日福利与勾玉礼包

现有GameConfigPage活动页新增hd3013SignEnabled/hd3013GiftEnabled两开关及对应默认、类型、归一化、分享schema；七日签到独立，礼包依赖原任务/抽奖并经勾玉确认。复用通用setting API，无新页面或后端路由。配套脚本HdRewardMgr负责520停购、限购余额和实际协议，MCP实时核验待连接恢复；验证记录见HANDOFF。

## 2026-11-02 二级代理界面角色定义

新增 `src/utils/agentRoles.ts`，统一 vip1/vip2/vip3 的界面身份判断；路由、TopNavBar、AgentManagement、PerformanceManagement 与 AdminPanel 共用。`scripts/test-agent-vip3.mjs` 验证实际入口/角色标签/目标保护/旗下操作并编译相关 SFC。无新页面或接口，后端配套权限修复与发布说明见 HANDOFF 同日节。

## 2026-11-02 按账号渠道读取配置目录

新增 game-config/channelCatalog.ts、accountPlatform.ts 和独立 zfb/ 生成目录。platform=1/'1' 用支付宝库，其余默认微信；配置页与64地页、picker、果灵规则、归一化及分享/复制共用。setting 顶层platform来自Web API账号表，旧API兼容/list。生成器 --channel zfb 与脚本 export/qhgy-database-zfb 配套；详情及验证见AI_CONTEXT、HANDOFF同日节。

# 奇幻果园模块索引

## 2026-10-31 万圣节水果与果艺目录

generate-qhgy-game-config-options从脚本同源导出生成288水果/47花瓶/715果艺，新增万圣幻夜及两套配方；sync-fruit-artwork从当前MCP资源索引同步288张原生图。生成目录、fruit-artwork和sources.json配套更新，无新API或配置字段。校验及原有果灵title/ID约束见AI_CONTEXT和HANDOFF同日节。

## 2026-10-31 万圣狂想设置

GameConfigPage活动页新增万圣狂想四独立开关，支持七日签到、任务/进度领奖、自动捣蛋及520停购。activity.hdReward默认、类型、归一化与分享schema配套，礼包复用勾玉确认和捣蛋依赖。执行端HdRewardMgr使用HD1002，验证见test-halloween-activities.mjs和check-halloween-ui.py。

## 2026-10-29 管理面板模块授权

AdminPanel.vue、AdminPanelPermissions.vue、QuotaSettings.vue、TopNavBar.vue统一按服务端有效权限控制入口及模块；所有29个管理页签对应后端30项授权目录（含合并展示的统计/月报）。scripts/test-admin-permissions-browser.py提供生产dist的真实浏览器验证，不访问线上接口。详情见AI_CONTEXT及HANDOFF同日节。

## 2026-10-29 缤纷果趣设置

GameConfigPage活动页新增缤纷果趣的合成、领奖、自动升倍上限和独立临期商店；activity.actBfgq默认/类型/归一化/分享schema同步。ActivityShopSettings按商品目录显示尾款兑换名称，缤纷果趣为百果券。执行端ActBfgqMgr，前端136组专项、真实页面保存及三种宽度验证见HANDOFF同日节。

## 2026-10-29 御前献珍设置

GameConfigPage活动页新增御前献珍四开关：宫廷委托领奖、特选优先/普通最高库存水果进贡、独立金币筹办贡运、可选勾玉刷新。activity.imperialTribute类型/默认/归一化/分享schema配套，复用付费确认和现有配置保存。执行端为ActImperialTributeMgr，详细规则及验证见AI_CONTEXT、HANDOFF同日节。

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
