import axios from '../../utils/axios'
import type { SharePayload, ShareResult } from './core'

export type ShareMetadata = Omit<ShareResult, 'config'>
export interface ConfigShareApi {
  create(payload: SharePayload): Promise<ShareMetadata>
  resolve(code: string): Promise<ShareResult>
}
export function createConfigShareApi(projectId: string): ConfigShareApi {
  const options = { handleErrorLocally: true }
  return {
    async create(payload) {
      const response = await axios.post('/api/config-shares', payload, options)
      if (!response.data?.success) throw new Error(response.data?.message || '生成分享码失败')
      return response.data.data
    },
    async resolve(code) {
      const response = await axios.post('/api/config-shares/resolve', { project: projectId, code }, options)
      if (!response.data?.success) throw new Error(response.data?.message || '读取分享码失败')
      return response.data.data
    },
  }
}
