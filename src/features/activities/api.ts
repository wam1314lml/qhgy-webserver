import axios from '@/utils/axios'
import type { AxiosRequestConfig } from 'axios'
import type { ActivityClaim, ActivityConfig, ActivityData, ActivityType, AllocationPreparation, AllocationSyncStatus } from './types'

const root = '/api/activities'
const local = { handleErrorLocally: true }
const unwrap = <T>(body: { success: boolean; data: T; message?: string }): T => {
  if (!body?.success) throw new Error(body?.message || '活动请求失败')
  return body.data
}
const isActivityType = (type: unknown): type is ActivityType => type === 'guild_rally' || type === 'sign_in'

// 只保存未确认请求的随机 ID；网络异常后再次操作复用，防止重复扣点和发奖。
const pending = new Map<string, string>()
export function newRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}
export function clearActivityRequests() { pending.clear() }

async function mutate(path: string, payload: Record<string, unknown>, scope = '') {
  const user = localStorage.getItem('user') || ''
  let userId = ''
  try { userId = String(JSON.parse(user).id) } catch { /* 未登录交由接口拦截 */ }
  const key = `${userId}:${path}:${scope}:${JSON.stringify(payload)}`
  const requestId = pending.get(key) || newRequestId()
  pending.set(key, requestId)
  try {
    const response = await axios.post(`${root}${path}`, { ...payload, requestId }, local)
    const result = unwrap(response.data)
    pending.delete(key)
    return result
  } catch (error: any) {
    // 明确拒绝没有发生业务写入；超时和服务端异常保留原请求 ID。
    if (error.response?.status >= 400 && error.response?.status < 500) pending.delete(key)
    throw error
  }
}

export const activitiesApi = {
  async list(): Promise<ActivityData> { return unwrap((await axios.get(root, local)).data) },
  async summary(): Promise<{ hasPending: boolean; activeTypes: ActivityType[] }> {
    try {
      const data = unwrap<{ hasPending: boolean; activeTypes?: unknown }>((await axios.get(`${root}/summary`, local)).data)
      // 明确的空数组表示没有开放活动；缺字段则是旧版接口，不能当成关闭。
      if (Array.isArray(data?.activeTypes)) {
        return { hasPending: !!data.hasPending, activeTypes: [...new Set(data.activeTypes.filter(isActivityType))] }
      }
    } catch (error: any) {
      // 登录/权限拒绝直接交给调用方；摘要不可用时可读取同样受鉴权保护的活动列表。
      if (error.response?.status === 401 || error.response?.status === 403) throw error
    }
    const data = await activitiesApi.list()
    return {
      hasPending: data.hasPending,
      activeTypes: [...new Set(data.activities
        .filter(activity => activity.enabled && activity.status === 'active')
        .map(activity => activity.type).filter(isActivityType))],
    }
  },
  allocate(id: number, accountId: number) { return mutate(`/${id}/allocate`, { accountId }) },
  prepareAllocation(id: number, accountId: number) {
    return mutate(`/${id}/allocate/prepare`, { accountId }) as Promise<{ preparation: AllocationPreparation }>
  },
  async allocationStatus(id: number, accountId: number, preparationId: number): Promise<AllocationSyncStatus> {
    return unwrap((await axios.get(`${root}/${id}/allocate/status`, { ...local, params: { accountId, preparationId } })).data)
  },
  completeAllocation(id: number, accountId: number, preparationId: number) { return mutate(`/${id}/allocate/complete`, { accountId, preparationId }) },
  async startAllocationAccount(accountId: number, active: () => boolean) {
    const state = (await axios.get(`/api/game-accounts/${accountId}/player_record`, local)).data
    if (!state.success) throw new Error(state.message || '无法读取角色运行状态，请稍后重试')
    if (!active()) return
    // 公会快照每次登录同步一次；已运行角色先停止再启动，确保重新读取公会。
    if (state.data?.isOnline) {
      const stop = (await axios.post(`/api/game-accounts/${accountId}/stop`, {}, local)).data
      if (!stop.success) throw new Error(stop.message || '停止角色失败，请稍后重试')
      if (!active()) return
    }
    const start = (await axios.post(`/api/game-accounts/${accountId}/start`, {}, local)).data
    if (!start.success) throw new Error(start.message || '启动角色失败，请稍后重试')
  },
  signIn(id: number) { return mutate(`/${id}/sign-in`, {}, new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10)) },
  claim(id: number, payload: {
    rewardId: string; optionId: string; participationId?: number; day?: string; targetAccountId?: number
  }) { return mutate(`/${id}/claim`, payload) },
  async claims(page = 1): Promise<{ records: ActivityClaim[]; total: number }> {
    return unwrap((await axios.get(`${root}/claims`, { ...local, params: { page, pageSize: 20 } })).data)
  },
  async adminList(token?: string): Promise<ActivityConfig[]> {
    return unwrap((await axios.get(`${root}/admin/list`, adminOptions(token))).data)
  },
  async uploadBackground(image: string, token?: string): Promise<{ url: string }> {
    return unwrap((await axios.post(`${root}/admin/backgrounds`, { image }, adminOptions(token))).data)
  },
  async remove(id: number, token?: string): Promise<{ id: number; deleted: boolean }> {
    return unwrap((await axios.delete(`${root}/admin/${id}`, adminOptions(token))).data)
  },
  async save(config: ActivityConfig, token?: string): Promise<{ id: number }> {
    const options = adminOptions(token)
    return unwrap((await (config.id
      ? axios.put(`${root}/admin/${config.id}`, config, options)
      : axios.post(`${root}/admin`, config, options))).data)
  },
}

function adminOptions(token?: string): AxiosRequestConfig {
  return { ...local, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }
}
export function activityError(error: any): string {
  return error.response?.data?.message || error.message || '操作失败，请稍后重试'
}
export function formatActivityTime(value: number | string) {
  return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
export function rewardText(type: string, value: number) {
  return type === 'card' ? `${value} 点福利卡` : type === 'time' ? `${value} 小时时长` : `${value} 点数`
}
