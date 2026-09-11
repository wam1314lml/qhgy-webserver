// platform=0 是果园官方账号密码渠道；不能用 truthy 回退吞掉 0。
export const isAccountPasswordPlatform = (platform: unknown): boolean =>
  platform === 0 || platform === '0'

export interface AccountPasswordServer {
  serverId: string
  serverName: string
  roleName?: string
}

export const normalizeAccountPasswordLogin = (data: any): {
  bindTicket: string
  servers: AccountPasswordServer[]
} | null => {
  if (!isAccountPasswordPlatform(data?.platform)) return null
  const bindTicket = typeof data.bindTicket === 'string' ? data.bindTicket.trim() : ''
  if (!bindTicket || !Array.isArray(data.server_list?.servers)) return null
  const seen = new Set<string>()
  const servers: AccountPasswordServer[] = []
  for (const row of data.server_list.servers) {
    const serverId = String(row?.serverId ?? row?.server_id ?? '').trim()
    if (!/^[1-9]\d*$/.test(serverId) || seen.has(serverId)) continue
    seen.add(serverId)
    servers.push({
      serverId,
      serverName: String(row.serverName ?? row.server_name ?? `s${serverId}区`),
      roleName: typeof row.roleName === 'string' ? row.roleName : undefined,
    })
  }
  return servers.length ? { bindTicket, servers } : null
}

// 错误只展示可读提示，不回显 SDK 请求、密码、票据或游戏凭据。
export const getSafeAccountPasswordError = (body: any, fallback = '账号密码操作失败，请稍后重试'): string => {
  const candidate = body?.message ?? body?.msg
  const isSafe = (text: unknown): text is string =>
    typeof text === 'string' && text.trim().length > 0 && text.length <= 200 &&
    !/https?:\/\/|\bBearer\s+|\beyJ[A-Za-z0-9_-]+\.|[{}]|(?:password|passwd|pwd|token|bind_?ticket|openid|open_id|opid|username|sessionid|cookie|authorization)\s*["']?\s*[:=]/i.test(text)
  return isSafe(candidate) ? candidate.trim()
    : isSafe(fallback) ? fallback : '账号密码操作失败，请稍后重试'
}
