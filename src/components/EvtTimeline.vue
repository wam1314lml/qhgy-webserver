<template>
  <div class="evt-history-panel">
    <button v-if="pendingCount" class="evt-history-more" @click="showLatest">有 {{ pendingCount }} 条新记录，点击查看</button>
    <DynamicScroller ref="scroller" v-if="shownEvents.length" class="evt-history-scroller" :items="shownEvents" :min-item-size="28" :prerender="8" key-field="id" @scroll="onScroll">
      <template #default="{ item, active }">
        <DynamicScrollerItem :item="item" :active="active" :size-dependencies="[item.desc, item.kv, item.gains]">
          <article class="evt-history-row evt-tl-item" :class="`evt-tl-item--${item.status}`">
            <div class="evt-tl-dot" aria-hidden="true"></div>
            <div class="evt-tl-body">
              <time class="evt-tl-time" :datetime="new Date(item.ts).toISOString()" :title="fullTime(item.ts)">{{ formatTime(item.ts) }}</time>
              <strong class="evt-tl-title">{{ item.title }}</strong>
              <span v-if="item.desc" class="evt-tl-desc">{{ item.desc }}</span>
              <div v-if="item.gains?.length" class="evt-tl-gains">
                <span v-for="(gain, index) in item.gains" :key="index" class="evt-tl-gain">{{ gain.icon || '' }} {{ gain.name }} x{{ gain.count }}</span>
              </div>
              <dl v-if="item.kv?.length" class="evt-history-details">
                <template v-for="(detail, index) in item.kv" :key="index"><dt>{{ detail.label }}</dt><dd>{{ displayValue(detail.value) }}</dd></template>
              </dl>
            </div>
          </article>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
    <p v-else class="evt-history-empty">{{ loading ? '正在读取事件记录…' : '此时间范围暂无事件记录' }}</p>
    <p v-if="error" class="evt-history-error">{{ error }}</p>
    <button v-if="hasMore || error" class="evt-history-more" :disabled="loading" @click="$emit('load-more')">
      {{ loading ? '正在读取…' : error ? '重试读取' : '加载更早的记录' }}
    </button>
    <p v-else-if="loading && events.length" class="evt-history-empty">正在刷新记录…</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import type { EvtEvent } from '../utils/evtHistoryStorage'
const props = defineProps<{ events: EvtEvent[]; loading?: boolean; hasMore?: boolean; error?: string }>()
defineEmits<{ (event: 'load-more'): void }>()
const scroller = ref<any>()
const following = ref(true)
const shownEvents = shallowRef(props.events)
const pendingCount = computed(() => Math.max(0, props.events.length - shownEvents.value.length))
watch(() => props.events, events => {
  // 阅读较早记录时保留顶部锚点，旧页可以追加到下方，新事件等待用户返回顶部。
  const index = following.value ? 0 : events.findIndex(event => event.id === shownEvents.value[0]?.id)
  shownEvents.value = index > 0 ? events.slice(index) : events
})
async function showLatest() {
  following.value = true
  shownEvents.value = props.events
  await nextTick()
  if (scroller.value?.$el) scroller.value.$el.scrollTop = 0
}
function onScroll() {
  following.value = (scroller.value?.$el?.scrollTop ?? 0) <= 8
  if (following.value && pendingCount.value) showLatest()
}
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return [date.getHours(), date.getMinutes(), date.getSeconds()].map(value => String(value).padStart(2, '0')).join(':')
}
const fullTime = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
const displayValue = (value: unknown) => value != null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')
</script>

<style scoped>
.evt-history-scroller { height: min(55vh, 460px); min-height: 160px; padding: 8px 14px 10px; box-sizing: border-box; overflow-y: auto; overflow-anchor: none; }
/* 沿用原EventCardView的紧凑时间线，虚拟滚动只改变渲染方式。 */
.evt-tl-item { display:flex; gap:10px; padding:4px 0; overflow-wrap:anywhere; }
.evt-tl-dot { width:10px; height:10px; border-radius:50%; background:#d1d5db; flex-shrink:0; margin-top:3px; }
.evt-tl-item--success .evt-tl-dot { background:#10b981; }
.evt-tl-item--failed .evt-tl-dot { background:#ef4444; }
.evt-tl-item--warning .evt-tl-dot { background:#f59e0b; }
.evt-tl-item--info .evt-tl-dot { background:#3b82f6; }
.evt-tl-body { flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:baseline; gap:6px; }
.evt-tl-time { font-size:10px; color:#9ca3af; flex-shrink:0; }
.evt-tl-title { font-size:12px; font-weight:600; color:#374151; }
.evt-tl-desc { font-size:11px; color:#6b7280; }
.evt-tl-gains { display:flex; gap:3px; flex-wrap:wrap; width:100%; margin-top:2px; }
.evt-tl-gain { padding:1px 5px; border-radius:10px; font-size:10px; font-weight:500; background:#e0f2fe; color:#0369a1; }
.evt-history-details { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 10px; width:100%; margin:0; font-size:11px; }
.evt-history-details dt { color: #6b7280; }
.evt-history-details dd { margin: 0; white-space: pre-wrap; }
.evt-history-empty, .evt-history-error { padding: 8px 14px; margin: 0; color: #6b7280; font-size: 12px; }
.evt-history-error { color: #b91c1c; }
.evt-history-more { display: block; margin: 10px auto; padding: 6px 18px; border: 1px solid #93c5fd; border-radius: 5px; color: #1d4ed8; background: #eff6ff; cursor: pointer; }
</style>
