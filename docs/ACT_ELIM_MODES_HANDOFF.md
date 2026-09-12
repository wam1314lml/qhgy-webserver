# 甘之如饴内部模式（2026-09-11）

## 2026-09-12 当前约定（覆盖下方历史内容）

- 移除自定义分数开关，customScoreEnabled默认且强制false，加载/保存/导入旧true也不能开启；删除customScoreStrategy/customScoreMin/customScoreMax，不迁移旧中等策略。
- 分数策略只绑定scoreMode，extreme显示“高分策略”（默认），normal显示“普通策略”；缺失或非法值归extreme，关闭总开关时保留选择，不显示分值。类型固定customScoreEnabled:false。
- 内部task/score仍只由脚本代码决定、默认task，scoreMode仅在脚本切到score时生效，提示已说明。可见配置为自动参与、体力领取、分数策略、最高倍率；原倍率与领奖设置不变。
- 专项覆盖旧true强制关闭、策略反复保存/导入与非法值、旧字段清理、其他活动隔离、表单实际绑定及Vue编译；test-act-elim-config、test-card-album-activity和npm run build通过（既有大包提示），差异检查通过。不新增API或游戏请求；需前端和脚本同步部署，未操作真实配置或部署。

## 历史记录（自定义开关已取消）

- 最新要求覆盖此前的普通/极限前端切换：任务模式、分数模式仅由脚本代码初始化选择，默认任务模式。前端不再提供任何模式选择，不发送模式字段；脚本初始化的分数模式维持原得分策略。
- 任务模式优先尽量使用一体力完成当前NPC；确实不能完成时继续累计进度，允许两步或更多步完成。仅在直属回包确认需求达成后领奖，不承诺任何盘面或服务器状态都能一步完成。
- 前端保留自动参与、体力领取、最高倍率，新增自定义分数开关及其分数策略，共五个配置字段。任务模式固定1倍，最高倍率只供脚本切换分数模式时使用；表单提示明确适用范围。关闭自动参与时，子项禁用但保留选择。
- `activity.actElim.customScoreEnabled` 默认 `true`，只有布尔 `false` 关闭；`customScoreStrategy` 支持 `normal`（普通策略）、`medium`（中等策略），默认中等，缺失/非法值也归中等。开关开启才显示策略选择，关闭不清空策略，保存/导入完整保留。
- 自定义分数只调整消除计分策略，关闭后使用原计分方式，不是任务/分数内部模式切换；NPC奖励、移动赠分仍由脚本按服务器回包确认。前端不计算游戏分数或修改NPC任务条件。
- `activity.actElim.mode`、`scoreMode`、`simpleMode`、`maxScorePerMove` 在加载/保存/导入时清理。历史的 `normal`、`extreme` 或手工的 `task`、`score` 均不能覆盖脚本初始化策略；默认配置和类型不再声明模式字段。
- 玩家可见配置仅显示分数开关和两档策略，不显示每体力具体得分、内部目标，不开放任意分数输入。不得把开发调优数值恢复到前端提示。
- 沿既有 setting 接口保存，不在前端计算NPC完成或发游戏包。脚本细节见 `qhgy-assistant-master/docs/QHGY_ACT_ELIM_HANDOFF.md`。
- 本轮离线验证：`test-act-elim-config.mjs`、`test-card-album-activity.mjs`、`test-cultivate-quality.mjs`、`test-fml-race-accept-rules.mjs` 均通过，覆盖五个配置项、自定义分数默认/显隐/关闭保留、历史模式/手工内部策略的保存导入清理、倍率归一化、开关联动、其他活动隔离及Vue编译；`npm run build` 通过（保留既有大包体积提示），`git diff --check` 通过。未运行账号或发游戏请求；本次尚未提交、部署或推送。
- 此前显式 `vue-tsc -p tsconfig.app.json` 的44项既有错误不属于本次修改范围；本轮运行的是仓库标准 `npm run build`，未以该结果宣称显式全量类型检查已修复。
