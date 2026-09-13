# 果艺库存优先与仅上架（2026-09-14）

- `plant.artSell.stockFirst` 默认 `false`，只有布尔 `true` 开启；仅在自动上架启用时清仓。先一次性清理全部已有果艺，不限指定花瓶/果艺，按库存降序、同款售完再换。清仓每架最多 12 份，忽略 `flowerArtPerRack`，余量不足 12 也会上架。清仓期间暂停常规补做，清完后后续轮恢复指定模式；关闭再开启或脚本重启会重新清仓。
- 新增 `plant.artSell.makeWhenInsufficient: boolean`，默认 `true`，只有显式布尔 `false` 关闭。关闭后常规自动上架仅用已有成品，不补做或生成常规上架所需的补种需求；果艺首做、顾客与公会任务制作仍独立控制。指定模式及其选择保持不变。
- 页面新增「库存不足时制作果艺」开关；同步指定花瓶、指定果艺、库存优先与首做说明。两个上架子开关仅在自动上架开启时显示，关闭总开关不清除选择。常规上架不足配置数量时仍可上架剩余成品。
- 类型、默认配置与 `normalizeGameConfigSelects` 统一字段规则。既有加载/保存/导入均复用此归一化，避免旧账号缺字段关闭补做，或显式 `false` 被默认值覆盖。
- 不新增 API 或游戏请求，不修改真实账号配置，不部署。需与 `qhgy-assistant-master` 对应果艺执行逻辑同步发布。
- 离线回归：`node scripts/test-flower-art-stock-config.mjs`，覆盖缺省/非法值、全部开关组合反复保存导入、首做与订单/公会配置隔离、实际表单绑定及 Vue 编译。
- 验证通过：上述专项、现有 `test-act-elim-config.mjs`、`test-cultivate-quality.mjs`、`test-fml-race-accept-rules.mjs` 及标准 `npm run build`（保留既有大包提示）。显式 `npx vue-tsc -p tsconfig.app.json --noEmit` 仍报 44 项既有问题；用内存中读取 `HEAD` 的四个修改前源码做同命令基线对照，去除行号位移后错误条目完全一致，无新增类型错误。`git diff --check` 通过。
