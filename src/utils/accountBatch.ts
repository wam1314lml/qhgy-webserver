/** 网页和小程序共用的批量启停流程；只重用单账号接口，不重试写请求。 */
export type BatchAction = 'start' | 'stop'
export type BatchResult = {
  id: number
  label: string
  status: 'success' | 'skipped' | 'failed' | 'cancelled'
  reason: string
}
type ActionResponse = { success?: boolean; code?: string; message?: string }

export async function runAccountBatch(options: {
  accounts: { id: number; label: string }[]
  action: BatchAction
  getStarted: (id: number) => Promise<boolean | undefined>
  getExpired: (id: number) => Promise<boolean | undefined>
  execute: (id: number, action: BatchAction) => Promise<ActionResponse>
  isCancelled: () => boolean
  onStarted: (id: number, started: boolean) => void
  onProgress: (completed: number, total: number) => void
}) {
  const accounts = options.accounts.filter((account, index, all) =>
    Number.isSafeInteger(account.id) && account.id > 0 && all.findIndex(row => row.id === account.id) === index)
  const results: BatchResult[] = []
  const wantStarted = options.action === 'start'
  let abortReason = ''
  options.onProgress(0, accounts.length)
  for (const account of accounts) {
    let status: BatchResult['status'] = 'failed'
    let reason = ''
    try {
      if (abortReason || options.isCancelled()) {
        status = 'cancelled'
        reason = abortReason || '已取消尚未执行的账号'
      } else {
        const started = await options.getStarted(account.id)
        if (options.isCancelled()) {
          status = 'cancelled'; reason = '已取消尚未执行的账号'
        } else if (typeof started !== 'boolean') {
          reason = '未获取到运行状态，请刷新后重试'
        } else if (started === wantStarted) {
          status = 'skipped'; reason = wantStarted ? '已经启动' : '已经停止'
        } else {
          const expired = wantStarted ? await options.getExpired(account.id) : false
          if (options.isCancelled()) {
            status = 'cancelled'; reason = '已取消尚未执行的账号'
          } else if (typeof expired !== 'boolean') {
            reason = '未获取到配额状态，请重试'
          } else if (expired) {
            status = 'skipped'; reason = '配额已过期，请先增加配额'
          } else {
            const response = await options.execute(account.id, options.action)
            if (response?.success === true) {
              status = 'success'
              reason = wantStarted ? '启动成功' : '停止成功'
              options.onStarted(account.id, wantStarted)
            } else {
              reason = actionFailure(response)
            }
          }
        }
      }
    } catch (error: any) {
      reason = actionFailure(error?.response?.data || error?.body || error)
      if ([401, 403].includes(error?.response?.status || error?.statusCode) || error?.message === 'Token invalid') {
        abortReason = '登录或权限已失效，请重新登录后操作'
      }
    }
    results.push({ ...account, status, reason })
    options.onProgress(results.length, accounts.length)
  }
  return results
}

function actionFailure(response?: ActionResponse) {
  if (response?.code === 'ALIPAY_REAUTH_REQUIRED' || response?.code === 'HUAWEI_REAUTH_REQUIRED' || response?.code === 'CHANNEL_REAUTH_REQUIRED' || response?.code === 'DOUYIN_REAUTH_REQUIRED' || response?.code === 'WX_REAUTH_REQUIRED') {
    return '需要重新扫码认证，请在该账号单独操作'
  }
  return response?.message || '操作失败，请刷新状态后重试'
}

export function batchSummary(results: BatchResult[]) {
  const count = (status: BatchResult['status']) => results.filter(row => row.status === status).length
  return `成功 ${count('success')}，跳过 ${count('skipped')}，失败 ${count('failed')}，取消 ${count('cancelled')}`
}
