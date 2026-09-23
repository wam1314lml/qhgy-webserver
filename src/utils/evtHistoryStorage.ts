/** 普通日志仍按条数截断；EVT 的状态、事件和保留策略独立处理。 */
export const MAX_LOG_HISTORY = 2500
export const EVT_RETENTION_MS = 24 * 60 * 60 * 1000
export const EVT_OTHER_MODULE_LIMIT = Infinity
export const EVT_IMPORTANT_MODULES = new Set(['订单系统', '组合订单', '土地系统', '兑换码', '花卉系统', '珍珠系统'])

export interface EvtEvent {
  id: string
  ts: number
  module: string
  title: string
  status: 'success' | 'failed' | 'info' | 'warning'
  desc?: string
  gains?: { name: string; count: number; icon?: string }[]
  kv?: { label: string; value: unknown; color?: string }[]
  silent?: boolean
  meta?: { layout?: Record<string, any>; [key: string]: any }
}

export interface EvtModuleView {
  module: string
  events: EvtEvent[] // 新到旧，直接交给虚拟列表，渲染时不再复制/排序。
  latest: EvtEvent | null
  latestStatus: string
  successCount: number
  failedCount: number
  warningCount: number
  infoCount: number
  layout: Record<string, any> | null
}

export interface EvtHistoryPage {
  loaded?: boolean
  loading?: boolean
  hasMore?: boolean
  cursor?: string | null
  error?: string
  count?: number
}

interface ModuleEntry {
  view: EvtModuleView
  ids: Set<string>
  fieldTimes: Map<string, number>
  stateLatest?: EvtEvent | null
}

export function trimLogLines(content: string, maxLines = MAX_LOG_HISTORY): string {
  return content.split('\n').filter(Boolean).slice(-maxLines).join('\n')
}

/** 丢弃旧双缓存，不读取、不再同步写入大段日志。 */
export function removeLegacyEvtCache(accId: number) {
  try {
    localStorage.removeItem(`evt_raw_lines_acc${accId}`)
    localStorage.removeItem(`evt_cache_v2_acc${accId}`)
  } catch { /* 隐私模式不妨碍内存视图。 */ }
}

export function parseEvtLines(lines: readonly string[]): EvtEvent[] {
  const result: EvtEvent[] = []
  for (const line of lines) {
    const start = line.indexOf('[[EVT]]')
    if (start < 0) continue
    try {
      const value = JSON.parse(line.slice(start + 7))
      if (validEvent(value)) result.push(value)
    } catch { /* 旧日志中的不完整行不影响下一条。 */ }
  }
  return result
}

function validEvent(value: any): value is EvtEvent {
  return !!value && typeof value.id === 'string' && typeof value.module === 'string'
    && value.module.length > 0 && Number.isFinite(value.ts)
}

/** 只保存已加载的历史。服务器仍是24小时历史的来源，页面关闭无需落盘。 */
export class EvtHistoryStore {
  private entries = new Map<string, ModuleEntry>()

  private entry(module: string): ModuleEntry {
    let entry = this.entries.get(module)
    if (!entry) {
      entry = {
        ids: new Set(), fieldTimes: new Map(),
        view: { module, events: [], latest: null, latestStatus: 'info', layout: null,
          successCount: 0, failedCount: 0, warningCount: 0, infoCount: 0 },
      }
      this.entries.set(module, entry)
    }
    return entry
  }

  ensureModules(modules: string[]) { for (const module of modules) this.entry(module) }

  /** 新接口提供完整的已合并模块状态；历史事件里的 layout 不会进入这里。 */
  replaceStates(states: Record<string, { layout: Record<string, any> | null; latest?: EvtEvent | null }>) {
    for (const [module, entry] of this.entries) {
      if (!(module in states)) {
        entry.stateLatest = null
        entry.view = { ...entry.view, layout: null }
        this.summarize(entry, false)
      }
    }
    for (const [module, state] of Object.entries(states)) {
      const entry = this.entry(module)
      entry.view = { ...entry.view, layout: state.layout }
      entry.stateLatest = state.latest
      entry.fieldTimes.clear()
      this.summarize(entry, false)
    }
  }

  /** 旧接口兼容只使用较新的分区字段，避免轮转重放旧行回滚状态。 */
  private applyLegacyState(event: EvtEvent) {
    if (!event.meta?.layout) return
    const entry = this.entry(event.module)
    const layout = { ...entry.view.layout }
    let changed = false
    for (const [field, value] of Object.entries(event.meta.layout)) {
      if (value !== undefined && event.ts >= (entry.fieldTimes.get(field) ?? -Infinity)) {
        layout[field] = value
        entry.fieldTimes.set(field, event.ts)
        changed = true
      }
    }
    if (changed) entry.view = { ...entry.view, layout }
  }

  ingest(events: readonly EvtEvent[], now = Date.now(), legacy = false) {
    const touched = new Set<ModuleEntry>()
    for (const event of events) {
      if (!validEvent(event)) continue
      if (legacy) this.applyLegacyState(event)
      if (event.silent || event.ts < now - EVT_RETENTION_MS) continue
      const entry = this.entry(event.module)
      if (entry.ids.has(event.id)) continue
      entry.ids.add(event.id)
      const { layout, ...meta } = event.meta ?? {}
      // 旧协议 kv 位于 layout，仍保留每次操作的具体值；大展示状态不进历史。
      const kv = event.kv ?? (Array.isArray(layout?.kvList) ? layout.kvList : undefined)
      const compact = { ...event, ...(kv ? { kv } : {}), meta: Object.keys(meta).length ? meta : undefined }
      if (!touched.has(entry)) entry.view = { ...entry.view, events: [...entry.view.events] }
      entry.view.events.push(compact)
      touched.add(entry)
    }
    for (const entry of touched) entry.view.events.sort((a, b) => b.ts - a.ts || b.id.localeCompare(a.id))
    this.prune(now, touched)
  }

  private summarize(entry: ModuleEntry, countEvents = true) {
    const counts = countEvents ? { success: 0, failed: 0, warning: 0, info: 0 } : {
      success: entry.view.successCount, failed: entry.view.failedCount,
      warning: entry.view.warningCount, info: entry.view.infoCount,
    }
    if (countEvents) for (const event of entry.view.events) counts[Object.prototype.hasOwnProperty.call(counts, event.status) ? event.status : 'info']++
    const historyLatest = entry.view.events[0] ?? null
    const latest = (entry.stateLatest?.ts ?? 0) > (historyLatest?.ts ?? 0) ? entry.stateLatest! : historyLatest
    entry.view = { ...entry.view, latest, latestStatus: latest?.status ?? 'info',
      successCount: counts.success, failedCount: counts.failed,
      warningCount: counts.warning, infoCount: counts.info }
  }

  prune(now = Date.now(), touched = new Set<ModuleEntry>()) {
    for (const entry of this.entries.values()) {
      const events = entry.view.events
      const firstExpired = events.length && events[events.length - 1].ts < now - EVT_RETENTION_MS
        ? events.findIndex(event => event.ts < now - EVT_RETENTION_MS) : -1
      const max = EVT_IMPORTANT_MODULES.has(entry.view.module) ? events.length : EVT_OTHER_MODULE_LIMIT
      const length = Math.min(max, firstExpired < 0 ? events.length : firstExpired)
      if (length !== events.length) {
        entry.view = { ...entry.view, events: events.slice(0, length) }
        entry.ids = new Set(entry.view.events.map(event => event.id))
        touched.add(entry)
      }
    }
    for (const entry of touched) this.summarize(entry)
  }

  snapshot(): EvtModuleView[] { return [...this.entries.values()].map(entry => entry.view) }
  clear() { this.entries.clear() }
}
