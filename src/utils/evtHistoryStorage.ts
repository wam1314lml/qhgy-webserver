/** EVT 事件历史 localStorage 工具（原始行 + 模块卡片缓存） */

export const EVT_LINES_CACHE_KEY = (accId?: number) => `evt_raw_lines_acc${accId ?? 0}`
export const EVT_CACHE_KEY = (accId?: number, version = 2) =>
  `evt_cache_v${version}_acc${accId ?? 0}`

const EVT_LAST_AUTO_CLEAR_KEY = 'evt_last_auto_clear_date'

function getLocalDateKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function markAutoClearedToday() {
  try {
    localStorage.setItem(EVT_LAST_AUTO_CLEAR_KEY, getLocalDateKey())
  } catch {}
}

/** 清除所有账号的 EVT 原始行与模块卡片缓存 */
export function clearAllEvtHistory() {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('evt_raw_lines_acc') || key.startsWith('evt_cache_v')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
    markAutoClearedToday()
  } catch {}
}

export function clearEvtLines(accId?: number) {
  try {
    localStorage.removeItem(EVT_LINES_CACHE_KEY(accId))
  } catch {}
}

export function loadEvtLines(accId?: number): string {
  try {
    return localStorage.getItem(EVT_LINES_CACHE_KEY(accId)) ?? ''
  } catch {
    return ''
  }
}

export function saveEvtLines(lines: string, accId?: number, maxLines = 2000) {
  try {
    const trimmed = lines.split('\n').filter(Boolean).slice(-maxLines).join('\n')
    localStorage.setItem(EVT_LINES_CACHE_KEY(accId), trimmed)
  } catch {}
}

/** 若已进入新的一天且尚未自动清理，则清除全部 EVT 历史并返回 true */
export function runDailyAutoClearIfNeeded(): boolean {
  try {
    const today = getLocalDateKey()
    const last = localStorage.getItem(EVT_LAST_AUTO_CLEAR_KEY)
    if (last === null) {
      // 首次启用：仅记录日期，不清除当天已有缓存
      markAutoClearedToday()
      return false
    }
    if (last === today) return false
    clearAllEvtHistory()
    return true
  } catch {
    return false
  }
}

/** 调度每日 0 点自动清理；返回取消函数 */
export function scheduleMidnightEvtClear(onClear: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const scheduleNext = () => {
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)
    const delay = nextMidnight.getTime() - now.getTime()

    timeoutId = setTimeout(() => {
      if (runDailyAutoClearIfNeeded()) {
        onClear()
      }
      scheduleNext()
    }, delay)
  }

  scheduleNext()
  return () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
