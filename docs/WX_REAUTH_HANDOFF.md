# 微信启动过期与原账号重认证

更新：2026-09-07。

## 前端流程

- 账号启动接口根据后端统一 Redis 账号记录判断微信游戏凭据是否过期，返回 `WX_REAUTH_REQUIRED`。
- `ScriptConfig.vue` 在正常响应及非 2xx 响应中都识别此业务码，展示已有 `WxReauthModal`，用户点击重新认证后才发起刷新。
- `POST /api/game-accounts/wx/reauth/start {accountId}` 由后端先尝试获取新 code；前端不接收、保存或传递游戏登录凭据。
- 后端返回 `REAUTH_DONE`：刷新原账号记录并尝试启动原账号。返回 `PROCESSING`：继续轮询。返回 `SCAN_REQUIRED`：显示二维码并通过 `/wx/reauth/poll` 继续查询。
- 重新绑定仍在后端按原账号的区服、身份写回配置；本流程不进入添加账号或重新选择区服。
- 二维码过期可重新获取。取消或重新获取前，通过 `/wx/reauth/cancel` 处理原会话；若后端正在完成重绑，则恢复查询，不强行新建重复会话。

## 本次修正

- 全局 Axios 拦截器优先透传明确的 `WX_REAUTH_REQUIRED`，避免因错误文案含“token过期/重新登录”而误清除网站登录。
- 网站自身的访问令牌过期逻辑仍然保留；不以 URL 或所有 401 统一跳过认证判断。
- 微信认证错误文本经过 `getSafeWxReauthError` 过滤，遇到认证 URL、请求正文、Token/Code/OpenID 等赋值或 JWT，显示通用提示。全局错误提示和重认证组件统一过滤，避免不同入口绕过。
- 启动处理等待微信提示初始化完成，不把正常的过期业务码作为完整 Axios 异常写入控制台。

## 离线验证

```powershell
node scripts/test-wx-reauth.mjs
node scripts/test-add-account-channels.mjs
```

测试执行实际页面函数和 Axios 响应处理，使用伪造 HTTP、时钟及定时器，覆盖正常/失败 HTTP 过期响应、直接刷新、回退扫码、成功重启、二维码超时重取、取消、多实例处理中恢复、敏感错误过滤及 Vue 编译；不会请求真实微信认证或启动账号。
