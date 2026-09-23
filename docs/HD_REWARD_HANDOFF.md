# 限时活动领奖开关（2026-09-09）

## 2026-09-23 百果争鲜按左右位置选择

- 支持对象改为“左侧（第一个）/右侧（第二个）”，selectIndex保存0/1，默认0、autoSelect默认false；不再显示固定果艺名称。配套脚本从本区服当期Competing_cfg.flower1/flower2解析真实ID再发送，已有选择不切换、点赞独立授权。
- 旧selectFlowerId=5301/5302按原选项顺序迁移为0/1，显式新值优先，未知旧ID或非法新序号关闭自动选择。加载和跨账号复制必须在deepMerge默认配置前运行迁移，避免旧右侧被默认左侧覆盖；保存及新分享只含selectIndex。
- createProjectShareAdapter新增可选的补丁迁移回调，在过滤和合并前只转换码中存在字段；旧码缺选择字段保留接收方设置，原输入对象不修改。沿用原字段白名单、关联冲突检查和分享协议，生成前端schema，Web API通用存储无需改动。
- 修改前pull确认最新。256种保存重载、新旧配置/分享、非法值与左右优先级、Vue组件编译及10组分享回归通过。脚本31组活动专项验证不同区服ID、顺序对调、POST变化与失败恢复，真实网络0。需配套更新网页和脚本，保存后停止再启动账号；未部署，用户随后授权将配套前端和脚本提交推送。

- 活动页保留原卡册分区，新增“仲夏夜之梦·萤夜蝶舞”。
- `activity.hdReward.enabled=true` 默认开启自动领取普通、广告及累计任务奖励；false停止脚本本模块。
- `activity.hdReward.hd3013DrawEnabled=false` 默认关闭，只有显式true使用已有蝶舞瓶抽奖。总开关关闭时控件禁选，不丢掉用户原抽奖偏好；不购买道具、不使用幻梦蝴蝶。
- defaultConfig/types/normalizeConfigSelects同步字段，旧配置自动补齐，字符串false归一为false；保存与导入沿既有deepMerge和setting接口。保存后仍需停止再启动账号。
- 配套脚本为 `qhgy-assistant-master/src/game/mgr/hdRewardMgr.js`，默认180秒检查，每轮最多20次逐瓶放飞，剩余下轮继续。协议及回包依据见脚本项目 `docs/QHGY_HD_REWARD_HANDOFF.md`。
- 活动页测试覆盖原卡册不回退、新开关默认值/禁用联动/保存往返/非法布尔值及Vue编译；培育品质原测试与 `npm run build` 通过。未访问线上账号、未部署或推送。
