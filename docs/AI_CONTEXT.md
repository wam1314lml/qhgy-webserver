# 配置分享维护规范

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
- 百果争鲜autoSelect默认false、selectFlowerId默认5301，只接受5301/5302；非法对象关闭自动选择，已有选择不切换。累计点赞奖励复用autoClaimRewards，不新建领奖开关。
- 旧码只覆盖存在字段；导入确认后仍由用户核对保存。
