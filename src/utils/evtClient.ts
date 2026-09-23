import { EvtHistoryStore, parseEvtLines, type EvtHistoryPage } from './evtHistoryStorage'

type Request = (path: string, params: Record<string, unknown>) => Promise<any>
type Mode = 'probing' | 'v2' | 'legacy' | 'fallback'

/** 与 Vue 无关的单账号读取器。代次隔离关闭/切号的旧响应，每个游标只有一个在途请求。 */
export class EvtClient {
  readonly store = new EvtHistoryStore()
  pages: Record<string, EvtHistoryPage> = {}
  mode: Mode = 'probing'
  error = ''
  online = false
  limited = false
  stale = false
  updatedAt = 0
  availableFrom = 0
  private accountId = 0
  private generation = 0
  private active = false
  private polling = false
  private pendingModules = new Set<string>()
  private revision = ''
  private epoch = ''
  private liveCursor: string | null = null
  private lastLine = 0
  private streamId = ''

  constructor(private request: Request, private changed: () => void, private now = () => Date.now()) {}

  reset(accountId: number) {
    this.generation++
    this.accountId = accountId
    this.active = true
    this.polling = false
    this.pendingModules = new Set()
    this.mode = 'probing'
    this.pages = {}
    this.revision = this.epoch = this.streamId = ''
    this.liveCursor = null
    this.lastLine = this.updatedAt = this.availableFrom = 0
    this.online = false
    this.limited = this.stale = false
    this.error = ''
    this.store.clear()
    this.changed()
  }

  stop() { this.active = false; this.generation++; this.polling = false }
  private current(generation: number) { return this.active && generation === this.generation }

  private async get(path: string, params: Record<string, unknown> = {}) {
    let body: any
    try {
      body = await this.request(`/api/game-accounts/${path}`, { id: this.accountId, ...params })
    } catch (cause: any) {
      // Axios对非2xx直接抛错；优先保留服务端解释，避免只显示泛化的HTTP400。
      const status = cause?.response?.status ?? cause?.status
      const serverMessage = cause?.response?.data?.msg
      if (typeof serverMessage !== 'string' || !serverMessage.trim() || serverMessage.length > 256) throw cause
      const label = path === 'evt-state' ? '当前状态' : '事件历史'
      const error = new Error(`${label}${status ? `（HTTP ${status}）` : ''}：${serverMessage}`) as Error & { status?: number }
      error.status = status
      throw error
    }
    if (body?.code !== 200 || !body?.data?.success) {
      const error = new Error(body?.msg || '读取失败') as Error & { status?: number }
      error.status = body?.code
      throw error
    }
    return body.data
  }

  private unsupported(error: any) { return [404, 405, 501].includes(error?.status ?? error?.response?.status) }
  private invalidCursor(error: any) { return [400, 410].includes(error?.status ?? error?.response?.status) }

  private async history(params: Record<string, unknown>, generation: number) {
    try { return await this.get('evt-history', params) } catch (error) {
      if (!params.cursor || !this.invalidCursor(error) || !this.current(generation)) throw error
      // 轮转/到期游标从最新页恢复，缓存记录保留并按ID去重。
      const recovered = await this.get('evt-history', { ...params, direction: 'older', cursor: undefined })
      if (params.direction === 'newer') return { ...recovered, nextCursor: recovered.liveCursor, hasMore: false }
      return recovered
    }
  }

  private applyState(data: any) {
    if (data.protocol !== 2) throw new Error('状态接口版本不兼容')
    this.online = data.online === true
    this.limited = data.limited === true
    this.stale = data.stale === true
    this.updatedAt = Number(data.updatedAt) || 0
    // unchanged 的空 modules 是“没有变化”，不是“删除所有状态”。
    if (!data.unchanged) this.store.replaceStates(data.modules ?? {})
    this.revision = data.revision || ''
    this.epoch = data.epoch || ''
  }

  private applyHistory(data: any) {
    if (data.protocol !== 2 || !Array.isArray(data.events)) throw new Error('历史接口版本不兼容')
    this.store.ingest(data.events, this.now())
    this.availableFrom = Number(data.availableFrom) || this.availableFrom
    const modules = Array.isArray(data.modules) ? data.modules : []
    this.store.ensureModules(modules.map((entry: any) => entry.module).filter((module: unknown) => typeof module === 'string'))
    const pages = { ...this.pages }
    for (const item of modules) {
      if (typeof item.module === 'string') pages[item.module] = { ...pages[item.module], count: Number(item.count) || 0 }
    }
    this.pages = pages
  }

  async poll() {
    if (!this.active || this.polling) return
    this.polling = true
    const generation = this.generation
    try {
      if (this.mode === 'probing') {
        const [state, history] = await Promise.allSettled([
          this.get('evt-state'), this.get('evt-history', { direction: 'older', limit: 200 }),
        ])
        if (!this.current(generation)) return
        const rejected = [state, history].filter(result => result.status === 'rejected') as PromiseRejectedResult[]
        if (rejected.some(result => this.unsupported(result.reason))) {
          this.mode = 'legacy'
        } else {
          // 一个接口暂时失败时，另一个已经读到的状态/事件仍然可用。
          if (state.status === 'fulfilled') this.applyState(state.value)
          if (history.status === 'fulfilled') {
            this.applyHistory(history.value)
            this.liveCursor = history.value.liveCursor
            this.mode = 'v2'
          }
          if (rejected.length) throw rejected[0].reason
        }
      } else if (this.mode === 'v2') {
        const [stateResult, historyResult] = await Promise.allSettled([
          this.get('evt-state', { stateVersion: this.revision }),
          this.history({ direction: 'newer', cursor: this.liveCursor, limit: 200 }, generation),
        ])
        if (!this.current(generation)) return
        if (stateResult.status === 'fulfilled') this.applyState(stateResult.value)
        if (historyResult.status === 'fulfilled') {
          let history = historyResult.value
          // 批次有上限，剩余积压下轮续读，不阻塞交互、不跳过游标。
          for (let page = 0; page < 5; page++) {
            const previous = this.liveCursor
            this.applyHistory(history)
            this.liveCursor = history.nextCursor || history.liveCursor || previous
            if (!history.hasMore || this.liveCursor === previous || page === 4) break
            history = await this.history({ direction: 'newer', cursor: this.liveCursor, limit: 200 }, generation)
            if (!this.current(generation)) return
          }
        }
        if (stateResult.status === 'rejected') throw stateResult.reason
        if (historyResult.status === 'rejected') throw historyResult.reason
      }
      if (this.mode === 'legacy') {
        try {
          const data = await this.get('evt-stream-poll', { lastLine: this.lastLine, streamId: this.streamId })
          if (!this.current(generation)) return
          this.store.ingest(parseEvtLines(data.logs ?? []), this.now(), true)
          this.lastLine = data.lastLine
          this.streamId = data.streamId || ''
        } catch (error) {
          if (!this.current(generation)) return
          if (this.unsupported(error)) this.mode = 'fallback'
          else throw error
        }
      }
      this.error = ''
    } catch (error: any) {
      if (this.current(generation)) this.error = error?.message || '读取事件日志失败'
    } finally {
      if (this.current(generation)) {
        this.polling = false
        this.store.prune(this.now())
        this.changed()
      }
    }
  }

  async loadOlder(module: string) {
    if (!this.active || this.mode !== 'v2' || this.pendingModules.has(module)) return
    const page = this.pages[module] ?? {}
    if (page.loaded && !page.hasMore && !page.error) return
    const generation = this.generation
    this.pendingModules.add(module)
    this.pages = { ...this.pages, [module]: { ...page, loading: true, error: '' } }
    this.changed()
    try {
      const data = await this.history({ module, direction: 'older', cursor: page.cursor || undefined, limit: 200 }, generation)
      if (!this.current(generation)) return
      this.applyHistory(data)
      this.pages = { ...this.pages, [module]: { ...this.pages[module], loaded: true, loading: false,
        cursor: data.nextCursor, hasMore: data.hasMore === true, error: '' } }
    } catch (error: any) {
      if (this.current(generation)) this.pages = { ...this.pages, [module]: { ...this.pages[module], loading: false, error: error?.message || '读取失败，请重试' } }
    } finally {
      if (this.current(generation)) { this.pendingModules.delete(module); this.changed() }
    }
  }

  ingestFallback(lines: string[]) {
    if (!this.active || this.mode !== 'fallback') return
    this.store.ingest(parseEvtLines(lines), this.now(), true)
    this.changed()
  }

  get notice() {
    if (this.error) return `读取暂时失败：${this.error}；已加载记录保留，自动刷新时重试。`
    if (this.mode === 'probing') return '正在读取状态与事件记录…'
    if (this.mode !== 'v2') return '当前为旧版日志接口，仅展示可读取的记录，无法保证覆盖24小时。'
    const stateText = this.limited || this.stale
      ? '状态暂未更新，当前显示上次收到的内容；历史记录仍可独立查看。'
      : this.online ? '' : '账号未在线，状态为最后收到的快照。'
    const range = this.availableFrom ? `现存记录最早为${new Date(this.availableFrom).toLocaleString('zh-CN', { hour12: false })}。` : ''
    return `所有模块可查询最近24小时完整事件，不限条数。历史按需加载，升级前已丢失的记录无法补回。${range}${stateText}`
  }
}
