<template>
  <a-modal
    :open="isOpen"
    @cancel="$emit('close')"
    :title="`📋 查看日志${accountInfo ? ` - ${accountInfo.nickname} - ${accountInfo.server_name}` : ''}`"
    width="90%"
    :style="{ maxWidth: '1200px' }"
    wrap-class-name="log-view-modal-wrap"
    centered
    :body-style="{ maxHeight: '80vh', padding: 0, overflow: 'hidden' }"
  >
    <div ref="swipeRef" class="log-modal-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="log-loading">
        <div class="loading-spinner"></div>
        <p>加载日志中...</p>
      </div>

      <!-- 未找到日志 -->
      <div v-else-if="logData?.未找到日志" class="log-not-found">
        <div class="not-found-icon">📄</div>
        <h4>暂无日志</h4>
        <p>未找到今日的日志文件：{{ logData.未找到日志 }}</p>
      </div>

      <!-- 日志内容 -->
      <div v-else-if="logData?.content" class="log-main-content">
        <!-- 左侧分类标签栏 -->
        <div class="log-categories">
          <a-button
            v-for="category in sidebarCategories"
            :key="category.name"
            :class="['category-tab', { active: selectedCategory === category.name }]"
            :style="{
              borderColor: selectedCategory === category.name ? category.color : 'transparent',
              color: selectedCategory === category.name ? category.color : '#6b7280',
            }"
            @click="selectedCategory = category.name"
            @touchstart.stop
            @touchmove.stop
          >
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count" :style="{ backgroundColor: category.color }">
              {{ category.count }}
            </span>
          </a-button>
          <!-- 移动端滑动提示 -->
          <div v-if="sidebarCategories.length > 3" class="scroll-hint">→</div>
        </div>

        <!-- 右侧面板 -->
        <div class="log-right-panel">
          <!-- 搜索栏 + 模式切换 -->
          <div class="log-search">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
              <a-input
                v-if="viewMode === 'log'"
                v-model:value="searchTerm"
                type="text"
                placeholder="搜索日志内容..."
                size="large"
                style="flex:1"
              />
              <a-button
                :type="viewMode === 'evt' ? 'primary' : 'default'"
                size="small"
                :style="viewMode === 'evt' ? { marginLeft: 'auto' } : {}"
                @click="viewMode = viewMode === 'log' ? 'evt' : 'log'"
              >
                {{ viewMode === 'evt' ? '📋 普通日志' : '🗂 事件卡片' }}
              </a-button>
            </div>
            <div v-if="viewMode === 'log'" class="search-controls">
              <div wrap :size="16">
                <a-checkbox v-model:checked="autoRefresh">🔄10秒自动刷新</a-checkbox>
                <a-checkbox v-model:checked="autoScrollToBottom">
                  {{ autoScrollToBottom ? '📍' : '🔓' }}自动滚动
                </a-checkbox>
              </div>
              <a-tag color="blue">
                显示 {{ computedLogData.filteredLines.length }} 条日志 (最近2500条)
              </a-tag>
            </div>
          </div>

          <!-- 事件卡片视图 -->
          <div v-if="viewMode === 'evt'" class="log-content-wrapper">
            <EventCardView
              :raw-logs="rawEvtContent"
              :account-id="props.accountId"
              :filter-category="selectedCategory"
              :history-reset-key="evtHistoryResetKey"
              @clear="onEvtClear"
              @categories-change="evtCategories = $event"
            />
          </div>

          <!-- 日志内容 -->
          <div v-else class="log-content-wrapper" ref="logContentRef">
            <DynamicScroller
              v-if="computedLogData.filteredLines.length > 0"
              class="log-content scroller"
              :items="computedLogData.filteredLines"
              :min-item-size="40"
              key-field="index"
              @scroll="handleScroll"
            >
              <template #default="{ item, index, active }">
                <DynamicScrollerItem
                  :item="item"
                  :active="active"
                  :data-index="index"
                  :size-dependencies="[item.clean]"
                >
                  <div class="log-line">
                    <div class="log-content-text" v-html="formatLogLine(item)"></div>
                  </div>
                </DynamicScrollerItem>
              </template>
            </DynamicScroller>
            <div v-else class="no-logs-found">
              <p>没有找到匹配的日志</p>
            </div>

            <!-- 滚动到底部按钮 -->
            <a-button
              v-if="showScrollToBottomButton"
              class="scroll-to-bottom-button"
              @click="scrollToBottomAndEnable"
              title="滚动到底部"
            >
              ↓
            </a-button>
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else class="log-error">
        <div class="error-icon">⚠️</div>
        <h4>获取日志失败</h4>
        <p>请稍后重试或检查服务器状态</p>
        <a-button type="primary" @click="fetchLogs()"> 重新加载 </a-button>
      </div>
    </div>

    <!-- 底部关闭按钮 -->
    <template #footer>
      <div class="modal-footer">
        <a-button type="primary" @click="$emit('close')" size="large"> 关闭 </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import axios from '../utils/axios'
import { message } from 'ant-design-vue'
import { useSwipeToClose } from '../hooks/useSwipeToClose'
import AnsiToHtml from 'ansi-to-html'
import { sanitizeLog } from '../utils/sanitize'
import { filterLogLines, shouldHideLogLine } from '../utils/logFilter'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import EventCardView from './EventCardView.vue'
import {
  clearEvtLines,
  loadEvtLines,
  runDailyAutoClearIfNeeded,
  saveEvtLines,
  scheduleMidnightEvtClear,
} from '../utils/evtHistoryStorage'

// 创建 ansi-to-html 转换器实例
const ansiToHtml = new AnsiToHtml({
  fg: '#000',
  bg: '#fff',
  newline: true, // 启用换行符转换，将 \r\n 转换为 <br> 标签
  escapeXML: false,
  stream: false,
})

interface LogData {
  file?: string
  content?: string
  未找到日志?: string
}

interface LogStreamResponse {
  success: boolean
  count: number
  lastLine: number
  logs: string[]
  pod_id: string
}

interface AccountInfo {
  id: number
  nickname: string
  server_name: string
}

interface Props {
  isOpen: boolean
  accountId: number
  token: string
}

interface LogCategory {
  name: string
  count: number
  color: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// 添加滑动关闭功能
const swipeRef = useSwipeToClose({
  onClose: () => emit('close'),
  enabled: computed(() => props.isOpen).value,
})

const loading = ref(false)
const logData = ref<LogData | null>(null)

const MAX_EVT_LINES = 2000  // 最多保留 2000 条 EVT 行

const rawEvtContent = ref<string>('')   // 保留含 [[EVT]] 行的原始内容，供 EventCardView 解析
const evtHistoryResetKey = ref(0)

function resetEvtHistoryState() {
  rawEvtContent.value = ''
  evtHistoryResetKey.value++
}

function applyDailyAutoClearIfNeeded() {
  if (runDailyAutoClearIfNeeded()) {
    resetEvtHistoryState()
  }
}

/** EventCardView 点击"清除历史"时同步清掉原始 EVT 行缓存，防止旧模块名卡片重新出现 */
function onEvtClear() {
  clearEvtLines(props.accountId)
  rawEvtContent.value = ''
}

let cancelMidnightClear: (() => void) | undefined
const accountInfo = ref<AccountInfo | null>(null)
const selectedCategory = ref<string>('全部')
const evtCategories = ref<LogCategory[]>([{ name: '全部', count: 0, color: '#6b7280' }])
const searchTerm = ref('')
const autoRefresh = ref(true)
const viewMode = ref<'log' | 'evt'>('evt')  // 默认事件卡片
const autoScrollToBottom = ref(true)
const showScrollToBottomButton = ref(false)
const logContentRef = ref<HTMLDivElement>()
const refreshInterval = ref<ReturnType<typeof setInterval>>()
const lastLine = ref<number>(0)
const isAutoScrolling = ref(false) // 标记是否正在自动滚动，防止触发 handleScroll

// 滚动到底部
const scrollToBottom = () => {
  if (logContentRef.value) {
    // 查找虚拟滚动容器内的实际滚动元素
    const scroller = logContentRef.value.querySelector(
      '.vue-recycle-scroller__item-wrapper, .vue-recycle-scroller__item-view',
    )?.parentElement
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight
    }
  }
}

// 滚动到底部（等待 DynamicScroller 完成高度计算）
const scrollToBottomWithDelay = async () => {
  isAutoScrolling.value = true // 标记开始自动滚动

  // DynamicScroller 需要时间来测量和更新高度
  // 使用多次 nextTick 和 setTimeout 确保高度计算完成
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 50))
  scrollToBottom()

  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 50))
  scrollToBottom() // 再次滚动确保到底

  // 延迟后再允许 handleScroll 更新状态
  setTimeout(() => {
    isAutoScrolling.value = false
  }, 100)
}

// 检查是否在底部
const isAtBottom = () => {
  if (!logContentRef.value) return false
  // 查找虚拟滚动容器内的实际滚动元素
  const scroller = logContentRef.value.querySelector(
    '.vue-recycle-scroller__item-wrapper, .vue-recycle-scroller__item-view',
  )?.parentElement
  if (!scroller) return false
  const { scrollTop, scrollHeight, clientHeight } = scroller
  return scrollTop + clientHeight >= scrollHeight - 5 // 5px 的容差
}

// 处理滚动事件
const handleScroll = () => {
  // 如果正在自动滚动，不更新状态，避免取消勾选
  if (isAutoScrolling.value) return

  const atBottom = isAtBottom()
  autoScrollToBottom.value = atBottom
  showScrollToBottomButton.value = !atBottom
}

// 滚动到底部并启用自动滚动
const scrollToBottomAndEnable = () => {
  autoScrollToBottom.value = true
  scrollToBottomWithDelay()
}

// 清理 ANSI 颜色代码
const cleanAnsiCodes = (text: string): string => {
  return text.replace(/[\x1b]\[[0-9;]*m/g, '')
}

// 解析日志级别和颜色
const parseLogLevel = (text: string): { level: string; color: string; cleanText: string } => {
  const levelColors = {
    info: '#10b981', // 绿色
    warn: '#f59e0b', // 橙色
    debug: '#ef4444', // 红色
    error: '#dc2626', // 深红色
    success: '#059669', // 深绿色
  }

  // 匹配 ANSI 颜色代码包围的日志级别
  const ansiMatch = text.match(/[\u001b]\[[\d;]*m(info|warn|debug|error|success)[\u001b]\[[\d;]*m/i)
  if (ansiMatch) {
    const level = ansiMatch[1].toLowerCase()
    return {
      level,
      color: levelColors[level as keyof typeof levelColors] || '#6b7280',
      cleanText: cleanAnsiCodes(text),
    }
  }

  // 匹配普通的日志级别
  const levelMatch = text.match(/\b(info|warn|debug|error|success)\b/i)
  if (levelMatch) {
    const level = levelMatch[1].toLowerCase()
    return {
      level,
      color: levelColors[level as keyof typeof levelColors] || '#6b7280',
      cleanText: cleanAnsiCodes(text),
    }
  }

  return {
    level: 'log',
    color: '#6b7280',
    cleanText: cleanAnsiCodes(text),
  }
}

// 解析日志内容，提取分类标签
const computedLogData = computed(() => {
  if (!logData.value?.content) {
    return { categories: [], filteredLines: [], processedLines: [] }
  }

  // 只取最近的2500条日志，并过滤 IP 封禁相关记录
  const allLines = logData.value.content
    .split('\n')
    .filter((line) => line.trim() && !shouldHideLogLine(line))
  const lines = allLines.slice(-2500)
  const categoryMap = new Map<string, number>()
  const colors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#84cc16',
  ]

  // 处理每一行日志
  const processedLines = lines.map((line, idx) => {
    const logInfo = parseLogLevel(line)
    const cleanLine = logInfo.cleanText

    // 在清理后的内容中查找 [xxx] 标签（在日志级别之后）
    const tagMatch = cleanLine.match(/(?:info|warn|debug|error|success).*?\[([^\]]+)\]/i)
    let category = ''

    if (tagMatch) {
      category = tagMatch[1]
    }

    return {
      index: idx, // 添加唯一索引用于虚拟滚动的 key
      original: line,
      clean: cleanLine,
      level: logInfo.level,
      levelColor: logInfo.color,
      category,
      hasCategory: !!category,
    }
  })

  // 统计各类别日志数量
  processedLines.forEach((lineInfo) => {
    if (lineInfo.category) {
      categoryMap.set(lineInfo.category, (categoryMap.get(lineInfo.category) || 0) + 1)
    }
  })

  // 过滤不需要的分类
  const excludedCategories = ['Login', 'login', 'websocket', 'WebSocket', 'WEBSOCKET']

  // 生成分类列表
  const categories: LogCategory[] = [{ name: '全部', count: lines.length, color: '#6b7280' }]

  let colorIndex = 0
  categoryMap.forEach((count, name) => {
    // 跳过需要过滤的分类
    if (!excludedCategories.includes(name)) {
      categories.push({
        name,
        count,
        color: colors[colorIndex % colors.length],
      })
      colorIndex++
    }
  })

  // 筛选日志行
  let filteredLines = processedLines
  if (selectedCategory.value !== '全部') {
    filteredLines = processedLines.filter(
      (lineInfo) => lineInfo.category === selectedCategory.value,
    )
  }

  // 应用搜索过滤
  if (searchTerm.value.trim()) {
    filteredLines = filteredLines.filter((lineInfo) =>
      lineInfo.clean.toLowerCase().includes(searchTerm.value.toLowerCase()),
    )
  }

  return { categories, filteredLines, processedLines }
})

const sidebarCategories = computed(() =>
  viewMode.value === 'evt' ? evtCategories.value : computedLogData.value.categories,
)

const fetchLogs = async (silent = false) => {
  if (!props.accountId || !props.token) return

  if (!silent) {
    loading.value = true
  }

  try {
    const response = await axios.get(`/api/game-accounts/log-stream-poll`, {
      params: {
        id: props.accountId,
        lastLine: lastLine.value,
      },
    })

    if (response.data.code === 200 && response.data.data.success) {
      const streamData: LogStreamResponse = response.data.data
      const wasFirstLoad = lastLine.value === 0

      // 处理日志数据
      if (streamData.count > 0) {
        const visibleLogs = filterLogLines(streamData.logs)
        const newLogs = visibleLogs.join('\n')

        // 提取含 [[EVT]] 的行（不过滤），追加到 rawEvtContent 并持久化
        const evtLines = streamData.logs.filter((l: string) => l.includes('[[EVT]]'))
        if (evtLines.length > 0) {
          rawEvtContent.value = rawEvtContent.value
            ? rawEvtContent.value + '\n' + evtLines.join('\n')
            : evtLines.join('\n')
          saveEvtLines(rawEvtContent.value, props.accountId)
        }

        if (wasFirstLoad) {
          // 首次加载，直接设置日志内容
          logData.value = { content: newLogs }
        } else if (newLogs) {
          // 增量更新，追加新日志
          const currentContent = logData.value?.content || ''
          logData.value = { content: currentContent + '\n' + newLogs }
        }

        // 如果开启自动滚动，滚动到底部
        if (autoScrollToBottom.value) {
          scrollToBottomWithDelay()
        }
      } else if (wasFirstLoad) {
        // 首次加载但没有日志
        logData.value = { content: '' }
      }

      // 更新 lastLine
      lastLine.value = streamData.lastLine

      // 获取账号信息（如果需要，可能需要额外的API调用）
      if (!accountInfo.value) {
        // 这里可能需要单独调用获取账号信息的API
        // 暂时使用 pod_id 作为占位符
        accountInfo.value = {
          id: props.accountId,
          nickname: `账号_${streamData.pod_id}`,
          server_name: '未知服务器',
        }
      }
    } else {
      // 根据新接口的错误格式处理
      const errorMsg = response.data.msg || '获取日志失败'

      if (response.data.code === 400) {
        if (!silent) {
          message.error('无效的账号ID')
        }
      } else if (response.data.code === 404) {
        logData.value = { 未找到日志: '账号不存在或未找到日志' }
      } else if (response.data.code === 503) {
        if (!silent) {
          message.error('服务器连接失败')
        }
      } else if (response.data.code === 504) {
        if (!silent) {
          message.error('服务器响应超时')
        }
      } else {
        if (!silent) {
          message.error(errorMsg)
        }
      }
    }
  } catch (error) {
    console.error('获取日志失败:', error)
    if (!silent) {
      message.error('网络请求失败')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

const formatLogLine = (lineInfo: any): string => {
  const parts: string[] = []
  let remainingText = lineInfo.clean

  // 尝试解析 JSON 格式的 remainingText
  try {
    const jsonData = JSON.parse(remainingText)
    if (jsonData && typeof jsonData === 'object' && 'content' in jsonData) {
      remainingText = ansiToHtml.toHtml(jsonData.content || '')
    }
  } catch {
    // 不是 JSON，保持原始内容
  }

  // 1. 提取并高亮日志级别
  const levelMatch = remainingText.match(/\b(info|warn|debug|error|success)\b/i)
  if (levelMatch) {
    const beforeLevel = remainingText.substring(0, levelMatch.index)
    const level = levelMatch[1]
    const afterLevel = remainingText.substring(levelMatch.index! + level.length)

    if (beforeLevel) parts.push(beforeLevel)
    parts.push(
      `<span class="log-level" style="color: ${lineInfo.levelColor}; font-weight: bold; background-color: ${lineInfo.levelColor}20; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">${level.toUpperCase()}</span>`,
    )
    remainingText = afterLevel
  }

  // 2. 提取并高亮分类标签
  if (lineInfo.category) {
    const tagPattern = `\\[${lineInfo.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`
    const tagMatch = remainingText.match(new RegExp(tagPattern))

    if (tagMatch) {
      const beforeTag = remainingText.substring(0, tagMatch.index)
      const tag = tagMatch[0]
      const afterTag = remainingText.substring(tagMatch.index! + tag.length)

      if (beforeTag) parts.push(beforeTag)

      const category = computedLogData.value.categories.find(
        (cat: LogCategory) => cat.name === lineInfo.category,
      )
      parts.push(
        `<span class="log-tag" style="background-color: ${category?.color || '#6b7280'}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold; margin-left: 8px;">${tag}</span>`,
      )

      if (afterTag) parts.push(afterTag)
    } else {
      parts.push(remainingText)
    }
  } else {
    parts.push(remainingText)
  }

  // ✅ 使用 sanitizeLog 清理最终的 HTML，防止 XSS
  return sanitizeLog(parts.join(''))
}

// 统一管理日志获取和自动刷新逻辑
let _lastWatchedAccountId: number | undefined = undefined
watch(
  [() => props.isOpen, () => props.accountId, autoRefresh],
  ([isOpen, accountId, autoRefreshEnabled]) => {
    // 清除之前的定时器
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = undefined
    }

    // 重置搜索状态
    if (isOpen && accountId) {
      applyDailyAutoClearIfNeeded()
      selectedCategory.value = '全部'
      searchTerm.value = ''
      viewMode.value = 'evt'
      lastLine.value = 0 // 重置日志行数
      // accountId 切换时才清空旧账号缓存
      if (accountId !== _lastWatchedAccountId) {
        if (_lastWatchedAccountId !== undefined) {
          // 不删除旧账号缓存，只是切换
        }
        _lastWatchedAccountId = accountId
      }
      // 从 localStorage 恢复该账号的 EVT 行（弹窗关了再开立即有数据）
      rawEvtContent.value = loadEvtLines(accountId)

      // 立即获取一次日志
      fetchLogs()

      // 如果启用自动刷新，设置定时器
      if (autoRefreshEnabled) {
        refreshInterval.value = setInterval(() => {
          fetchLogs(true) // 静默刷新，不显示加载状态
        }, 10000)
      }
    }
  },
  { immediate: false }, // 不需要立即执行，因为组件初始化时 isOpen 为 false
)

// 当过滤后的日志行发生变化时，如果启用自动滚动，滚动到底部
watch([computedLogData, autoScrollToBottom], ([, autoScrollEnabled]) => {
  if (logData.value?.content && autoScrollEnabled) {
    scrollToBottomWithDelay()
  }
})

onMounted(() => {
  applyDailyAutoClearIfNeeded()
  cancelMidnightClear = scheduleMidnightEvtClear(resetEvtHistoryState)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  cancelMidnightClear?.()
})
</script>

<style scoped>
/* 必要的样式，保持功能正常 */
.log-modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 加载状态 */
.log-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 未找到日志状态 */
.log-not-found {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b7280;
  padding: 40px;
}

.not-found-icon {
  font-size: 64px;
  opacity: 0.5;
}

.log-not-found h4 {
  margin: 0;
  font-size: 1.25rem;
  color: #374151;
}

.log-not-found p {
  margin: 0;
  text-align: center;
  font-size: 0.875rem;
}

/* 主要内容区域 */
.log-main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 分类标签栏 */
.log-categories {
  width: 280px;
  min-width: 280px;
  max-height: calc(80vh - 100px);
  overflow-y: auto;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-right: 1px solid #e2e8f0;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-categories::-webkit-scrollbar {
  width: 6px;
}

.log-categories::-webkit-scrollbar-track {
  background: transparent;
}

.log-categories::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.category-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.category-tab:hover {
  background: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: rgba(59, 130, 246, 0.2);
}

.category-tab.active {
  background: white;
  font-weight: 600;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-color: currentColor;
}

.category-name {
  flex: 1;
  text-align: left;
  font-weight: inherit;
}

.category-count {
  background: #6b7280;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.category-tab.active .category-count {
  background: currentColor;
  color: white;
  transform: scale(1.05);
}

.category-tab:hover .category-count {
  transform: scale(1.05);
}

/* 右侧面板 */
.log-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
  min-height: 0;
  max-height: 70vh;
}

/* 搜索栏 */
.log-search {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.3s ease;
  margin-bottom: 16px;
  background: white;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cpath d='m21 21-4.35-4.35'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 16px center;
  background-size: 16px 16px;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.auto-refresh-toggle,
.auto-scroll-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  color: #374151;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: white;
  border: 1px solid #e2e8f0;
}

.auto-refresh-toggle:hover,
.auto-scroll-toggle:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.auto-refresh-toggle input[type='checkbox'],
.auto-scroll-toggle input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.toggle-text {
  font-weight: 500;
}

.search-stats {
  font-size: 0.875rem;
  color: #6b7280;
  white-space: nowrap;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.log-file-name {
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #cbd5e1;
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
  color: #64748b;
}

/* 日志内容区域容器 */
.log-content-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 重要：允许 flex 子元素正确收缩 */
}

/* 虚拟滚动器 */
.log-content {
  flex: 1;
  min-height: 0; /* 重要：允许正确计算高度 */
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* 虚拟滚动器内部容器 */
.log-content.scroller :deep(.vue-recycle-scroller__item-wrapper) {
  padding: 16px 24px;
  box-sizing: border-box;
}

.log-line {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  line-height: 1.6;
  min-height: 40px;
  box-sizing: border-box;
}

.log-line:hover {
  background-color: #f9fafb;
  border-radius: 4px;
  margin: 0 -8px;
  padding: 8px 8px;
}

.log-content-text {
  color: #374151;
  word-break: break-word;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.no-logs-found {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 错误状态 */
.log-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  color: #6b7280;
}

.error-icon {
  font-size: 64px;
  opacity: 0.5;
}

.log-error h4 {
  margin: 0;
  font-size: 1.25rem;
  color: #374151;
}

.log-error p {
  margin: 0;
  text-align: center;
}

/* 滚动到底部按钮 */
.scroll-to-bottom-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  border: none;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.scroll-to-bottom-button:hover {
  background: rgba(37, 99, 235, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.scroll-to-bottom-button:active {
  transform: translateY(0);
}

/* 移动端适配 - 768px以下统一使用紧凑样式 */
@media (max-width: 768px) {
  .log-modal-content {
    flex: 1;
    min-height: 0;
    height: 100%;
  }

  .log-main-content {
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .log-right-panel {
    max-height: none;
    flex: 1;
    min-height: 0;
  }

  .log-categories {
    width: 100%;
    min-width: auto;
    max-height: 70px;
    flex-direction: row;
    gap: 5px;
    padding: 6px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    -webkit-overflow-scrolling: touch;
  }

  .log-categories::-webkit-scrollbar {
    height: 3px;
  }

  .category-tab {
    min-width: 60px;
    font-size: 0.7rem;
    padding: 0 2px;
    border-radius: 8px;
    gap: 0px;
    justify-content: center;
    text-align: center;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .category-name {
    text-align: center;
  }

  .category-count {
    font-size: 0.65rem;
    padding: 0 1px;
    min-width: 0;
    border-radius: 4px;
    line-height: 13px;
  }

  .log-search {
    padding: 8px 12px;
  }

  .search-input {
    padding: 10px 12px 10px 36px;
    background-size: 14px 14px;
    background-position: 12px center;
    font-size: 14px;
  }

  .search-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .auto-refresh-toggle,
  .auto-scroll-toggle {
    justify-content: center;
    padding: 8px 12px;
    font-size: 0.8rem;
  }

  .log-content {
    font-size: 0.8rem;
  }

  .log-content.scroller :deep(.vue-recycle-scroller__item-wrapper) {
    padding: 8px 12px;
  }

  .log-line {
    padding: 6px 0;
  }

  .scroll-to-bottom-button {
    width: 40px;
    height: 40px;
    bottom: 20px;
    right: 20px;
    font-size: 16px;
  }

  .modal-footer {
    padding: 8px 12px;
  }

  .modal-footer .ant-btn {
    width: 100%;
    min-width: auto;
    height: 44px;
    font-size: 1rem;
  }
}
</style>

<style>
@media (max-width: 768px) {
  .log-view-modal-wrap .ant-modal-wrap {
    overflow: hidden !important;
  }

  .log-view-modal-wrap .ant-modal {
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
    top: 0 !important;
    padding-bottom: 0 !important;
  }

  .log-view-modal-wrap .ant-modal-content {
    height: 100dvh;
    max-height: 100dvh;
    display: flex;
    flex-direction: column;
    border-radius: 0;
  }

  .log-view-modal-wrap .ant-modal-header,
  .log-view-modal-wrap .ant-modal-footer {
    flex-shrink: 0;
    border-radius: 0;
  }

  .log-view-modal-wrap .ant-modal-body {
    flex: 1;
    min-height: 0;
    max-height: none !important;
    padding: 0 !important;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
