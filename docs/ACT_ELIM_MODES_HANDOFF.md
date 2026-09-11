# 甘之如饴内部模式（2026-09-11）

- 最新要求覆盖此前的普通/极限前端切换：任务模式、分数模式仅由脚本代码初始化选择，默认任务模式。前端不再提供任何模式选择，不发送模式字段；脚本初始化的分数模式维持原得分策略。
- 任务模式优先尽量使用一体力完成当前NPC；确实不能完成时继续累计进度，允许两步或更多步完成。仅在直属回包确认需求达成后领奖，不承诺任何盘面或服务器状态都能一步完成。
- 前端仅保留自动参与、体力领取、最高倍率三项。任务模式固定1倍，最高倍率保留但只供脚本切换分数模式时使用；表单提示明确适用范围。关闭自动参与时，子项禁用但保留选择。
- `activity.actElim.mode`、`scoreMode`、`simpleMode`、`maxScorePerMove` 在加载/保存/导入时清理。历史的 `normal`、`extreme` 或手工的 `task`、`score` 均不能覆盖脚本初始化策略；默认配置和类型不再声明模式字段。
- 玩家可见配置不显示每体力具体得分、内部目标或自定义分数设置。不得把开发调优数值恢复到前端提示。
- 沿既有 setting 接口保存，不在前端计算NPC完成或发游戏包。脚本细节见 `qhgy-assistant-master/docs/QHGY_ACT_ELIM_HANDOFF.md`。
- 本轮离线验证：`test-act-elim-config.mjs`、`test-card-album-activity.mjs`、`test-cultivate-quality.mjs`、`test-fml-race-accept-rules.mjs` 均通过，覆盖三个配置项、历史模式/手工内部策略的保存导入清理、倍率归一化、开关联动、其他活动隔离及Vue编译；`npm run build` 通过（保留既有大包体积提示）。未运行账号、发游戏请求、部署或推送。
- 此前显式 `vue-tsc -p tsconfig.app.json` 的44项既有错误不属于本次修改范围；本轮运行的是仓库标准 `npm run build`，未以该结果宣称显式全量类型检查已修复。
