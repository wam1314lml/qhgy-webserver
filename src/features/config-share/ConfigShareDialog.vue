<template>
  <Modal :open="open" title="配置分享" :footer="null" centered :width="560" :mask-closable="!busy" :closable="!busy" @cancel="close">
    <Tabs v-model:active-key="tab">
      <Tabs.TabPane key="create" tab="生成分享码">
        <p>分享当前页面的设置，包含尚未保存的修改。生成后 24 小时内有效。</p>
        <Alert type="info" show-icon :message="adapter.privacyNotice" />
        <Button v-if="!generated" class="share-action" type="primary" :loading="busy" :disabled="busy || remaining > 0" @click="generate">
          {{ remaining > 0 ? `请等待 ${remaining} 秒` : '生成分享码' }}
        </Button>
        <template v-if="generated">
          <p class="share-time">生成：{{ formatShareDate(generated.createdAt) }}<br>到期：{{ formatShareDate(generated.expiresAt) }}（UTC+8）</p>
          <Input.TextArea :value="shareText" readonly :auto-size="{ minRows: 3, maxRows: 5 }" aria-label="完整分享文本" />
          <Button class="share-action" @click="copyText">复制完整分享文本</Button>
        </template>
      </Tabs.TabPane>
      <Tabs.TabPane key="import" tab="导入分享码">
        <p>粘贴完整分享文本或 16 位短码。只覆盖分享中仍受支持的配置，新增设置保留当前值。</p>
        <Input.TextArea v-model:value="input" :disabled="busy" :maxlength="512" :auto-size="{ minRows: 3, maxRows: 5 }" :placeholder="`杰尼龟~${adapter.project.name}~生成日期~有效期~到期时间~分享码`" aria-label="要导入的分享码" />
        <Button class="share-action" :loading="busy" :disabled="busy || !input.trim() || remaining > 0" @click="loadPreview">
          {{ remaining > 0 ? `请等待 ${remaining} 秒` : '读取并预览' }}
        </Button>
        <div v-if="preview && resolved" class="share-preview">
          <p>有效至 {{ formatShareDate(resolved.expiresAt) }}（UTC+8）</p>
          <p><strong>将修改 {{ preview.count }} 项设置</strong><span v-if="preview.ignored">，忽略 {{ preview.ignored }} 个已移除或不支持的字段</span>。</p>
          <ul v-if="preview.groups.length">
            <li v-for="group in preview.groups" :key="group.name">{{ group.name }}：{{ group.count }} 项</li>
          </ul>
          <Alert type="warning" show-icon :message="adapter.applyNotice" />
          <Button class="share-action" type="primary" :loading="busy" :disabled="busy || !preview.count || remaining > 0" @click="applyPreview">应用到当前页面</Button>
        </div>
      </Tabs.TabPane>
    </Tabs>
    <Alert v-if="errorText" type="error" show-icon :message="errorText" class="share-error" />
  </Modal>
</template>

<script setup lang="ts" generic="T">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Alert, Button, Input, Modal, Tabs, message } from 'ant-design-vue'
import type { ConfigShareAdapter } from './adapter'
import type { ConfigShareApi, ShareMetadata } from './api'
import { formatShareDate, formatShareText, parseShareText, type ShareResult } from './core'

const props = defineProps<{ open: boolean; current: T; adapter: ConfigShareAdapter<T>; api: ConfigShareApi }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; apply: [config: T] }>()
const tab = ref('create')
const input = ref('')
const busy = ref(false)
const errorText = ref('')
const generated = shallowRef<ShareMetadata>()
const resolved = shallowRef<ShareResult>()
const preview = shallowRef<ReturnType<ConfigShareAdapter<T>['preview']>>()
const remaining = ref(0)
let countdown: ReturnType<typeof setInterval> | undefined
let generation = 0
const shareText = computed(() => generated.value ? formatShareText(generated.value, props.adapter.project) : '')
function cooldown(seconds: number) {
  if (countdown) clearInterval(countdown)
  remaining.value = Math.max(1, Math.min(86400, Math.ceil(seconds)))
  countdown = setInterval(() => { if (--remaining.value <= 0 && countdown) clearInterval(countdown) }, 1000)
}
function fail(error: unknown) {
  const response = (error as { response?: { data?: { message?: string; retryAfter?: number } } }).response
  errorText.value = response?.data?.message || (error as Error)?.message || '操作失败，请稍后重试'
  if (response?.data?.retryAfter) cooldown(response.data.retryAfter)
}
function close() { if (!busy.value) emit('update:open', false) }
watch(input, () => { preview.value = undefined; resolved.value = undefined; errorText.value = '' })
watch(() => props.open, open => {
  generation++
  if (!open) { preview.value = undefined; resolved.value = undefined; generated.value = undefined; input.value = ''; errorText.value = '' }
})
onUnmounted(() => { generation++; if (countdown) clearInterval(countdown) })
async function generate() {
  if (busy.value || remaining.value || generated.value) return
  const version = generation
  busy.value = true; errorText.value = ''
  try {
    const result = await props.api.create(props.adapter.exportConfig(props.current))
    if (version !== generation) return
    generated.value = result
  } catch (error) { if (version === generation) fail(error) }
  finally { busy.value = false }
}
async function loadPreview() {
  if (busy.value || remaining.value) return
  const version = generation
  busy.value = true; errorText.value = ''; preview.value = undefined; resolved.value = undefined
  try {
    const result = await props.api.resolve(parseShareText(input.value, props.adapter.project))
    if (version !== generation) return
    preview.value = props.adapter.preview(props.current, result)
    resolved.value = result
  } catch (error) { if (version === generation) fail(error) }
  finally { busy.value = false }
}
async function applyPreview() {
  if (busy.value || remaining.value || !resolved.value || !preview.value) return
  const version = generation
  busy.value = true; errorText.value = ''
  try {
    // 应用时复核到期；基于当前表单重新计算，不能覆盖预览期间的新编辑。
    const result = await props.api.resolve(resolved.value.code)
    if (version !== generation) return
    const latest = props.adapter.preview(props.current, result)
    emit('apply', latest.config)
    emit('update:open', false)
  } catch (error) { if (version === generation) fail(error) }
  finally { busy.value = false }
}
async function copyText() {
  try { await navigator.clipboard.writeText(shareText.value); message.success('已复制，分享码 24 小时内有效') }
  catch { message.info('无法自动复制，请长按上方文本全选复制') }
}
</script>

<style scoped>
.share-action { margin-top: 16px; max-width: 100%; white-space: normal; height: auto; min-height: 32px; }
.share-time { margin-top: 16px; line-height: 1.8; color: #555; }
.share-preview { margin-top: 18px; padding: 14px; border-radius: 8px; background: #f5f8f6; }
.share-preview ul { padding-left: 20px; }
.share-error { margin-top: 16px; }
</style>
