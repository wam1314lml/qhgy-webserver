// 微信游戏凭据过期不等于网站登录过期；交给账号页面的重认证流程处理。
export const isWxReauthRequired = (body: unknown): boolean =>
  typeof body === 'object' && body !== null &&
  (body as { code?: unknown }).code === 'WX_REAUTH_REQUIRED'

// 认证上游可能把请求正文或认证 URL 放入错误消息，不能原样展示或写入浏览器日志。
export const getSafeWxReauthError = (body: any, fallback: string): string => {
  const data = body?.data && typeof body.data === 'object' ? body.data : {}
  const candidate = body?.message ?? body?.msg ?? body?.error ?? data.message ?? data.msg ?? data.error
  const isSafe = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= 300 &&
    !/https?:\/\/|\bBearer\s+|\beyJ[A-Za-z0-9_-]+\.|[{}]|(?:code|token|openid|open_id|opid|uin|username|sessionid|cookie|authorization)\s*["']?\s*[:=]/i.test(value)
  if (isSafe(candidate)) return candidate.trim()
  return isSafe(fallback) ? fallback : '微信认证失败，请重新获取二维码后重试'
}
