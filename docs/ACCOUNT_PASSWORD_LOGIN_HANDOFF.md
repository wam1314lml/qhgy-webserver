# 果园官方账号密码登录

更新：2026-09-12。

重复绑定提示由后端依据重复账号user_id查网页username并将最后两位替换为星号；前端不自行查询或持有完整绑定人信息。密码/微信保留message提示，抖音HTTP错误的组件catch同时读取err。三渠道绑定组件测试均验证409提示显示已脱敏网页账号，不改变登录成功或幂等重试行为。

本次更新：Web 按用户明确要求保存账号密码渠道的明文密码，来源仍是登录时 POST 的密码，浏览器绑定阶段不需重新传入；SDK opId＋区服由后端跨渠道查重。抖音 bind_confirm 前增加 SDK 身份验证，前端专用超时改为240秒，覆盖后端90秒认证＋120秒绑定；删除该请求正文的控制台日志。不改变其他请求的默认超时或新增UI开关。

- 添加账号恢复“账号密码”入口，渠道 `platform=0`；默认仍选微信，抖音保持可用，支付宝继续隐藏。
- `POST /api/game-accounts/login {username,password,platform:0}`。账号密码仅放请求正文，不写 URL、控制台、浏览器存储；请求完成即清空密码。
- 登录响应要求 `data.platform=0`（兼容字符串 `"0"`）、`data.bindTicket` 和 `data.server_list.servers`。只展示后端返回的角色区服，不使用花园 SDK 的 token 流程。
- `platform=0` 的账号名使用用户输入的 `username`，服务端去除两端空格后用于登录响应 `data.username`、绑定流程及账号保存，不再生成 `PW_<opId>`。前端登录和绑定均提交原输入，既有流程不依赖此前缀；普通账号与手机号一致处理。
- `POST /api/game-accounts/bind {username,server_id,platform:0,bindTicket}`。短期票据由网页后端管理脚本服、身份及区服，浏览器不传 SDK `uid`/`opId`、token、密码或 `parent_id`；SDK 身份由后端票据管理，不作为浏览器账号名。
- 本次仅明确原名契约并扩展离线回归，前端生产代码无须修改；不迁移已有账号或改写已有账号名。
- 登录和绑定单请求超时 190 秒，略大于网页后端的 180 秒；票据有效期 5 分钟，由后端校验，不在浏览器自行续期。
- 返回、关闭、组件卸载都会清除密码/票据，旧异步响应不恢复登录状态。票据过期回到登录，网络失败可保留票据重试。
- SDK 实名认证、绑定手机、强制改密不新增交互流程；由后端记日志，前端只显示脱敏错误提示，不主动绕过这些状态。
- `ACCOUNT_PASSWORD_` 业务码不触发网站退出登录；网站自身访问令牌失效仍按既有逻辑退出。

## 离线验证

```powershell
node scripts/test-account-password-login.mjs
node scripts/test-add-account-channels.mjs
node scripts/test-wx-reauth.mjs
npm run build
```

专项测试直接执行页面处理函数，HTTP、计时器和 Vue 状态使用离线替身，不进行真实账号登录或绑定。原名回归覆盖普通账号、虚构手机号及两端空格输入，校验登录和绑定保留输入、不生成 `PW_` 前缀，绑定请求不夹带 SDK 身份或游戏凭据。

2026-09-12 原名契约调整后，上述三项离线测试均通过；前端生产代码未改，本次未重跑完整构建。2026-09-11 的 `npm run build` 已通过，仅有既有大包体积提示；尚未实际登录或绑定账号。
