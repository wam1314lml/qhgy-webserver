import axios from '../../utils/axios'
import type { ConfigObject } from './core'

import type { AccountImportApi, ImportAccount } from './accountImport'
import { importError } from './accountImport'
const isObject = (value: unknown): value is ConfigObject =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const options = { handleErrorLocally: true }

function checkResponse(response: { status: number; data: any }) {
  const body = response.data
  if (response.status !== 200 || !isObject(body) ||
      (!('success' in body) && !('code' in body)) ||
      ('success' in body && body.success !== true) || ('code' in body && body.code !== 200)) {
    throw new Error(importError({ response }))
  }
  return body
}

export const accountImportApi: AccountImportApi = {
  async list() {
    const body = checkResponse(await axios.get('/api/game-accounts/list', options))
    if (!Array.isArray(body.data)) throw new Error('未获取到完整游戏账号列表，请重试')
    const seen = new Set<number>()
    return body.data.flatMap((row: any) => {
      const id = Number(row.id)
      if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) return []
      seen.add(id)
      const name = row.nickname || row.account_name || row.username || `账号${id}`
      const server = row.server_name || row.server_id
      return [{ value: id, label: server ? `${name}（${server}）` : String(name) }]
    })
  },
  async read(id) {
    const body = checkResponse(await axios.get(`/api/game-accounts/${id}/setting`, options))
    if (!isObject(body.data) || !Object.keys(body.data).length || body.data.error) {
      throw new Error('未读取到有效的已保存配置，未覆盖该账号')
    }
    return body.data
  },
  async save(id, config) {
    const body = checkResponse(await axios.put(`/api/game-accounts/${id}/setting/import`, config, options))
    if (isObject(body.data) && body.data.updated === false) throw new Error('服务端未确认配置更新，请刷新核对')
  },
}
