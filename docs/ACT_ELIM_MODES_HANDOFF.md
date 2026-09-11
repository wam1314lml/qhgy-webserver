# 甘之如饴游戏模式（2026-09-11）

- 显示约束：玩家界面仅显示普通/极限模式及NPC任务领奖说明，不展示每体力具体得分或内部目标。下文数值仅为开发交接，不得恢复到前端提示；本次仅改显示，不改脚本策略。

- 活动页新增游戏模式选择：普通normal、极限extreme。activity.actElim.mode默认normal，缺失/非法值也归normal；自动参与关闭时禁选并保留当前选择。
- 普通每体力约250消除分，极限约500，均不含移动赠分和NPC奖励。两者优先完成NPC领取箱子，必要时超出目标；脚本按实际倍率缩放目标，不提供自定义分数或简易模式控件。旧simpleMode/maxScorePerMove继续在保存/导入时清理。
- 沿既有setting接口保存；更新脚本并保存设置后，停止再启动账号生效。脚本细节见qhgy-assistant-master/docs/QHGY_ACT_ELIM_HANDOFF.md，不在前端计算任务完成或发游戏包。
- scripts/test-act-elim-config.mjs覆盖模式往返、非法值默认、禁用联动、四项配置与Vue编译；原活动隔离测试与Vite构建通过。显式vue-tsc -p tsconfig.app.json仍有44项既有类型错误，未改动相关旧业务；未部署/推送。
