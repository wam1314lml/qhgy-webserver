type Account = { id?: number | string; platform?: unknown }

/** 新接口使用账号表的权威渠道；兼容旧接口时查账号列表，不从可分享配置推断渠道。 */
export async function resolveAccountPlatform(
  accountId: number,
  response: Record<string, unknown>,
  loadAccounts: () => Promise<Account[]>,
): Promise<unknown> {
  if (Object.hasOwn(response, 'platform')) return response.platform
  const account = (await loadAccounts()).find(item => Number(item.id) === accountId)
  if (!account) throw new Error('未找到账号渠道，请刷新账号列表后重试')
  return account.platform
}

/** 每次加载独立版本，旧账号的异步响应不能覆盖新账号或已离开的页面。 */
export function createAccountLoadGuard() {
  let version = 0
  return {
    begin: () => ++version,
    capture: () => version,
    isCurrent: (value: number) => value === version,
    invalidate: () => { version++ },
  }
}
