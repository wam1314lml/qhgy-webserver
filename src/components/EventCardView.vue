<template>
  <div class="evt-view">
    <div v-if="cards.length === 0" class="evt-empty">
      <div class="evt-empty-icon">📭</div>
      <p>暂无事件数据</p>
      <p class="evt-empty-hint">日志中包含 [[EVT]] 标记的行将在此显示</p>
    </div>

    <div v-else class="evt-cards">
      <!-- 顶部工具栏：清除缓存 -->
      <div class="evt-toolbar">
        <span class="evt-toolbar-info">已缓存 {{ cards.length }} 个模块事件（历史保留，即使日志刷新也不丢失）</span>
        <button class="evt-clear-btn" @click="clearCache" title="清除所有已缓存的 EVT 事件记录">🗑 清除历史</button>
      </div>
      <div
        v-for="card in cards"
        :key="card.module"
        class="evt-card"
        :class="`evt-card--${card.latestStatus}`"
      >
        <!-- ══ 卡片头部 ══ -->
        <div class="evt-card-header">

          <!-- 标题行 + 右侧统计 -->
          <div class="evt-card-title-row">
            <div class="evt-card-title-left">
              <span class="evt-card-module">{{ card.module }}</span>
              <!-- 副标题 -->
              <span v-if="card.layout?.subtitle" class="evt-card-subtitle">{{ card.layout.subtitle }}</span>
            </div>
            <!-- headerStats：右上角徽标 -->
            <div v-if="card.layout?.headerStats?.length" class="evt-header-stats">
              <span
                v-for="stat in card.layout.headerStats"
                :key="stat.label"
                class="evt-stat-badge"
                :style="statStyle(stat.color)"
                :title="stat.tip"
              >{{ stat.label }} {{ stat.value }}</span>
            </div>
            <!-- 降级：显示成功/失败/警告计数 -->
            <div v-else class="evt-card-badges">
              <span v-if="card.successCount > 0" class="evt-badge evt-badge--success">✓ {{ card.successCount }}</span>
              <span v-if="card.failedCount  > 0" class="evt-badge evt-badge--failed">✗ {{ card.failedCount }}</span>
              <span v-if="card.warningCount > 0" class="evt-badge evt-badge--warning">⚠ {{ card.warningCount }}</span>
              <span v-if="card.infoCount    > 0" class="evt-badge evt-badge--info">i {{ card.infoCount }}</span>
            </div>
          </div>

          <!-- 最近事件摘要行 -->
          <div v-if="card.latest" class="evt-card-summary">
            <span class="evt-card-time">{{ formatTime(card.latest.ts) }}</span>
            <span class="evt-card-latest-title">{{ card.latest.title }}</span>
            <span v-if="card.latest.desc" class="evt-card-latest-desc">{{ card.latest.desc }}</span>
          </div>

          <!-- ┌─ 组件区 1: tags 标签行 ─┐ -->
          <div v-if="card.layout?.tags?.length" class="evt-tags">
            <span
              v-for="(tag, i) in card.layout.tags"
              :key="i"
              class="evt-tag"
              :style="statStyle(tag.color)"
              :title="tag.tip"
            >{{ tag.icon ? tag.icon + ' ' : '' }}{{ tag.label }}</span>
          </div>
          <!-- 降级：显示最近事件 gains -->
          <div v-else-if="card.latest?.gains?.length" class="evt-tags">
            <span v-for="g in card.latest.gains" :key="g.name" class="evt-tag evt-tag--blue">
              {{ g.icon || '' }} {{ g.name }} x{{ g.count }}
            </span>
          </div>

          <!-- ┌─ 组件区 2: progress 进度条 ─┐ -->
          <div v-if="card.layout?.progress" class="evt-progress-wrap">
            <div class="evt-progress-label">
              <span>{{ card.layout.progress.label }}</span>
              <span class="evt-progress-value">{{ card.layout.progress.current }}/{{ card.layout.progress.total }}</span>
            </div>
            <div class="evt-progress-bar">
              <div
                class="evt-progress-fill"
                :style="{
                  width: progressPct(card.layout.progress) + '%',
                  background: progressColor(card.layout.progress)
                }"
              ></div>
            </div>
          </div>

          <!-- ┌─ 组件区 3: 多进度条 multiProgress ─┐ -->
          <div v-if="card.layout?.multiProgress?.length" class="evt-multi-progress">
            <div v-for="(p, i) in card.layout.multiProgress" :key="i" class="evt-progress-wrap">
              <div class="evt-progress-label">
                <span>{{ p.label }}</span>
                <span class="evt-progress-value">{{ p.current }}/{{ p.total }}</span>
              </div>
              <div class="evt-progress-bar">
                <div class="evt-progress-fill" :style="{ width: progressPct(p) + '%', background: progressColor(p) }"></div>
              </div>
            </div>
          </div>

          <!-- ┌─ 组件区 4: 键值对列表 kvList ─┐ -->
          <div v-if="card.layout?.kvList?.length" class="evt-kv-list">
            <div v-for="(kv, i) in card.layout.kvList" :key="i" class="evt-kv-item">
              <span class="evt-kv-label">{{ kv.label }}</span>
              <span class="evt-kv-value" :style="kv.color ? { color: colorText(kv.color) } : {}">{{ kv.value }}</span>
            </div>
          </div>

          <!-- ┌─ 组件区 5: 告警横幅 alert ─┐ -->
          <div
            v-if="card.layout?.alert"
            class="evt-alert"
            :class="`evt-alert--${card.layout.alert.type || 'info'}`"
          >
            <span class="evt-alert-icon">{{ alertIcon(card.layout.alert.type) }}</span>
            <span>{{ card.layout.alert.message }}</span>
          </div>

        </div><!-- /evt-card-header -->

        <!-- ══ 可折叠区块 ══ -->

        <!-- ┌─ 组件区 6: grid 格子网格 ─┐ -->
        <template v-if="card.layout?.grid">
          <div class="evt-section-toggle" @click="toggleSection(card.module, 'grid')">
            <span>{{ card.layout.grid.label || '格子列表' }}（{{ card.layout.grid.items.length }} 个）</span>
            <span class="evt-toggle-arrow">{{ expanded(card.module, 'grid') ? '▲ 收起' : '▼ 展开' }}</span>
          </div>
          <div
            v-if="expanded(card.module, 'grid')"
            class="evt-grid"
            :class="{ 'evt-grid--guild-tasks': isGuildTaskModule(card.module) }"
            :style="gridStyle(card.layout.grid.columns)"
          >
            <div
              v-for="item in card.layout.grid.items"
              :key="item.id"
              class="evt-grid-item"
              :class="gridItemClass(item)"
              :title="item.tip"
            >
              <!-- 右上角角标 -->
              <span v-if="item.badge" class="evt-grid-badge" :style="statStyle(item.badgeColor)">{{ item.badge }}</span>
              <div class="evt-grid-title">{{ item.title }}</div>
              <div v-if="item.subtitle" class="evt-grid-subtitle">{{ item.subtitle }}</div>
              <!-- 分数 / 升级 -->
              <div v-if="item.isUpgrade" class="evt-grid-score">
                <span class="score-before">{{ item.score }}分</span>
                <span class="score-arrow">→</span>
                <span class="score-after">{{ item.scoreAfter }}分↑</span>
              </div>
              <div v-else-if="item.score != null" class="evt-grid-score">
                <span>{{ item.score }}分</span>
              </div>
              <!-- 额外数据行：tags -->
              <div v-if="item.tags?.length" class="evt-grid-tags">
                <span v-for="(t, ti) in item.tags" :key="ti" class="evt-tag evt-tag--xs" :style="statStyle(t.color)">{{ t.label }}</span>
              </div>
              <!-- 接取人 / 倒计时 / 进度 -->
              <div v-if="item.takenBy" class="evt-grid-taken">👤 {{ item.takenBy }}</div>
              <div v-else-if="item.countdown" class="evt-grid-countdown">⏱ {{ item.countdown }}</div>
              <div v-if="item.progress" class="evt-grid-progress">
                <div class="evt-grid-progress-bar">
                  <div class="evt-grid-progress-fill" :style="{ width: progressPct(item.progress) + '%' }"></div>
                </div>
                <span class="evt-grid-progress-text">{{ item.progress.current }}/{{ item.progress.total }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ┌─ 组件区 7: table 表格 ─┐ -->
        <template v-if="card.layout?.table">
          <div class="evt-section-toggle" @click="toggleSection(card.module, 'table')">
            <span>{{ card.layout.table.label || '数据表格' }}（{{ card.layout.table.rows.length }} 行）</span>
            <span class="evt-toggle-arrow">{{ expanded(card.module, 'table') ? '▲ 收起' : '▼ 展开' }}</span>
          </div>
          <div v-if="expanded(card.module, 'table')" class="evt-table-wrap">
            <table class="evt-table">
              <thead>
                <tr>
                  <th v-for="col in card.layout.table.columns" :key="col.key">{{ col.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, ri) in card.layout.table.rows"
                  :key="ri"
                  :class="row._rowClass"
                >
                  <td v-for="col in card.layout.table.columns" :key="col.key">
                    <span :style="row[col.colorKey] ? { color: colorText(row[col.colorKey]) } : {}">
                      {{ row[col.key] ?? '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- ┌─ 组件区 8: rankList 排行榜 ─┐ -->
        <template v-if="card.layout?.rankList?.length">
          <div class="evt-section-toggle" @click="toggleSection(card.module, 'rankList')">
            <span>{{ card.layout.rankListLabel || '排行榜' }}</span>
            <span class="evt-toggle-arrow">{{ expanded(card.module, 'rankList') ? '▲ 收起' : '▼ 展开' }}</span>
          </div>
          <div v-if="expanded(card.module, 'rankList')" class="evt-rank-list">
            <div
              v-for="(item, i) in card.layout.rankList"
              :key="i"
              class="evt-rank-item"
              :class="{ 'evt-rank-item--highlight': item.highlight }"
            >
              <span class="evt-rank-no" :class="rankNoClass(i)">{{ i + 1 }}</span>
              <span class="evt-rank-name">{{ item.name }}</span>
              <span class="evt-rank-value">{{ item.value }}</span>
              <span v-if="item.badge" class="evt-tag evt-tag--xs" :style="statStyle(item.badgeColor)">{{ item.badge }}</span>
            </div>
          </div>
        </template>

        <!-- ┌─ 组件区 9: statGrid 数字仪表格 ─┐ -->
        <template v-if="card.layout?.statGrid?.length">
          <div class="evt-section-toggle" @click="toggleSection(card.module, 'statGrid')">
            <span>{{ card.layout.statGridLabel || '数据面板' }}</span>
            <span class="evt-toggle-arrow">{{ expanded(card.module, 'statGrid') ? '▲ 收起' : '▼ 展开' }}</span>
          </div>
          <div v-if="expanded(card.module, 'statGrid')" class="evt-stat-grid">
            <div
              v-for="(s, i) in card.layout.statGrid"
              :key="i"
              class="evt-stat-cell"
              :style="statStyle(s.color)"
            >
              <div class="evt-stat-cell-value">{{ s.value }}</div>
              <div class="evt-stat-cell-label">{{ s.label }}</div>
              <div v-if="s.sub" class="evt-stat-cell-sub">{{ s.sub }}</div>
            </div>
          </div>
        </template>

        <!-- ┌─ 组件区 10: 时间线 timeline ─┐ -->
        <template v-if="card.layout?.timeline !== false">
          <div class="evt-section-toggle" @click="toggleSection(card.module, 'timeline')">
            <span>事件记录（{{ card.events.length }} 条）</span>
            <span class="evt-toggle-arrow">{{ expanded(card.module, 'timeline') ? '▲ 收起' : '▼ 展开' }}</span>
          </div>
          <div v-if="expanded(card.module, 'timeline')" class="evt-timeline">
            <div
              v-for="evt in [...card.events].reverse()"
              :key="evt.id"
              class="evt-tl-item"
              :class="`evt-tl-item--${evt.status}`"
            >
              <div class="evt-tl-dot"></div>
              <div class="evt-tl-body">
                <span class="evt-tl-time">{{ formatTime(evt.ts) }}</span>
                <span class="evt-tl-title">{{ evt.title }}</span>
                <span v-if="evt.desc" class="evt-tl-desc">{{ evt.desc }}</span>
                <!-- 时间线条目内嵌 tags -->
                <div v-if="evt.gains?.length" class="evt-tl-gains">
                  <span v-for="g in evt.gains" :key="g.name" class="evt-tag evt-tag--xs evt-tag--blue">
                    {{ g.icon || '' }} {{ g.name }} x{{ g.count }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div><!-- /evt-card -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// ── 类型定义 ────────────────────────────────────────────────────────────────

type Color = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange' | 'teal' | 'pink' | string

interface EvtGain { name: string; count: number; icon?: string }

/** 头部右上角统计徽标 */
interface LayoutStat  { label: string; value: string; color?: Color; tip?: string }

/** 标签行单个标签 */
interface LayoutTag   { label: string; color?: Color; icon?: string; tip?: string }

/** 进度条 */
interface LayoutProgress {
  label?:   string
  current:  number
  total:    number
  color?:   Color   // 覆盖默认颜色
  warn?:    number  // current >= warn 时变黄
  danger?:  number  // current >= danger 时变红
}

/** 键值对列表单行 */
interface LayoutKvItem { label: string; value: string; color?: Color }

/** 告警横幅 */
interface LayoutAlert { message: string; type?: 'info' | 'success' | 'warning' | 'error' }

/** 格子网格单元 */
interface LayoutGridItem {
  id:          string | number
  title:       string
  subtitle?:   string
  badge?:      string     // 右上角角标文字
  badgeColor?: Color
  score?:      number
  scoreAfter?: number
  isUpgrade?:  boolean
  status?:     'available' | 'taken' | 'pending' | 'locked'
  takenBy?:    string
  countdown?:  string
  tip?:        string
  tags?:       { label: string; color?: Color }[]
  progress?:   { current: number; total: number }
}

/** 格子网格 */
interface LayoutGrid {
  label?:   string
  columns?: number
  items:    LayoutGridItem[]
}

/** 表格列定义 */
interface LayoutTableCol { key: string; label: string; colorKey?: string }

/** 表格 */
interface LayoutTable {
  label?:   string
  columns:  LayoutTableCol[]
  rows:     Record<string, any>[]
}

/** 排行榜单行 */
interface LayoutRankItem { name: string; value: string; badge?: string; badgeColor?: Color; highlight?: boolean }

/** 数字仪表格单格 */
interface LayoutStatCell { label: string; value: string; sub?: string; color?: Color }

/** 完整 Layout 协议 */
interface Layout {
  subtitle?:       string             // 卡片副标题（在模块名旁）
  headerStats?:    LayoutStat[]       // 右上角统计徽标
  tags?:           LayoutTag[]        // 卡片头部标签行
  progress?:       LayoutProgress     // 单条进度条
  multiProgress?:  LayoutProgress[]   // 多条进度条
  kvList?:         LayoutKvItem[]     // 键值对列表
  alert?:          LayoutAlert        // 告警横幅
  grid?:           LayoutGrid         // 格子网格（可折叠）
  table?:          LayoutTable        // 表格（可折叠）
  rankList?:       LayoutRankItem[]   // 排行榜（可折叠）
  rankListLabel?:  string
  statGrid?:       LayoutStatCell[]   // 数字仪表格（可折叠）
  statGridLabel?:  string
  timeline?:       boolean            // 默认 true；false 时隐藏时间线
}

interface EvtEvent {
  id:      string
  ts:      number
  module:  string
  title:   string
  status:  'success' | 'failed' | 'info' | 'warning'
  desc?:   string
  gains?:  EvtGain[]
  silent?: boolean
  meta?:   { layout?: Layout; [k: string]: any }
}

interface EvtCard {
  module:       string
  events:       EvtEvent[]
  latest:       EvtEvent | null
  latestStatus: string
  successCount: number
  failedCount:  number
  warningCount: number
  infoCount:    number
  layout:       Layout | null
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ModuleCategory {
  name: string
  count: number
  color: string
}

const props = defineProps<{ rawLogs: string; accountId?: number; filterCategory?: string }>()
const emit = defineEmits<{
  (e: 'clear'): void
  (e: 'categories-change', categories: ModuleCategory[]): void
}>()

// ── localStorage 缓存 key ───────────────────────────────────────────────────

const CACHE_VERSION = 2
const cacheKey = (accId?: number) =>
  `evt_cache_v${CACHE_VERSION}_acc${accId ?? 0}`

/** 缓存结构：每个 module 独立存 events + layout（layout 单独持久化，不依赖 events） */
interface ModuleCache {
  events: EvtEvent[]
  layout: Layout | null
}

/** 从 localStorage 读取缓存 */
function loadCache(accId?: number): Map<string, ModuleCache> {
  try {
    const raw = localStorage.getItem(cacheKey(accId))
    if (!raw) return new Map()
    const obj: Record<string, ModuleCache> = JSON.parse(raw)
    return new Map(Object.entries(obj))
  } catch {
    return new Map()
  }
}

/** 写入 localStorage，每 module 保留最新 100 条 event */
function saveCache(moduleMap: Map<string, ModuleCache>, accId?: number) {
  try {
    const obj: Record<string, ModuleCache> = {}
    moduleMap.forEach((mc, mod) => {
      obj[mod] = {
        layout: mc.layout,
        events: [...mc.events].sort((a, b) => a.ts - b.ts).slice(-100),
      }
    })
    localStorage.setItem(cacheKey(accId), JSON.stringify(obj))
  } catch {
    // localStorage 满了或不可用，忽略
  }
}

// ── 折叠状态 ────────────────────────────────────────────────────────────────

const expandedSet = ref<Set<string>>(new Set())
const expanded    = (module: string, section: string) => expandedSet.value.has(`${module}:${section}`)
const toggleSection = (module: string, section: string) => {
  const key = `${module}:${section}`
  if (expandedSet.value.has(key)) { expandedSet.value.delete(key) } else { expandedSet.value.add(key) }
}

// ── 解析 & 聚合 ─────────────────────────────────────────────────────────────

const parseEvtLines = (raw: string): EvtEvent[] => {
  const events: EvtEvent[] = []
  for (const line of raw.split('\n')) {
    const idx = line.indexOf('[[EVT]]')
    if (idx === -1) continue
    try {
      const evt = JSON.parse(line.slice(idx + 7))
      if (evt?.id && evt?.module) events.push(evt as EvtEvent)
    } catch { /* ignore parse error */ }
  }
  return events
}

/**
 * 把新 events 追加合并进 moduleMap。
 * - silent 事件：只做 layout 分区合并，不加入 events（不出现在时间线/摘要）
 * - 普通事件：去重追加到 events，同时 layout 分区合并
 * layout 分区合并：新 layout 各字段只覆盖自身非 undefined 的部分，
 * 保留旧 layout 中其他字段（地块详情/任务缺口等不会被收获完成事件清掉）
 */
function mergeLayout(existing: Layout | null, incoming: Layout): Layout {
  const base: Layout = existing ? { ...existing } : {}
  // 逐字段合并，只覆盖 incoming 中明确提供的字段
  if (incoming.subtitle        !== undefined) base.subtitle        = incoming.subtitle
  if (incoming.headerStats     !== undefined) base.headerStats     = incoming.headerStats
  if (incoming.tags            !== undefined) base.tags            = incoming.tags
  if (incoming.progress        !== undefined) base.progress        = incoming.progress
  if (incoming.multiProgress   !== undefined) base.multiProgress   = incoming.multiProgress
  if (incoming.kvList          !== undefined) base.kvList          = incoming.kvList
  if (incoming.alert           !== undefined) base.alert           = incoming.alert
  if (incoming.grid            !== undefined) base.grid            = incoming.grid
  if (incoming.table           !== undefined) base.table           = incoming.table
  if (incoming.rankList        !== undefined) base.rankList        = incoming.rankList
  if (incoming.rankListLabel   !== undefined) base.rankListLabel   = incoming.rankListLabel
  if (incoming.statGrid        !== undefined) base.statGrid        = incoming.statGrid
  if (incoming.statGridLabel   !== undefined) base.statGridLabel   = incoming.statGridLabel
  if (incoming.timeline        !== undefined) base.timeline        = incoming.timeline
  return base
}

function mergeIntoMap(moduleMap: Map<string, ModuleCache>, newEvents: EvtEvent[]) {
  for (const evt of newEvents) {
    if (!moduleMap.has(evt.module)) moduleMap.set(evt.module, { events: [], layout: null })
    const mc = moduleMap.get(evt.module)!
    // layout 分区合并（不整体替换，保留旧字段）
    if (evt.meta?.layout) mc.layout = mergeLayout(mc.layout, evt.meta.layout)
    // silent 事件只更新 layout，不入时间线
    if (evt.silent) continue
    // 普通事件去重追加
    if (!mc.events.find(e => e.id === evt.id)) mc.events.push(evt)
  }
}

/** 把 moduleMap 转成 EvtCard[] */
function buildCards(moduleMap: Map<string, ModuleCache>): EvtCard[] {
  const result: EvtCard[] = []
  moduleMap.forEach((mc, module) => {
    const sorted = [...mc.events].sort((a, b) => a.ts - b.ts)
    const latest = sorted[sorted.length - 1] ?? null
    result.push({
      module,
      events:       sorted,
      latest,
      latestStatus: latest?.status ?? 'info',
      successCount: mc.events.filter(e => e.status === 'success').length,
      failedCount:  mc.events.filter(e => e.status === 'failed').length,
      warningCount: mc.events.filter(e => e.status === 'warning').length,
      infoCount:    mc.events.filter(e => e.status === 'info').length,
      layout:       mc.layout,
    })
  })
  return result
}

// ── 带缓存的响应式卡片列表 ───────────────────────────────────────────────────

// 初始从缓存加载（按当前 accountId）
const cachedModuleMap = ref<Map<string, ModuleCache>>(loadCache(props.accountId))

// accountId 变化时切换到对应账号的缓存
watch(
  () => props.accountId,
  (accId) => {
    cachedModuleMap.value = loadCache(accId)
  }
)

// rawLogs 变化时，追加新 EVT 到内存 + 持久化
watch(
  () => props.rawLogs,
  (raw) => {
    const newEvents = parseEvtLines(raw || '')
    if (newEvents.length === 0) return   // 没有新 EVT，不动缓存
    mergeIntoMap(cachedModuleMap.value, newEvents)
    // 触发 Vue 响应式更新
    cachedModuleMap.value = new Map(cachedModuleMap.value)
    saveCache(cachedModuleMap.value, props.accountId)
  },
  { immediate: true }
)

const MODULE_CATEGORY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]

function buildModuleCategories(moduleMap: Map<string, ModuleCache>): ModuleCategory[] {
  const allCards = buildCards(moduleMap)
  const total = allCards.reduce((sum, card) => sum + card.events.length, 0)
  return [
    { name: '全部', count: total, color: '#6b7280' },
    ...allCards.map((card, index) => ({
      name: card.module,
      count: card.events.length,
      color: MODULE_CATEGORY_COLORS[index % MODULE_CATEGORY_COLORS.length],
    })),
  ]
}

function syncModuleCategories() {
  emit('categories-change', buildModuleCategories(cachedModuleMap.value))
}

watch(cachedModuleMap, syncModuleCategories, { deep: true, immediate: true })

const cards = computed<EvtCard[]>(() => {
  const all = buildCards(cachedModuleMap.value)
  const filter = props.filterCategory
  if (!filter || filter === '全部') return all
  return all.filter((card) => card.module === filter)
})

/** 清除当前账号的 EVT 缓存，同时通知父组件清掉原始行缓存 */
function clearCache() {
  try { localStorage.removeItem(cacheKey(props.accountId)) } catch {}
  cachedModuleMap.value = new Map()
  emit('clear')
}

// ── 工具函数 ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  green:  { bg: '#d1fae5', text: '#065f46' },
  red:    { bg: '#fee2e2', text: '#991b1b' },
  yellow: { bg: '#fef3c7', text: '#92400e' },
  blue:   { bg: '#dbeafe', text: '#1e40af' },
  gray:   { bg: '#f3f4f6', text: '#374151' },
  purple: { bg: '#ede9fe', text: '#5b21b6' },
  orange: { bg: '#ffedd5', text: '#9a3412' },
  teal:   { bg: '#ccfbf1', text: '#0f766e' },
  pink:   { bg: '#fce7f3', text: '#9d174d' },
}

const statStyle  = (c?: Color) => {
  const m = COLOR_MAP[c ?? 'gray'] ?? COLOR_MAP.gray
  return { background: m.bg, color: m.text }
}
const colorText  = (c?: Color) => (COLOR_MAP[c ?? 'gray'] ?? COLOR_MAP.gray).text

const progressPct = (p: LayoutProgress) =>
  p.total > 0 ? Math.min(Math.round((p.current / p.total) * 100), 100) : 0

const progressColor = (p: LayoutProgress) => {
  if (p.color) return colorText(p.color)
  if (p.danger != null && p.current >= p.danger) return '#ef4444'
  if (p.warn   != null && p.current >= p.warn)   return '#f59e0b'
  return '#10b981'
}

const gridStyle = (columns?: number) =>
  ({ gridTemplateColumns: `repeat(${columns ?? 3}, 1fr)` })

const isGuildTaskModule = (module: string) =>
  module.includes('公会') || /fml/i.test(module)

const gridItemClass = (item: LayoutGridItem) => ({
  'evt-grid-item--available': item.status === 'available',
  'evt-grid-item--taken':     item.status === 'taken',
  'evt-grid-item--pending':   item.status === 'pending',
  'evt-grid-item--locked':    item.status === 'locked',
})

const rankNoClass = (i: number) => ({
  'rank-gold':   i === 0,
  'rank-silver': i === 1,
  'rank-bronze': i === 2,
})

const alertIcon = (type?: string) =>
  ({ success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' }[type ?? 'info'] ?? 'ℹ️')

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
}
</script>

<style scoped>
.evt-view { padding: 12px; overflow-y: auto; overflow-x:hidden; height: 100%; box-sizing: border-box; }

/* ── 空状态 ── */
.evt-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:200px; color:#9ca3af; gap:8px; }
.evt-empty-icon { font-size:48px; }
.evt-empty-hint { font-size:12px; color:#d1d5db; }

/* ── 工具栏 ── */
.evt-toolbar { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; font-size:12px; color:#0369a1; }
.evt-toolbar-info { flex:1; }
.evt-clear-btn { background:none; border:1px solid #93c5fd; border-radius:4px; padding:2px 10px; font-size:11px; color:#1d4ed8; cursor:pointer; transition:background .15s; }
.evt-clear-btn:hover { background:#dbeafe; }

/* ── 卡片容器 ── */
.evt-cards { display:flex; flex-direction:column; gap:12px; }

/* ── 单张卡片 ── */
.evt-card { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.06); }
.evt-card--success { border-left:4px solid #10b981; }
.evt-card--failed  { border-left:4px solid #ef4444; }
.evt-card--warning { border-left:4px solid #f59e0b; }
.evt-card--info    { border-left:4px solid #3b82f6; }

/* ── 卡片头部 ── */
.evt-card-header { padding:10px 14px 8px; background:#f9fafb; border-bottom:1px solid #f3f4f6; display:flex; flex-direction:column; gap:6px; }
.evt-card-title-row { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:4px; }
.evt-card-title-left { display:flex; align-items:baseline; gap:6px; }
.evt-card-module { font-size:14px; font-weight:700; color:#1f2937; }
.evt-card-subtitle { font-size:11px; color:#9ca3af; }

/* headerStats */
.evt-header-stats { display:flex; gap:4px; flex-wrap:wrap; }
.evt-stat-badge { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; cursor:default; }

/* 降级 badges */
.evt-card-badges { display:flex; gap:4px; flex-wrap:wrap; }
.evt-badge { padding:1px 7px; border-radius:10px; font-size:11px; font-weight:600; }
.evt-badge--success { background:#d1fae5; color:#065f46; }
.evt-badge--failed  { background:#fee2e2; color:#991b1b; }
.evt-badge--warning { background:#fef3c7; color:#92400e; }
.evt-badge--info    { background:#dbeafe; color:#1e40af; }

/* 摘要行 */
.evt-card-summary { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; font-size:12px; color:#6b7280; }
.evt-card-time { color:#9ca3af; font-size:11px; flex-shrink:0; }
.evt-card-latest-title { font-weight:600; color:#374151; }
.evt-card-latest-desc { color:#6b7280; }

/* ── tags 标签行 ── */
.evt-tags { display:flex; gap:4px; flex-wrap:wrap; }
.evt-tag { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:500; }
.evt-tag--blue { background:#e0f2fe; color:#0369a1; }
.evt-tag--xs { font-size:10px; padding:1px 5px; }

/* ── 进度条 ── */
.evt-progress-wrap { }
.evt-progress-label { display:flex; justify-content:space-between; font-size:11px; color:#6b7280; margin-bottom:3px; }
.evt-progress-value { font-weight:600; color:#374151; }
.evt-progress-bar { height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; }
.evt-progress-fill { height:100%; border-radius:3px; transition:width .3s; }

/* 多进度条 */
.evt-multi-progress { display:flex; flex-direction:column; gap:6px; }

/* ── 键值对列表 ── */
.evt-kv-list { display:flex; flex-direction:column; gap:2px; }
.evt-kv-item { display:flex; justify-content:space-between; font-size:12px; padding:1px 0; }
.evt-kv-label { color:#6b7280; }
.evt-kv-value { font-weight:600; color:#1f2937; }

/* ── 告警横幅 ── */
.evt-alert { display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:500; margin-top:2px; }
.evt-alert--info    { background:#dbeafe; color:#1e40af; }
.evt-alert--success { background:#d1fae5; color:#065f46; }
.evt-alert--warning { background:#fef3c7; color:#92400e; }
.evt-alert--error   { background:#fee2e2; color:#991b1b; }
.evt-alert-icon { font-size:14px; }

/* ── 折叠切换条 ── */
.evt-section-toggle { display:flex; justify-content:space-between; align-items:center; padding:7px 14px; cursor:pointer; font-size:12px; color:#6b7280; background:#f3f4f6; border-top:1px solid #e5e7eb; user-select:none; }
.evt-section-toggle:hover { background:#e9ecef; }
.evt-toggle-arrow { font-size:11px; color:#9ca3af; }

/* ── 格子网格 ── */
.evt-grid { display:grid; gap:6px; padding:10px 12px; background:#fafafa; max-width:100%; overflow-x:auto; box-sizing:border-box; -webkit-overflow-scrolling:touch; }
.evt-grid-item { position:relative; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; font-size:11px; background:#fff; display:flex; flex-direction:column; gap:2px; }
.evt-grid-item--available { border-color:#10b981; background:#f0fdf4; }
.evt-grid-item--taken     { border-color:#f59e0b; background:#fffbeb; }
.evt-grid-item--pending   { border-color:#d1d5db; background:#f9fafb; }
.evt-grid-item--locked    { border-color:#e5e7eb; background:#f3f4f6; opacity:.65; }

.evt-grid-badge { position:absolute; top:3px; right:4px; font-size:9px; font-weight:700; padding:1px 4px; border-radius:8px; }
.evt-grid-title    { font-weight:600; color:#1f2937; line-height:1.3; padding-right:24px; }
.evt-grid-subtitle { color:#6b7280; font-size:10px; }
.evt-grid-score    { display:flex; align-items:center; gap:3px; font-size:11px; }
.score-before { color:#9ca3af; text-decoration:line-through; }
.score-arrow  { color:#f59e0b; }
.score-after  { color:#10b981; font-weight:600; }
.evt-grid-tags { display:flex; gap:2px; flex-wrap:wrap; margin-top:1px; }
.evt-grid-taken    { color:#d97706; font-size:10px; font-weight:600; }
.evt-grid-countdown { color:#9ca3af; font-size:10px; }
.evt-grid-progress { display:flex; align-items:center; gap:4px; margin-top:2px; }
.evt-grid-progress-bar { flex:1; height:4px; background:#e5e7eb; border-radius:2px; overflow:hidden; }
.evt-grid-progress-fill { height:100%; background:#10b981; }
.evt-grid-progress-text { font-size:9px; color:#6b7280; flex-shrink:0; }

/* ── 表格 ── */
.evt-table-wrap { overflow-x:auto; padding:0 12px 10px; }
.evt-table { width:100%; border-collapse:collapse; font-size:12px; }
.evt-table th { background:#f3f4f6; color:#6b7280; font-weight:600; padding:5px 8px; text-align:left; border-bottom:1px solid #e5e7eb; }
.evt-table td { padding:4px 8px; border-bottom:1px solid #f3f4f6; color:#374151; }
.evt-table tr:last-child td { border-bottom:none; }
.evt-table tr:hover td { background:#f9fafb; }

/* ── 排行榜 ── */
.evt-rank-list { padding:8px 14px 10px; display:flex; flex-direction:column; gap:3px; }
.evt-rank-item { display:flex; align-items:center; gap:8px; padding:4px 6px; border-radius:6px; font-size:12px; }
.evt-rank-item--highlight { background:#fef9c3; }
.evt-rank-no { width:20px; height:20px; border-radius:50%; background:#e5e7eb; color:#6b7280; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rank-gold   { background:#fbbf24; color:#fff; }
.rank-silver { background:#9ca3af; color:#fff; }
.rank-bronze { background:#ca8a04; color:#fff; }
.evt-rank-name  { flex:1; color:#374151; font-weight:500; }
.evt-rank-value { color:#1f2937; font-weight:700; }

/* ── 数字仪表格 ── */
.evt-stat-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; padding:10px 12px; }
.evt-stat-cell { border-radius:8px; padding:8px 10px; text-align:center; display:flex; flex-direction:column; gap:2px; }
.evt-stat-cell-value { font-size:18px; font-weight:700; }
.evt-stat-cell-label { font-size:11px; font-weight:500; opacity:.75; }
.evt-stat-cell-sub   { font-size:10px; opacity:.55; }

/* ── 时间线 ── */
.evt-timeline { padding:8px 14px 10px; display:flex; flex-direction:column; gap:1px; }
.evt-tl-item { display:flex; gap:10px; padding:4px 0; }
.evt-tl-dot { width:10px; height:10px; border-radius:50%; background:#d1d5db; flex-shrink:0; margin-top:3px; }
.evt-tl-item--success .evt-tl-dot { background:#10b981; }
.evt-tl-item--failed  .evt-tl-dot { background:#ef4444; }
.evt-tl-item--warning .evt-tl-dot { background:#f59e0b; }
.evt-tl-item--info    .evt-tl-dot { background:#3b82f6; }
.evt-tl-body  { flex:1; display:flex; flex-wrap:wrap; align-items:baseline; gap:6px; }
.evt-tl-time  { font-size:10px; color:#9ca3af; flex-shrink:0; }
.evt-tl-title { font-size:12px; font-weight:600; color:#374151; }
.evt-tl-desc  { font-size:11px; color:#6b7280; }
.evt-tl-gains { display:flex; gap:3px; flex-wrap:wrap; width:100%; margin-top:2px; }

@media (max-width: 640px) {
  .evt-view {
    padding: 8px 6px;
  }

  .evt-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
  }

  .evt-card {
    max-width: 100%;
  }

  .evt-card-header {
    padding: 9px 10px 8px;
  }

  .evt-section-toggle {
    padding: 7px 10px;
  }

  .evt-grid {
    grid-template-columns: repeat(2, minmax(118px, 1fr)) !important;
    gap: 6px;
    padding: 8px 8px 10px;
    overflow-x: hidden;
  }

  .evt-grid.evt-grid--guild-tasks {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 4px;
    padding: 8px 6px 10px;
  }

  .evt-grid-item {
    min-width: 0;
    padding: 6px;
    font-size: 10px;
  }

  .evt-grid--guild-tasks .evt-grid-item {
    padding: 4px 3px;
    font-size: 9px;
  }

  .evt-grid-title {
    padding-right: 18px;
    font-size: 10px;
    line-height: 1.35;
    word-break: break-word;
  }

  .evt-grid--guild-tasks .evt-grid-title {
    padding-right: 12px;
    font-size: 9px;
    line-height: 1.25;
  }

  .evt-grid-score {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 2px;
    font-size: 10px;
  }

  .evt-grid--guild-tasks .evt-grid-score {
    font-size: 9px;
  }

  .evt-grid-badge {
    max-width: 46px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
