/** 两端共用的配额分配队列：固定名单和套餐，逐个调用原接口，绝不重试扣款。 */
export type QuotaAccount = { id: number; label: string }
export type QuotaBatchResult = QuotaAccount & {
  status: 'success' | 'failed' | 'cancelled' | 'unknown'
  reason: string
}
export type QuotaPlan = { days: number; points: number; additionalPoints: number }

export function quotaAccounts(accounts: QuotaAccount[]) {
  const seen = new Set<number>()
  return accounts.filter(row => {
    if (!Number.isSafeInteger(row.id) || row.id <= 0 || seen.has(row.id)) return false
    seen.add(row.id)
    return true
  }).map(row => ({ id: row.id, label: row.label || String(row.id) }))
}

export function quotaQuote(accounts: QuotaAccount[], plan: QuotaPlan, balance: number) {
  if (!Number.isFinite(plan.days) || plan.days <= 0 || !Number.isFinite(plan.points) || plan.points < 0 ||
      !Number.isSafeInteger(plan.additionalPoints) || plan.additionalPoints < 0 || !Number.isFinite(balance) || balance < 0) {
    throw new Error('套餐、额外配额或余额无效，请重新选择')
  }
  const count = quotaAccounts(accounts).length
  const perAccount = plan.points + plan.additionalPoints
  const total = Math.round(perAccount * count * 100) / 100
  if (!count || !Number.isFinite(total)) throw new Error('没有可分配的账号或总配额无效')
  return { count, perAccount, total, affordable: perAccount ? Math.min(count, Math.floor(balance / perAccount)) : count }
}

export async function runQuotaBatch(options: {
  accounts: QuotaAccount[]
  plan: QuotaPlan
  balance: number
  execute: (id: number, body: { days: number; additionalPoints: number }) => Promise<any>
  isCancelled: () => boolean
  onProgress: (completed: number, total: number) => void
  onBalance: (balance: number) => void
}) {
  const accounts = quotaAccounts(options.accounts)
  const plan = { ...options.plan }
  quotaQuote(accounts, plan, options.balance)
  const results: QuotaBatchResult[] = []
  let abortReason = ''
  options.onProgress(0, accounts.length)
  for (const account of accounts) {
    let status: QuotaBatchResult['status'] = 'failed'
    let reason = ''
    let newBalance: unknown
    // 首个立即执行；前一角色完成后等待3.5秒，再检查取消/切页/切号。
    if (results.length > 0 && !abortReason && !options.isCancelled()) {
      await new Promise<void>(resolve => setTimeout(resolve, 3500))
    }
    if (abortReason || options.isCancelled()) {
      status = 'cancelled'
      reason = abortReason || '已取消，未分配配额'
    } else {
      try {
        const response = await options.execute(account.id, { days: plan.days, additionalPoints: plan.additionalPoints })
        if (response?.success === true) {
          status = 'success'; reason = '配额分配成功'
          newBalance = response.data?.newBalance ?? response.data?.data?.newBalance
        } else if (response?.success === false) {
          reason = response.message || '配额分配失败'
        } else {
          status = 'unknown'
        }
      } catch (error: any) {
        const code = error?.response?.status || error?.statusCode
        const body = error?.response?.data || error?.body
        if ([401, 403].includes(code) || ['未授权', '登录已过期', 'Token invalid'].includes(error?.message)) {
          reason = abortReason = '登录或权限已失效，未继续分配'
        } else if (code >= 400 && code < 500) {
          reason = body?.message || '配额分配被拒绝'
        } else {
          status = 'unknown'
        }
      }
      if (status === 'unknown') {
        reason = '提交结果未确认，请刷新核对，勿重复分配'
        abortReason = '前一角色结果未确认，已停止后续分配'
      }
    }
    results.push({ ...account, status, reason })
    if ((typeof newBalance === 'number' || (typeof newBalance === 'string' && newBalance.trim())) &&
        Number.isFinite(Number(newBalance)) && Number(newBalance) >= 0) options.onBalance(Number(newBalance))
    options.onProgress(results.length, accounts.length)
  }
  return results
}

export function quotaBatchSummary(results: QuotaBatchResult[]) {
  const count = (status: QuotaBatchResult['status']) => results.filter(row => row.status === status).length
  return `成功 ${count('success')}，失败 ${count('failed')}，取消 ${count('cancelled')}` +
    (count('unknown') ? `，待核对 ${count('unknown')}` : '')
}
