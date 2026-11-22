<template>
  <Modal :open="open" title="分享/导入" :footer="null" centered :width="560" :mask-closable="!busy" :closable="!busy" :keyboard="!busy" @cancel="close">
    <TransferModeTabs value="share" :disabled="busy" @change="switchToSameAccount" />
    <Tabs v-model:active-key="tab">
      <Tabs.TabPane key="create" tab="生成分享码">
        <p>分享所选页签的设置，包含尚未保存的修改。生成后 24 小时内有效。</p>
        <fieldset class="share-sections" :disabled="busy">
          <legend>分享内容</legend>
          <Checkbox.Group v-model:value="selectedSections" class="share-section-options" :disabled="busy" @change="selectionChanged">
            <Checkbox v-for="section in adapter.sections" :key="section.key" :value="section.key">{{ section.label }}</Checkbox>
          </Checkbox.Group>
          <p class="share-section-hint">取消的页签不会进入分享码，导入时保留对方原有设置。</p>
          <p v-if="!selectedSections.length" class="share-section-empty" role="status">请至少选择一个分享页签</p>
        </fieldset>
        <Alert type="info" show-icon :message="adapter.privacyNotice" />
        <Button v-if="!generated" class="share-action" type="primary" :loading="busy" :disabled="busy || remaining > 0 || !selectedSections.length" @click="generate">
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
        <div v-if="hasAccountTargets" class="share-targets">
          <AccountTargetSelector v-model:value="selectedAccountIds" :options="accountOptions" :loading="accountsLoading" :disabled="busy" />
          <p class="share-target-hint">已选 {{ selectedAccountIds.length }} / {{ accountOptions.length }} 个。导入会直接保存所选账号；请先保存当前页需要保留的修改。</p>
          <Alert v-if="accountsError" type="error" :message="accountsError" show-icon />
          <Button v-if="accountsError" class="share-action" :disabled="busy || accountsLoading" @click="loadAccounts">重新加载账号</Button>
        </div>
        <Button class="share-action" :loading="busy" :disabled="busy || !input.trim() || remaining > 0 || (hasAccountTargets && (accountsLoading || !selectedAccountIds.length))" @click="loadPreview">
          {{ remaining > 0 ? `请等待 ${remaining} 秒` : '读取并预览' }}
        </Button>
        <div v-if="preview && resolved" class="share-preview">
          <p>有效至 {{ formatShareDate(resolved.expiresAt) }}（UTC+8）</p>
          <p><strong>{{ hasAccountTargets ? '当前页面预览：' : '将修改 ' }}{{ preview.count }} 项设置</strong><span v-if="preview.ignored">，忽略 {{ preview.ignored }} 个已移除或不支持的字段</span>。</p>
          <ul v-if="preview.groups.length">
            <li v-for="group in preview.groups" :key="group.name">{{ group.name }}：{{ group.count }} 项</li>
          </ul>
          <Alert type="warning" show-icon :message="hasAccountTargets ? importNotice : adapter.applyNotice" />
          <Button class="share-action" type="primary" :loading="busy" :disabled="busy || remaining > 0 || (hasAccountTargets ? accountsLoading || !selectedAccountIds.length : !preview.count)" @click="applyPreview">{{ hasAccountTargets ? '导入并保存到所选账号' : '应用到当前页面' }}</Button>
        </div>
      </Tabs.TabPane>
    </Tabs>
    <p v-if="importProgress" role="status" class="share-progress">{{ importProgress }}</p>
    <ul v-if="importResults.some(item => !item.success)" class="share-results"><li v-for="item in importResults.filter(item => !item.success)" :key="item.id">{{ accountLabel(item.id) }}：{{ item.message }}</li></ul>
    <Alert v-if="errorText" type="error" show-icon :message="errorText" class="share-error" />
  </Modal>
</template>

<script setup lang="ts" generic="T">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { Alert, Button, Checkbox, Input, Modal, Tabs, message } from 'ant-design-vue'
import TransferModeTabs from './TransferModeTabs.vue'
import AccountTargetSelector from './AccountTargetSelector.vue'
import { importError, importShareToAccounts, type AccountImportApi, type ImportAccount, type ImportResult } from './accountImport'
import type { ConfigShareAdapter } from './adapter'
import type { ConfigShareApi, ShareMetadata } from './api'
import { formatShareDate, formatShareText, parseShareText, type ShareResult } from './core'

const props = defineProps<{ open: boolean; current: T; adapter: ConfigShareAdapter<T>; api: ConfigShareApi; accountId?: number | string; accountApi?: AccountImportApi }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; apply: [config: T]; 'same-account': []; imported: [] }>()
const selectedSections = ref<string[]>(props.adapter.sections.map(section => section.key))
function selectionChanged() { generated.value = undefined; errorText.value = '' }
const hasAccountTargets = computed(() => !!props.accountApi && Number.isSafeInteger(Number(props.accountId)) && Number(props.accountId) > 0)
const accountOptions = ref<ImportAccount[]>([])
const selectedAccountIds = ref<number[]>([])
const accountsLoading = ref(false)
const accountsError = ref('')
const importResults = ref<ImportResult[]>([])
const importProgress = ref('')
let currentAccountImported = false
const importApi = computed(() => props.accountApi!)
const importNotice = '请核对资源消耗、自动购买等设置。导入会直接保存所选账号，只覆盖分享中的字段；导入后需先停止再启动才生效。'
function switchToSameAccount(mode: 'share' | 'same') {
  if (mode !== 'same' || busy.value) return
  close()
  emit('same-account')
}
function accountLabel(id: number) { return accountOptions.value.find(account => account.value === id)?.label || `账号${id}` }
async function loadAccounts() {
  if (!hasAccountTargets.value) return
  const version = generation
  accountsLoading.value = true; accountsError.value = ''; accountOptions.value = []
  selectedAccountIds.value = []
  try {
    const accounts = await importApi.value.list()
    if (version !== generation) return
    accountOptions.value = accounts
    selectedAccountIds.value = accounts.some(account => account.value === Number(props.accountId)) ? [Number(props.accountId)] : []
    if (!accounts.length) accountsError.value = '当前网页账号下没有可导入的游戏账号'
  } catch (error) { if (version === generation) accountsError.value = importError(error) }
  finally { if (version === generation) accountsLoading.value = false }
}
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
function close() {
  if (busy.value) return
  emit('update:open', false)
  if (currentAccountImported) { currentAccountImported = false; emit('imported') }
}
watch(input, () => { preview.value = undefined; resolved.value = undefined; errorText.value = '' })
watch(() => props.open, open => {
  generation++
  if (open) { tab.value = 'create'; importResults.value = []; importProgress.value = ''; currentAccountImported = false; loadAccounts() }
  if (open) selectedSections.value = props.adapter.sections.map(section => section.key)
  if (!open) { preview.value = undefined; resolved.value = undefined; generated.value = undefined; input.value = ''; errorText.value = '' }
})
watch(() => props.accountId, () => { generation++; currentAccountImported = false; preview.value = undefined; resolved.value = undefined; importResults.value = []; importProgress.value = ''; if (props.open) loadAccounts() })
onUnmounted(() => { generation++; if (countdown) clearInterval(countdown) })
async function generate() {
  if (busy.value || remaining.value || generated.value || !selectedSections.value.length) return
  const version = generation
  busy.value = true; errorText.value = ''
  try {
    const result = await props.api.create(props.adapter.exportConfig(props.current, selectedSections.value))
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
    if (hasAccountTargets.value) {
      if (accountsLoading.value || !selectedAccountIds.value.length) throw new Error('请先选择需要覆盖的游戏账号')
      importResults.value = []
      const results = await importShareToAccounts({
        ids: selectedAccountIds.value, accounts: accountOptions.value, share: result,
        adapter: props.adapter, api: importApi.value, isCurrent: () => version === generation,
        onProgress: (completed, total) => { importProgress.value = `正在导入 ${completed} / ${total}` },
      })
      if (version !== generation) return
      importResults.value = results
      const failed = results.filter(item => !item.success)
      const succeeded = results.filter(item => item.success)
      currentAccountImported ||= succeeded.some(item => item.id === Number(props.accountId))
      selectedAccountIds.value = failed.map(item => item.id)
      importProgress.value = `成功 ${succeeded.length} 个，失败 ${failed.length} 个。${failed.length ? '失败项已保留，请核对后重试。' : '已导入并保存，需先停止再启动才生效。'}`
      if (!failed.length) {
        message.success(importProgress.value)
        emit('update:open', false)
        if (currentAccountImported) { currentAccountImported = false; emit('imported') }
      }
      return
    }
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
.share-targets { margin-top: 16px; }
.share-target-hint { margin: 8px 0; color: #667085; font-size: 13px; line-height: 1.6; }
.share-progress { margin: 16px 0 0; }
.share-results { max-height: 180px; overflow: auto; overflow-wrap: anywhere; padding-left: 20px; color: #b42318; }
.share-action { margin-top: 16px; max-width: 100%; white-space: normal; height: auto; min-height: 32px; }
.share-time { margin-top: 16px; line-height: 1.8; color: #555; }
.share-preview { margin-top: 18px; padding: 14px; border-radius: 8px; background: #f5f8f6; }
.share-preview ul { padding-left: 20px; }
.share-error { margin-top: 16px; }

.share-sections { min-width: 0; margin: 16px 0; padding: 0; border: 0; }
.share-sections legend { margin-bottom: 8px; font-size: 14px; font-weight: 600; }
.share-section-options { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.share-section-options :deep(.ant-checkbox-wrapper) { min-height: 36px; margin-inline-start: 0; align-items: center; }
.share-section-hint { margin: 8px 0 0; color: #667085; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.share-section-empty { margin: 4px 0 0; color: #b42318; font-size: 13px; }
</style>
