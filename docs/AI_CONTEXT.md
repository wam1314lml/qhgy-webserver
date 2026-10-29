## 2026-10-29 御前献珍金币与特选优先

activity.imperialTribute新增goldTributeEnabled默认false，只接受true，独立于水果进贡和勾玉刷新。界面为“筹办贡运金币提交”，说明当前30/60/90/120万四档共300万，余额不足或末档完成停止，金额以服务器为准；不使用广告/勾玉/CD。水果提示改为每品质优先足够库存的当期特选，再普通最高库存，红色广告规则不变，旧配置开启tributeEnabled即用新优先级，无额外策略开关。默认/类型/normalize/分享schema同步，旧分享码含御前献珍但无金币键仍保留接收方当前金币开关。26组专项、16组分享、真实页面独立金币保存重载及1100/390/320布局、生产构建通过；执行端细节和真实写响应边界见脚本QHGY_IMPERIAL_TRIBUTE_HANDOFF。

## 2026-10-29 新果、新果艺静态数据

脚本当前TableMgr同源导出生成284水果、46花瓶、713完整果艺选项。新增新绿/晨金/暮紫四叶草、油柑、虎尾兰、红绡玉露、霓裳醉乐、山河映月、贵妃醉酒，配套荔满琼筵521401和华清醉晚542401。51061官方新名广佛手及九条配方材料名同步；全部旧选项ID保留。原生水果图片白名单284项，新增9张取当前MCP subAsync索引，旧275张未变；52102/52103/52104仍缺官方资源并使用占位。全量生成执行果灵title/ID校验，96完整果灵/36种植组合保持原内容，不能因更新回退裸名称或替换旧指定。1043选项逐项来源核对、284图片哈希及新图目视检查通过，无配置字段或Web API变化。

## 2026-10-29 缤纷果趣

activity.actBfgq为独立活动配置：enabled默认false、autoClaimReward默认true、maxMultiple默认100，支持1/5/10/25/100；自动选择已解锁且不超过上限的档位，积分门槛取本期配置。shop独立默认false，提前5分钟、默认百果券1101，可选加速卡1010/随机培育材料1004，尾款转百果券（本期不足20币保留），没有金币商品。ActivityShopSettings尾款提示从目录读取商品名，原其他商店仍显示金币。关闭合成保留倍率/领奖子项并禁用控件，商店仍可开。类型/默认/normalize/schema及保存分享同步，Web API无需改动。手机bfgq-settings标签整行，宽文本选择器复用现有能力。脚本为ActBfgqMgr，真实写回包及物理模拟边界见脚本QHGY_BFGQ_HANDOFF，不能将合成API浏览器测试视作实号验证。

## 2026-10-29 御前献珍

activity.imperialTribute新增taskRewardEnabled/tributeEnabled/jadeRefreshEnabled，均默认false且严格布尔。宫廷委托领奖独立，进贡按品质取已培育最高库存，前三次优先红色并使用服务器广告；勾玉默认关闭，需进贡开启，沿用付费确认，关闭进贡保留子项。免费广告用完后按服务器6小时冷却等待，不能把金币筹办贡运或每日御贡混入该设置。类型/默认/normalize/生成schema同步，旧分享码缺字段保值。手机标签整行；配套ActImperialTributeMgr和协议边界见脚本QHGY_IMPERIAL_TRIBUTE_HANDOFF，Web API无需改动。验证test-imperial-tribute.mjs与tools/check-imperial-tribute-ui.py。

## 2026-10-28 悦果序曲

activity.actCyclicStory沿用旧配置路径，总开关/refreshEnabled/shop.enabled默认false且严格布尔。maxFinshCntPerBatch显示“停止交单积分”，0不限、0–9999999整数，按累计积分而非订单数；达标仍领奖及独立临期兑换。shop默认提前5分钟/水滴5，选项1010/5/1101/2是奖励物品ID，服务端本期决定商品行ID与价格；旧码缺shop保留当前值。种植优先级显示悦果序曲但保留旧键莳花纪闻和原值，0不补种，默认3与脚本对齐。勾玉刷新清CD不换水果，复用确认弹窗；关闭自动交单保留子项，商店独立。新组手机标签整行，ActivityShopSettings可选wide沿用CustomSelect宽文本能力，其余商店默认样式不变。验证scripts/test-cyclic-story.mjs、tools/check-cyclic-story-ui.py与原分享/构建；脚本协议和实号边界见对应QHGY_CYCLIC_STORY_HANDOFF。

## 2026-10-27 重新开放新增账号微信扫码

当前用户要求恢复 `AddAccountModal` 的微信渠道（platform=3）扫码：展示二维码、等待/已扫码/过期/失败状态，复用原 `/wx/qrcode`、`/wx/poll`、`/wx/cancel`、`/bind_wx` 流程。转换教程及处理器守卫仅限抖音（platform=2），覆盖2026-10-08对微信的禁用约定；默认账号密码、0/1/2/3顺序与已有账号重认证保持。浏览器只持短期flow_id，绑定仅传flow_id/server_id，不恢复客户端游戏凭据。渠道及密码专项从实际组件提取转换条件，避免模拟条件仍拦截微信；真实Vue浏览器专项覆盖获取失败重试、过期重扫、选服绑定、返回取消和1280/390/320布局。

## 2026-10-27 果灵系列title/ID必须持续保留

用户要求所有果灵展示统一`【系列title】名称（ID：真实物品ID）`，以区分旧210111摩羯·汐月星帘与新210311甜苹华舞。完整elfOptions（好友）、有效elfPlantOptions（种植）、已选标签、警告和title提示都必须携带身份，不能只改种植下拉。配置值仍只存原ID，不能按同名迁移。旧项明确“当前图鉴未收录有效种植组合”，描述只用于显示旧主副果，不恢复为可种。

后续每次database/前端更新先在脚本执行export-qhgy-database，再执行本仓`node scripts/generate-qhgy-game-config-options.mjs --only-elves`（全量生成也可）；同步两个果灵目录。导出必须有title/titleSource/displayName、bookEntries.title，缺字段或不匹配的title/ID会使生成失败。完整ELVES现在是带身份的显示名，ELF_IDENTITIES保留系列及来源；勿手改生成文件或恢复裸名称。此前同日“完整elfOptions不改”仅保留ID集合与业务范围，标签以本节为准。验证19组指定/16组分享、真实种植及好友页面的1100/390/320布局和生产构建。

## 2026-10-27 指定果灵必须区分有效种植组合

种植选择使用独立elfPlantOptions，由fruit-elves.json的非隐藏、主副果ID完整bookEntries生成；完整96项elfOptions仍供好友偷取，不能用物品存在代替可种图鉴。当前36个有效组合，标签包含主副果和ID；210111与210311虽同名汀南暖熹果灵，当前只有210311可种，不能按同名自动迁移。

normalizeSelectedElvesIds用于加载、保存、复制和分享，保持选择顺序及旧/未知指定；非ID对象只转固定无效占位，不暴露原文。全无效不能删成空数组；空选才启用本周双倍，有指定时只用首个有效项，全无效暂停果灵模式并按原土地策略种植。CustomSelect仅本控件allowEmpty，旧无效项展示警告、禁新选且允许用户主动移除；当前有效旧图鉴ID兼容。页面常驻解释空选/混合/全无效，不把派遣模式当种植规则。配套脚本需同步无效指定诊断；前端本身不判断账号培育状态。

生成器--only-elf-plants只写种植目录，避免重写其他选项；更新静态库后用同源导出重新生成。验证scripts/test-elf-plant-selection.mjs、test-config-share.mjs及tools/check-elf-plant-ui.py；无新字段、分享schema或Web API，原派遣配置不变。

## 2026-10-25 新果与果艺数据同步

配置选项以果园当前静态库分类导出为源：275水果、44花瓶、711完整配方。新增阳光青提/莓飞色舞/火热鱼艇/绮梦星铃/在逃公主与云屿仙堡三配方；53014已改名悠然一夏，相关九配方材料名同步。原生图片白名单现275项，五张新增及53014换图均从当前MCP subAsync索引获取并校验SHA256；52102/52103/52104仍用缺图占位。水果/果艺旧ID、果灵/兑换/竞赛选项不变，无新配置字段或Web API迁移。

## 2026-10-25 绮梦云游活动配置

活动页activity.hdReward新增hd3010SignEnabled、hd3009TaskRewardEnabled、hd3009DrawEnabled、hd3009GiftEnabled，均默认false/严格true，与往期enabled独立。任务项包括每日/广告/总任务奖及68/198/520进度奖；购买复用勾玉确认并依赖筑翼，关闭筑翼只禁用控件、不清购买值。520停止购买，已有晶核仍可筑翼；日限价格以游戏为准。默认/类型/normalize/生成schema同步，旧分享缺字段保留当前值。验证test-wing-activities、check-wing-ui及既有活动/分享回归；后端通用配置无需新增接口。

## 2026-10-24 500库存以下培育切换

水果库存“500库存↓”下增加“全部 / 已培育 / 未培育”二级筛选，默认全部，与库存 < 500、搜索取交集，保留零库存和库存升序；页签及独立折叠模式共用。培育仍仅认原快照的 cultivated:boolean，旧/部分缺失数据提示待同步，不由数量推断。搜索/清空/刷新/切分类保留选择，切账号随组件重建；分类缓存纳入筛选值，搜索分母按当前子集，复制全部保持完整。原六分类和兼容的旧花卉模块不受子筛选影响。维护 test-fruit-inventory-evt、test-evt-browser 的阈值/状态/窄屏验证，无新增接口或轮询。

## 2026-10-23 水果库存全部分类使用图片

最新用户要求覆盖此前“只有已培育显示图片”的范围：水果库存六个分类及独立折叠区全部使用FruitInventoryGrid，传入对应分类label作为无障碍名称；组件按传入items顺序渲染，不统一重排。数量/品质/500上下四视图、培育分类、搜索与全量复制各自沿用既有数据规则，缺cultivated字段的旧快照仍可看四种图片视图；其他模块和旧花卉库存继续原样。验证现有test-fruit-inventory-evt和test-evt-browser。

## 2026-10-23 水果图鉴与培育字段

水果库存的已培育图片图鉴只消费脚本明确的cultivated:boolean，旧/部分快照缺字段则分类待同步；不能从正库存、种子或静态目录猜培育。FruitImage通过src/data/fruit-artwork.json解析同源PNG，使用BASE_URL、懒加载及失败占位，名称和数量始终保留；未知ID不拼URL。图鉴按品质5→1再itemId升序，搜索与复制分别使用筛选结果及完整原始清单；按数量等原四视图仍保持旧排序。资源更新用scripts/sync-fruit-artwork.mjs读取果园MCP静态bundle索引及正式数据库，核对sources.json。验证库存专项及test-evt-browser；其他模块和旧花卉库存不套用果园图片。

## 2026-10-22 角色卡整页回归

角色卡接入公共组件时，模板只能引用本项目实际定义的方法；公会在线状态复用getAccountGameData(account).isOnline。修改需运行scripts/test-account-home-browser.py检查真实首页及生产dist中的账号列表，覆盖在线/离线、缺记录和空列表；构建成功或公共组件独立预览不能替代父组件集成验证。测试只用合成API并拦截外网。

## 2026-10-22 公会原生资源维护

公会图片只由src/data/guild-artwork.json白名单解析；更新需核对本游戏原始配置、图片尺寸、透明遮罩及sources.json校验和，不能从账号字段拼任意URL。果园icon按下划线分隔的三个club_icon行ID解码。图层按原生尺寸相对边框缩放；称号底图须叠加原生名称。缺图保留文字，未知状态不推断入会；资源变更运行test-guild-artwork.mjs并检查手机布局。细节见HANDOFF本日原生资源条目。

## 2026-10-22 扫货好友过滤与公会同步约定

`plant.market.buyFriendEnabled` / `excludeFriendEnabled` 为互斥布尔值，默认均关闭；指定优先处理异常的双开配置。所有扫货策略先叠加好友过滤，两个开关均关闭时仅按商品策略。旧 `buyMode=friend/excludeFriend` 迁到 `all` 加对应开关，原名单保留，不直接改写脚本账号对象。

两个开关移到策略及其商品选项之后、最小上架时长之前；启用任一自动关闭另一个，共用原好友名单。保存、载入、分享导入均支持旧模式迁移，旧分享缺少新字段时保留当前值。

角色卡接入 `AccountGuildSummary.vue` 与 `accountGuild.ts`，展示原生公会名称/编号/等级/称号、人数/容量、财富、公会币和原竞赛次数。未知与未入会单独显示，离线显示“上次同步”；徽章和称号使用本项目guild-artwork静态目录，未知编号或缺图才回退，不套用花园资源编号。复用原账号记录轮询。

## 仓库开材料（2026-10-22）

基础页“仓库道具 → 开材料”沿用花园basic.bag.openMaterials，仅布尔true开启，默认false/旧账号关闭。范围仅随机药剂、肥料、土壤、培育材料和日常宝箱，每60秒每类最多99个，余量后续处理。类型/默认/normalize/生成schema同步，旧分享码缺字段保留接收方值；由果园BagMgr执行，Web API通用JSON存储无需字段更新。页面用tools/check-bag-ui.py合成API回归，不连接真实账号。

## 好友处理（2026-10-22）

种植页plant.friend对应enabled/rejectOnStart/maxFriends/deleteAfterMinutes/deleteOfflineDays，布尔严格true且默认false、数字默认0并归一0~999整数。总开关关闭隐藏但不清子项，旧分享码缺字段保值；类型、默认、normalize和生成schema同步。定时删除仅脚本通过好友，离线清理每日一次，闺蜜保留；文案不能暗示0绕过游戏上限或原有好友也计时。手机组标签独占一行，输入与单位同行。执行端为果园FriendMgr，Web API通用存储无需字段更新。验证test-config-share、tools/check-friend-ui.py及生产构建，界面测试只用合成API。

## 好友市场昵称或ID（2026-10-15）

好友市场friend/excludeFriend共用plant.market.buyFriendNames字符串数组，不另建ID字段；页面标签“好友昵称 / ID”，tags回车添加，可混填完整昵称和好友ID。纯数字由脚本只按UID匹配，非数字按完整昵称（含区服前缀），不要提示数字昵称也能匹配。原归一化、保存/分享schema及Web API通用存储保持；scripts/test-config-share.mjs覆盖混填保存重载/分享和旧码缺字段保值。

## 果园宠物设置（2026-10-15）

宠物继续用basic.feedCat，不能因狗狗文案改字段名或迁移已保存值。原enabled/autoRecall/autoBuyFood/autoFeed/autoStroke默认false保持；新增autoGuide/autoReadLog默认true但显式false保留，受总开关约束，隐藏不清子项。类型、默认、normalize及生成分享schema须同步，旧码缺字段保留接收方当前值。后端通用配置存储无需字段更新。

页面规则以果园脚本PetMgr为准：25级/60秒，1117金币粮100/份日限30、10格缺口，喂食关闭不购粮；心情<85且CD结束才摸，睡眠/外出等待。普通外出不召回，仅处理走失/特殊事件免费分支；清已结算记录不重复领奖。首次教学保存131，无单独saveGuide132。验证scripts/test-config-share.mjs、tools/check-pet-ui.py（本地合成API）及生产构建；仅宠物组移动布局调整，不修改公共表单组件。

## 公会商店（2026-10-12）

union.fmlShop默认关闭，FmlShopSettings复用花园配置交互但目录仅取果园club_shop/item的36种商品。fmlShopRules.js/fmlShopCatalog.json由果园脚本scripts/sync-fml-shop.mjs --frontend-root生成，不能手改为花园币种/商品。商品数组顺序即优先级，库存按道具个数且整组购买；隐藏不清子项，保存/分享/旧码保值复用原通道。五种条件、公会币保留、自动解锁及none/free/paid刷新类型配套维护；真实页面回归tools/check-fml-shop-ui.py只使用本地Vite和合成接口，产物在artifacts/fml-shop-*。

## 延迟收获按当前友情币余额跳过（2026-10-12）

plant.flower和plant.elves分别新增delayedHarvestStopAt500FriendCoin，默认false、归一化仅接受true。普通种植/果灵各自延迟选项下显示“满500友情币停止延迟”：当前余额>=500正常收获，跌破500恢复延迟，不能写成当天累计所得。类型、默认值、归一化、表单和sync-config-share生成schema必须同时维护；旧分享码缺字段保留当前开关，后端通用存储无须改白名单。脚本LandMgr负责实际余额及发送前复核。

## 密码绑定具体原因只提示一次（2026-10-09）

AddAccountModal的账号密码绑定请求使用handleErrorLocally:true，HTTP失败只由页面getSafeAccountPasswordError显示，避免全局Axios拦截器再弹一次。保留后端已归一原因；未知敏感文本继续过滤，普通失败保留票据/选服可重试，BIND_EXPIRED回到登录。网站负责重复绑定校验，脚本已有文件可以更新，不在前端增加本地文件判断。账号密码登录/渠道转换守卫保持。验证test-account-password-login.mjs含实际响应拦截器链和单次错误提示，及渠道专项/生产构建。

## 果园新增账号扫码入口取消（2026-10-08）

历史决定：当时 `AddAccountModal` 的2/3渠道仅展示转换教程并允许返回。2026-10-27用户要求重新开放微信，现只有抖音（2）保留转换教程和处理器守卫，微信（3）以本文件最新约定为准。默认平台0，顺序0/1/2/3；已有账号重验、支付宝与账号密码逻辑保持。离线验证入口 `scripts/test-add-account-channels.mjs`、`test-account-password-login.mjs`、`test-channel-conversion-browser.mjs`，后者可传 `--screenshots DIR`。

# 配置分享维护规范

## 顾客可种也拒绝（2026-09-29）

order.customer.rejectPlantable默认false、严格布尔true，显示为“可种也拒绝”，仅顾客订单enabled及rejectEnabled都开启时显示，隐藏不清空。它依赖自动拒绝：成品不足且制作原料也不足才拒绝，原料够制作仍完成；tooltip须说明两开关关系。复用原默认/类型/归一化/分享schema；旧码缺字段保留当前值。验证scripts/test-customer-reject-plantable.mjs及原分享回归。

## 果香绘色（2026-09-28）

activity.flowerEmbroidery的新开关全部默认false，含unlockSlot，旧cyclicNote不迁移授权。三个守护为orderGuard/customerOrderGuard/artSellGuard，timeRanges首段默认00:00～21:00且严格HH:mm归一；北京时间支持跨午夜。说明须保持：居民任务绕过三类子开关但保留总开关，顾客任务绕过两级执行开关；果艺守护只挡上架，任务独立触发4分钟下架，重新上架仍需autoSellArt。shop独立于enabled，目标为物品ID而非固定商品行，当前售价/数量不在前端猜测。商品目录允许省略amount/price并显示以本期为准；保持丝绣旧标签。用户已取消土地活动优先级，不要加入。改动验证scripts/test-flower-embroidery.mjs和原活动/分享回归。

## 月照团圆（2026-09-24）

`activity.hdReward.hd90TaskRewardEnabled`、`hd90DrawEnabled`、`hd91SignEnabled`三开关默认false，严格布尔归一化且互不依赖；仲夏夜enabled不得禁用它们。同步默认值/类型/normalize及生成分享schema，旧分享码缺字段保留当前值。制作文案按已有印模50/10/1，不能把520次写成制作上限；验证使用scripts/test-moon-reunion-activities.mjs及原活动/分享测试。

## 配额转移（2026-09-24）

- 开关/费率来自服务端，默认关闭，确认金额取preview结果。结果不明保留原UUID，不能换号重发；待确认内容和登录用户隔离。
- 转入/转出方向和分页历史复用PointTransactionHistory，管理查询与个人中心使用同一口径。修改运行test-quota-transfer-browser.mjs，覆盖真实表单提交、断网恢复、窄屏。


## 2026-09-23：EVT v2 迁移

全部 EVT 模块按滚动 24 小时保留，不按 300/2500 条截断。普通文本日志仍保留既有条数限制。不要全量 v-for、JSON 复制整天数据或重读旧浏览器 EVT 缓存。详见 [EVT-MIGRATION.md](EVT-MIGRATION.md)。

- 普通水果延迟收获在自动收获下作为子项，仅自动收获开启时显示，plant.flower.delayedHarvestEnabled默认false、delayedHarvestMinutes默认10（1-999整数），与elves独立，生成果灵的地块只用elves设置。数字输入失焦/保存归一化；新增类型及分享schema同步，旧码缺字段保留当前值。果灵模式达限说明须包含已生成待收数量，不将其混为实际已收获。

- 竞赛 `union.fmlRace.keepProgressTask` 默认false、严格布尔归一化，仅deleteTask开启时显示，隐藏保留；与avoidProgressTask独立，保护公共任务自动删除，不控制本人任务放弃。新增字段同步类型及生成前端分享schema，旧码保留接收方值。

- 果园支付宝 platform=1 已开放，复用 AddAccountModal 扫码及 ScriptConfig/AlipayReauthModal 续期；对应 Web API 使用果园 appId=2021006190692125。不得在控制台打印扫码凭据/完整绑定请求；普通配置 schema 不包含登录认证字段。
- 渠道入口变更须同步 handleNextStep 白名单，并运行 scripts/test-add-account-channels.mjs 验证实际按钮→登录页→二维码请求；不能仅凭选项显示或构建通过认定渠道可用。

- 花/果灵 `plant.elves.clearBeforePlant` 默认 true，仅显式布尔 false 保留等待模式；显示为延迟收获设置下方的“全部铲完种/等待收获完成种”圆点单选，仅自动种果灵开启时显示。文案不能扩大原铲除范围，等待模式按空地逐块补种。沿用原保存/分享归一化，旧码不得改写当前值。
- `plant.friendSteal.friendCoinReserve` 默认0、0-9999整数，仅购买偷取次数开启时显示，隐藏不清空；前后端归一化一致。余额减保留额才可用于购买，配套果园脚本每笔POST前复查；修改运行 check-elves-friend-reserve-ui.mjs 验证真实控件、保存加载及分享兼容。
- 竞赛小号升级或刷新任一开启时，`completeTakenTask` 只在界面禁用，保留原勾选和保存值；两项关闭后恢复普通模式。常规表单和快速设置复用同一模式判断及说明，勿通过清空配置制造互斥。
- 先读 [功能手册](CONFIG_SHARE_MANUAL.md)。前端修改前先拉取。
- 复用现有分享模块、页面配置类型和归一化，禁止复制另一套默认值。
- 前端 core.ts 是本项目协议来源，服务端副本不得单独手改。
- 新增字段同步 GameConfig 类型，特殊类型在 project.json 中明确描述；生成并检查前端 schema。后端已采用通用存储，不再同步其字段白名单；--server-root 只读核对项目元信息，core 协议变化才需要协调后端。
- 百果争鲜autoSelect默认false、selectIndex默认0，0=左侧第一个、1=右侧第二个；实际ID由脚本读取当期区服flower1/flower2。旧selectFlowerId=5301/5302只用于迁移，加载/复制须在deepMerge前执行，分享须在过滤/合并前迁移且不补码中缺失字段。显式新值优先，非法值关闭自动选择，已有选择不切换；保存/新分享清除旧ID。累计点赞奖继续复用autoClaimRewards。此条覆盖09-17固定ID约定。
- 旧码只覆盖存在字段；导入确认后仍由用户核对保存。
