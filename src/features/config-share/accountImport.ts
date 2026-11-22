import type { ConfigShareAdapter } from './adapter'
import type { ConfigObject, ShareResult } from './core'

export type ImportAccount = { value: number; label: string }
export type ImportResult = { id: number; success: boolean; message: string }
export interface AccountImportApi {
  list(): Promise<ImportAccount[]>
  read(id: number): Promise<ConfigObject>
  save(id: number, config: ConfigObject): Promise<void>
}
export function importError(error: unknown): string {
  const body = (error as any)?.response?.data
  const detail = body?.message || body?.msg || body?.data?.error
  return typeof detail === 'string' && detail ? detail : (error as Error)?.message || '操作失败，请刷新核对后重试'
}
/** 逐号读取并合并，绝不把当前角色的完整配置覆盖到所有角色；写请求不自动重试。 */
export async function importShareToAccounts<T>(options: {
  ids: readonly number[]; accounts: readonly ImportAccount[]; share: ShareResult
  adapter: ConfigShareAdapter<T>; api: AccountImportApi
  isCurrent: () => boolean; onProgress: (completed: number, total: number) => void
}): Promise<ImportResult[]> {
  const allowed = new Set(options.accounts.map(account => account.value))
  const ids = [...new Set(options.ids)]
  if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0 || !allowed.has(id))) {
    throw new Error('请选择当前网页账号下的游戏账号')
  }
  const results: ImportResult[] = []
  let stopReason = ''
  for (const id of ids) {
    if (!options.isCurrent()) break
    options.onProgress(results.length, ids.length)
    try {
      if (stopReason) throw new Error(stopReason)
      if (Date.now() >= options.share.expiresAt) throw new Error('分享码已过期，请重新生成后导入剩余账号')
      const raw = await options.api.read(id)
      if (!options.isCurrent()) break
      const config = options.adapter.mergeStored
        ? options.adapter.mergeStored(raw, options.share)
        : options.adapter.preview(raw as unknown as T, options.share).config as unknown as ConfigObject
      if (Date.now() >= options.share.expiresAt) throw new Error('分享码已过期，请重新生成后导入剩余账号')
      await options.api.save(id, config)
      results.push({ id, success: true, message: '已导入并保存' })
    } catch (error) {
      const status = (error as any)?.response?.status
      if (status === 401 || status === 403) stopReason = '登录或权限已失效，剩余账号未导入'
      results.push({ id, success: false, message: importError(error) })
    }
    if (options.isCurrent()) options.onProgress(results.length, ids.length)
  }
  return results
}
