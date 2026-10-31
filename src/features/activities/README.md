# 活动福利组件

接线和测试见 [前端活动说明](../../../docs/ACTIVITIES.md)。迁移时同时携带后端同名模块及后端的 `ACTIVITIES.md` / `ACTIVITIES_MIGRATION.md`，不要只复制页面。

`ActivityWelfare` 接收 `type`（`guild_rally` / `sign_in`）；`ActivityAdmin` 接收可选管理员 `token`。组件通过统一 Axios/HMAC 调用 `/api/activities`，成功后发出 `activitiesChanged` 与 `activityAccountsUpdated`，并刷新既有网站余额。

`useWelfareNotifications` 由消费者挂载时订阅，最后消费者销毁时清理定时器；与现有 TopNavBar 联动，退出必须清理用户专属摘要和开放活动状态。卡密面额为点数，时长值为小时，配额时长为天，禁止混淆单位。

`ActivityWelfare.css` 是组件的 scoped 外置样式，复制模块必须包含它。福利页整体外壳在 `pages/WelfarePage.vue`；迁移时合并布局和标签接线，保留目标项目原有福利。

签到只展示进行中活动；管理员按服务端 `canDelete` 删除到期活动，调用 `DELETE /admin/:id`。需配套后端的 `deleted_at/deleted_by` 缺失字段初始化；删除不影响历史奖励。签到日历读取 `signIn.days/today`，不通过客户端累计或伪造签到状态。

`SignInCalendar.vue/.css` 与 `calendar.ts` 从服务端日期和 rewardStates 生成整月日历，`RewardIcon.vue` 提供三类图标；签到需名下至少一个未过期角色，按钮遵循服务端 canSignIn 并显示 reason；无角色/全过期不可签到，已签到奖励仍可补领。运行 `node --test scripts/test-activity-calendar.mjs` 验证日期边界。

`ActivityArtwork.vue` 的默认主题按当前项目配置（花园携带右半主题，其他目标站默认无图，管理员可上传）；`imageUpload.ts` 压缩上传，地址经活动配置保存。需要配套后端 `welfare_activity_images` 初始化、上传路由及公开只读图片路由。背景不属于锁定奖励规则。

`useWelfareNotifications` 提供开放活动类型，福利页据此隐藏未开放的集结/签到页签，并在当前页签关闭时切换。`api.summary()` 优先读取 `/summary.activeTypes`；旧后端缺字段/格式错误或摘要不可用时，读取 `/api/activities` 中 `enabled && status === 'active'` 的类型去重。明确的空数组仍表示关闭，不回退；401/403 不回退。不能用 hasPending、角色数量或客户端时间判断入口。

查询均失败时 `activityLoadFailed` 显示福利页重试提示，暂时失败保留本账号已加载状态；鉴权拒绝/退出清空，退出后的延迟响应不可恢复入口。迁移需携带 api/composable、WelfarePage 的错误提示和重试接线，仍建议先发布后端 summary 再发布前端，避免兼容路径增加完整列表请求。

`WelfareNavLabel.vue` 替换旧福利红点，接收 `hasActiveActivities`：集结或签到任一进行中就在福利右下角显示跳动的 new，与待领取/充值次数无关。迁移须携带组件并合并 TopNavBar 的 import/模板接线；退出清空，减少动态效果时不跳动。

`GuildAllocation.vue` 接收 activity/guild/busy，向 ActivityWelfare 发出 working/changed：有效角色整套分配，到期/缺公会/手动更新时先付款一天，再启动或重启角色并等待公会同步，自动补足余量。进度和金额由后端 preparation 提供，首日不计参与；prepare/status/complete 三接口及 welfare_activity_allocations 初始化必须配套迁移。已有启动接口的鉴权/限流/认证检查保留。卸载/退出/切号停止后续自动请求，恢复时读取数据库进度；不能仅用浏览器内存或本地存储防止重复首日收费。
