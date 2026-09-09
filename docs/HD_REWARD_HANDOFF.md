# 限时活动领奖开关（2026-09-09）

- 活动页保留原卡册分区，新增“仲夏夜之梦·萤夜蝶舞”。
- `activity.hdReward.enabled=true` 默认开启自动领取普通、广告及累计任务奖励；false停止脚本本模块。
- `activity.hdReward.hd3013DrawEnabled=false` 默认关闭，只有显式true使用已有蝶舞瓶抽奖。总开关关闭时控件禁选，不丢掉用户原抽奖偏好；不购买道具、不使用幻梦蝴蝶。
- defaultConfig/types/normalizeConfigSelects同步字段，旧配置自动补齐，字符串false归一为false；保存与导入沿既有deepMerge和setting接口。保存后仍需停止再启动账号。
- 配套脚本为 `qhgy-assistant-master/src/game/mgr/hdRewardMgr.js`，默认180秒检查，每轮最多20次逐瓶放飞，剩余下轮继续。协议及回包依据见脚本项目 `docs/QHGY_HD_REWARD_HANDOFF.md`。
- 活动页测试覆盖原卡册不回退、新开关默认值/禁用联动/保存往返/非法布尔值及Vue编译；培育品质原测试与 `npm run build` 通过。未访问线上账号、未部署或推送。
