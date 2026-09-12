type RecordState = { id: string | number; isStarted: boolean; status?: string }

const asObject = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined

// record:null 也可能是正常的未启动账号，不能把它当成失败；缺少 isStarted 才是未知状态。
export const hasPlayerRecordState = (value: unknown): value is RecordState => {
  const record = asObject(value)
  return !!record && typeof record.isStarted === 'boolean' &&
    /^(?:\d+)$/.test(String(record.id)) &&
    !['error', 'failed', 'failure'].includes(String(record.status || '').toLowerCase())
}

/** 只重试状态查询，保留已拿到的记录，后续只补查缺失账号。最多查询3次。 */
export const fetchPlayerRecordsWithRetry = async <T extends RecordState>(
  accountIds: number[],
  fetchRecords: (ids: number[]) => Promise<unknown>,
  options: {
    expectedStarted?: boolean
    wait?: (ms: number) => Promise<unknown>
    isCurrent?: () => boolean
  } = {},
) => {
  const ids = [...new Set(accountIds)].slice(0, 100)
  const records = new Map<number, T>()
  let pending = ids
  const wait = options.wait || ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)))
  const isCurrent = options.isCurrent || (() => true)

  for (let attempt = 0; pending.length > 0 && attempt < 3 && isCurrent(); attempt++) {
    if (attempt > 0) await wait(attempt * 500)
    if (!isCurrent()) break
    try {
      const body = asObject(await fetchRecords(pending))
      if (!isCurrent()) break
      const data = asObject(body?.data)
      if (body?.code === 200 && Array.isArray(data?.results)) {
        for (const record of data.results) {
          if (!hasPlayerRecordState(record)) continue
          const id = Number(record.id)
          if (!pending.includes(id)) continue
          if (options.expectedStarted !== undefined && record.isStarted !== options.expectedStarted) continue
          records.set(id, record as T)
        }
      }
    } catch (error) {
      // 登录、权限等确定的业务错误不自动重试；网络异常与5xx可重试读取。
      const status = Number(asObject(asObject(error)?.response)?.status)
      if ((status >= 400 && status < 500) || asObject(error)?.code === 'ERR_CANCELED' ||
        asObject(error)?.message === 'Token invalid') break
    }
    pending = ids.filter(id => !records.has(id))
  }

  return {
    success: ids.length === 0 || records.size > 0,
    records: ids.flatMap(id => records.has(id) ? [records.get(id)!] : []),
    total: ids.length,
    successCount: records.size,
    errorCount: ids.length - records.size,
    reason: records.size === ids.length ? '' : '部分账号运行状态暂未获取到',
  }
}

/** 只识别后端明确的“已运行”反馈，不把普通启动失败、网络错误当成成功。 */
export const isAccountAlreadyRunning = (value: unknown): boolean => {
  const body = asObject(value)
  if (!body) return false
  const detail = asObject(body.data)
  return [body.message, body.error, detail?.msg, detail?.message].some(
    value => typeof value === 'string' && /账号(?:已在运行中|已经在运行中|已在运行|已经在运行)/.test(value),
  )
}
