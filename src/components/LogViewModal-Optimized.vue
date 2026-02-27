<template>
  <a-modal
    :open="isOpen"
    @cancel="$emit('close')"
    :title="`📋 查看日志${accountInfo ? ` - ${accountInfo.nickname} - ${accountInfo.server_name}` : ''}`"
    width="90%"
    :style="{ maxWidth: '1200px' }"
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
      <div v-else-if="processedLines.length > 0 || rawLogContent" class="log-main-content">
        <!-- 左侧分类标签栏 -->
        <div class="log-categories">
          <a-button
            v-for="category in categories"
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
          <div v-if="categories.length > 3" class="scroll-hint">→</div>
        </div>

        <!-- 右侧面板 -->
        <div class="log-right-panel max-h-[70vh]">
          <!-- 搜索栏 -->
          <div class="log-search">
            <a-input
              v-model:value="searchTerm"
              type="text"
              placeholder="搜索日志内容..."
              size="large"
              class="mb-2"
            />
            <div class="search-controls">
              <div wrap :size="16">
                <a-checkbox v-model:checked="autoRefresh">🔄10秒自动刷新</a-checkbox>
                <a-checkbox v-model:checked="autoScrollToBottom">
                  {{ autoScrollToBottom ? '📍' : '🔓' }}自动滚动
                </a-checkbox>
              </div>
              <a-tag color="blue">
                显示 {{ filteredLines.length }} / {{ processedLines.length }} 条日志
              </a-tag>
            </div>
          </div>

          <!-- 日志内容 - 使用虚拟滚动 -->
          <RecycleScroller
            v-if="filteredLines.length > 0"
            class="log-content"
            :items="filteredLines"
            :item-size="32"
            :buffer="200"
            key-field="id"
            ref="scrollerRef"
            @scroll.native="handleScroll"
          >
            <template #default="{ item }">
              <div class="log-line">
                <div class="log-content-text" v-html="item.formatted"></div>
              </div>
            </template>
          </RecycleScroller>

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
import { ref, computed, onUnmounted, watch, nextTick, shallowRef } from 'vue'
import axios from '../utils/axios'
import { message } from 'ant-design-vue'
import { useSwipeToClose } from '../hooks/useSwipeToClose'
import AnsiToHtml from 'ansi-to-html'
import { sanitizeLog } from '../utils/sanitize'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// 创建 ansi-to-html 转换器实例
const ansiToHtml = new AnsiToHtml({
  fg: '#000',
  bg: '#fff',
  newline: true,
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

interface ProcessedLine {
  id: number
  original: string
  clean: string
  level: string
  levelColor: string
  category: string
  hasCategory: boolean
  formatted: string // ✅ 预先格式化，避免渲染时计算
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
const accountInfo = ref<AccountInfo | null>(null)
const selectedCategory = ref<string>('全部')
const searchTerm = ref('')
const autoRefresh = ref(true)
const autoScrollToBottom = ref(true)
const showScrollToBottomButton = ref(false)
const scrollerRef = ref()
const refreshInterval = ref<ReturnType<typeof setInterval>>()
const lastLine = ref<number>(0)

// ✅ 性能优化：使用 shallowRef 避免深度响应式
const processedLines = shallowRef<ProcessedLine[]>([])
const rawLogContent = ref<string>('')

// ✅ 性能优化：缓存已解析的日志行
const lineCache = new Map<string, ProcessedLine>()
let lineIdCounter = 0

// 颜色配置
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

const levelColors = {
  info: '#10b981',
  warn: '#f59e0b',
  debug: '#ef4444',
  error: '#dc2626',
  success: '#059669',
}

// ✅ 性能优化：提取清理 ANSI 的正则，避免重复创建
const ansiRegex = /[\x1b]\[[0-9;]*m/g

// 清理 ANSI 颜色代码
const cleanAnsiCodes = (text: string): string => {
  return text.replace(ansiRegex, '')
}

// ✅ 性能优化：缓存解析逻辑
const parseLogLevel = (text: string): { level: string; color: string; cleanText: string } => {
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

// ✅ 性能优化：格式化日志行（预先计算）
const formatLogLine = (lineInfo: ProcessedLine): string => {
  const parts: string[] = []
  let remainingText = lineInfo.clean

  // 尝试解析 JSON 格式
  try {
    const jsonData = JSON.parse(remainingText)
    if (jsonData && typeof jsonData === 'object' && 'content' in jsonData) {
      const convertedContent = ansiToHtml.toHtml(jsonData.content || '')
      remainingText = convertedContent
    }
  } catch {
    // 不是 JSON，继续处理
  }

  // 提取并高亮日志级别
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

  // 提取并高亮分类标签
  if (lineInfo.category) {
    const tagPattern = `\\[${lineInfo.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`
    const tagMatch = remainingText.match(new RegExp(tagPattern))

    if (tagMatch) {
      const beforeTag = remainingText.substring(0, tagMatch.index)
      const tag = tagMatch[0]
      const afterTag = remainingText.substring(tagMatch.index! + tag.length)

      if (beforeTag) parts.push(beforeTag)

      const categoryColor =
        categories.value.find((cat: LogCategory) => cat.name === lineInfo.category)?.color ||
        '#6b7280'

      parts.push(
        `<span class="log-tag" style="background-color: ${categoryColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold; margin-left: 8px;">${tag}</span>`,
      )

      if (afterTag) parts.push(afterTag)
    } else {
      parts.push(remainingText)
    }
  } else {
    parts.push(remainingText)
  }

  return sanitizeLog(parts.join(''))
}

// ✅ 性能优化：单行解析（带缓存）
const parseSingleLine = (line: string, id: number): ProcessedLine => {
  // 检查缓存
  if (lineCache.has(line)) {
    const cached = lineCache.get(line)!
    return { ...cached, id } // 返回新ID的副本
  }

  const logInfo = parseLogLevel(line)
  const cleanLine = logInfo.cleanText

  // 查找分类标签
  const tagMatch = cleanLine.match(/(?:info|warn|debug|error|success).*?\[([^\]]+)\]/i)
  const category = tagMatch ? tagMatch[1] : ''

  const processed: ProcessedLine = {
    id,
    original: line,
    clean: cleanLine,
    level: logInfo.level,
    levelColor: logInfo.color,
    category,
    hasCategory: !!category,
    formatted: '', // 稍后填充
  }

  // 格式化（这也会被缓存）
  processed.formatted = formatLogLine(processed)

  // 存入缓存（限制缓存大小）
  if (lineCache.size < 10000) {
    lineCache.set(line, processed)
  }

  return processed
}

// ✅ 性能优化：分类统计（单次遍历）
const categories = computed(() => {
  const categoryMap = new Map<string, number>()
  const excludedCategories = ['Login', 'login', 'websocket', 'WebSocket', 'WEBSOCKET']

  // 统计分类
  for (const line of processedLines.value) {
    if (line.category && !excludedCategories.includes(line.category)) {
      categoryMap.set(line.category, (categoryMap.get(line.category) || 0) + 1)
    }
  }

  // 生成分类列表
  const result: LogCategory[] = [
    { name: '全部', count: processedLines.value.length, color: '#6b7280' },
  ]

  let colorIndex = 0
  categoryMap.forEach((count, name) => {
    result.push({
      name,
      count,
      color: colors[colorIndex % colors.length],
    })
    colorIndex++
  })

  return result
})

// ✅ 性能优化：过滤日志（使用计算属性）
const filteredLines = computed(() => {
  let result = processedLines.value

  // 分类过滤
  if (selectedCategory.value !== '全部') {
    result = result.filter((line) => line.category === selectedCategory.value)
  }

  // 搜索过滤
  if (searchTerm.value.trim()) {
    const searchLower = searchTerm.value.toLowerCase()
    result = result.filter((line) => line.clean.toLowerCase().includes(searchLower))
  }

  return result
})

// 滚动到底部
const scrollToBottom = () => {
  if (scrollerRef.value) {
    scrollerRef.value.scrollToBottom()
  }
}

// 检查是否在底部
const isAtBottom = () => {
  if (!scrollerRef.value || !scrollerRef.value.$el) return false
  const el = scrollerRef.value.$el
  const { scrollTop, scrollHeight, clientHeight } = el
  return scrollTop + clientHeight >= scrollHeight - 10
}

// 处理滚动事件
const handleScroll = () => {
  const atBottom = isAtBottom()
  autoScrollToBottom.value = atBottom
  showScrollToBottomButton.value = !atBottom
}

// 滚动到底部并启用自动滚动
const scrollToBottomAndEnable = () => {
  scrollToBottom()
  autoScrollToBottom.value = true
}

// ✅ 性能优化：增量处理新日志
const processNewLogs = (newContent: string) => {
  const newLines = newContent.split('\n').filter((line) => line.trim())

  // 计算需要处理的新行
  const currentLineCount = processedLines.value.length
  const linesToProcess = newLines.slice(currentLineCount)

  if (linesToProcess.length === 0) return

  // 只处理新增的行
  const newProcessed = linesToProcess.map((line, index) =>
    parseSingleLine(line, currentLineCount + index),
  )

  // 使用 shallowRef 的特性，直接替换数组
  processedLines.value = [...processedLines.value, ...newProcessed]

  // 限制总行数（保留最后 5000 条）
  if (processedLines.value.length > 5000) {
    processedLines.value = processedLines.value.slice(-5000)
    lineIdCounter = processedLines.value.length
  }
}

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

      if (streamData.count > 0) {
        const newLogs = streamData.logs.join('\n')

        if (wasFirstLoad) {
          // 首次加载
          rawLogContent.value = newLogs
          // 一次性解析所有日志
          const lines = newLogs.split('\n').filter((line) => line.trim())
          processedLines.value = lines
            .slice(-5000)
            .map((line, index) => parseSingleLine(line, index))
          lineIdCounter = processedLines.value.length
        } else {
          // ✅ 增量更新
          rawLogContent.value += '\n' + newLogs
          processNewLogs(rawLogContent.value)
        }

        // 自动滚动
        if (autoScrollToBottom.value) {
          nextTick(() => {
            scrollToBottom()
          })
        }
      } else if (wasFirstLoad) {
        rawLogContent.value = ''
        processedLines.value = []
      }

      lastLine.value = streamData.lastLine

      if (!accountInfo.value) {
        accountInfo.value = {
          id: props.accountId,
          nickname: `账号_${streamData.pod_id}`,
          server_name: '未知服务器',
        }
      }
    } else {
      const errorMsg = response.data.msg || '获取日志失败'

      if (response.data.code === 400) {
        if (!silent) message.error('无效的账号ID')
      } else if (response.data.code === 404) {
        logData.value = { 未找到日志: '账号不存在或未找到日志' }
      } else if (response.data.code === 503) {
        if (!silent) message.error('服务器连接失败')
      } else if (response.data.code === 504) {
        if (!silent) message.error('服务器响应超时')
      } else {
        if (!silent) message.error(errorMsg)
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

// 管理日志获取和自动刷新
watch(
  [() => props.isOpen, () => props.accountId, autoRefresh],
  ([isOpen, accountId, autoRefreshEnabled]) => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = undefined
    }

    if (isOpen && accountId) {
      selectedCategory.value = '全部'
      searchTerm.value = ''
      lastLine.value = 0
      processedLines.value = []
      rawLogContent.value = ''
      lineCache.clear()
      lineIdCounter = 0

      // 立即获取
      fetchLogs()

      // 自动刷新
      if (autoRefreshEnabled) {
        refreshInterval.value = setInterval(() => {
          fetchLogs(true)
        }, 10000)
      }
    }
  },
  { immediate: false },
)

// 自动滚动
watch([filteredLines, autoScrollToBottom], ([, autoScrollEnabled]) => {
  if (processedLines.value.length > 0 && autoScrollEnabled) {
    nextTick(() => {
      scrollToBottom()
    })
  }
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  // 清理缓存
  lineCache.clear()
})
</script>

<style scoped>
/* 复用原有样式，这里只列出关键修改 */
.log-modal-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

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

.log-main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

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
}

.category-tab.active {
  background: white;
  font-weight: 600;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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
}

.log-right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
}

.log-search {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.search-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* ✅ 虚拟滚动样式优化 */
.log-content {
  flex: 1;
  overflow-y: auto;
  background: #fafafa;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.log-content :deep(.vue-recycle-scroller__item-view) {
  padding: 0 24px;
}

.log-line {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  line-height: 1.6;
  min-height: 32px;
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
}

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
}

.scroll-to-bottom-button:hover {
  background: rgba(37, 99, 235, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}
</style>
