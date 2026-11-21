import axios from '@/utils/axios'

export type RedeemChannel = 'wechat_douyin' | 'alipay'
export interface RedeemInput { channel: RedeemChannel; code: string; startHour?: number }
export interface RedeemStatus { retryAfter: number; pending: RedeemInput | null }
export interface RedeemResult extends RedeemStatus { outcome: 'added' | 'duplicate' }
const root = '/api/redeem-uploads'
const options = { handleErrorLocally: true }
function unwrap<T>(body: { success?: boolean; data?: T; message?: string }): T {
  if (body?.success !== true || !body.data) throw new Error(body?.message || '上传服务返回异常，请稍后重试')
  return body.data
}
export const redeemUploadApi = {
  async status(): Promise<RedeemStatus> { return readStatus(unwrap((await axios.get(`${root}/status`, options)).data)) },
  async submit(input: RedeemInput): Promise<RedeemResult> {
    const value = unwrap<RedeemResult>((await axios.post(root, input, options)).data)
    if (value.outcome !== 'added' && value.outcome !== 'duplicate') throw new Error('提交结果尚未确认，请保留原兑换码重试')
    return { ...readStatus(value), outcome: value.outcome }
  },
}
function readStatus(value: RedeemStatus): RedeemStatus {
  if (!Number.isInteger(value.retryAfter) || value.retryAfter < 0 || value.retryAfter > 1800 ||
      (value.pending !== null && (!value.pending ||
        !['wechat_douyin', 'alipay'].includes(value.pending.channel) || typeof value.pending.code !== 'string' || codeInputError(value.pending.code)
        || (value.pending.startHour !== undefined && (!Number.isInteger(value.pending.startHour) || value.pending.startHour < -1 || value.pending.startHour > 23))))) {
    throw new Error('上传状态尚未确认，请稍后重试')
  }
  return value
}
export function codeInputError(raw: string): string {
  const code = raw.trim()
  return !code || code.length > 256 || /[\s,，;；\x00-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(code)
    ? '请填写一个完整兑换码（最多256字，不含空格或分隔符）' : ''
}
