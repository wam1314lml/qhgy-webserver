<template>
  <BatchProgress v-model:open="progressOpen" :running="running" :busy="busy" :cancelled="cancelled" :dismissed="dismissed" :action="action" :completed="completed" :total="total" :results="results" :summary="summary" :label="currentLabel" :plan-label="planLabel" :request-pending="requestPending" @cancel="cancelled = true" @dismiss="dismissed = true" />
  <FloatButton.Group v-if="showMenu !== false && accounts.length" v-model:open="menuOpen" class="account-fab account-batch-fab" trigger="click" type="primary" shape="square" :style="{ left: '24px', right: 'auto', borderRadius: '8px' }" description="批量" @keydown.esc="menuOpen = false">
    <template #icon><CaretRightOutlined /></template><template #closeIcon><CaretRightOutlined /></template>
    <button type="button" class="account-batch-action" :disabled="disabled || busy" @click="confirmAction('start')"><span class="account-batch-action-icon account-batch-action-icon--start"><CaretRightOutlined /></span><span>启动全部</span></button>
    <button type="button" class="account-batch-action" :disabled="disabled || busy" @click="confirmAction('stop')"><span class="account-batch-action-icon account-batch-action-icon--stop"><span class="account-batch-stop-mark" /></span><span>停止全部</span></button>
    <button type="button" class="account-batch-action" :disabled="disabled || busy" @click="openQuota"><span class="account-batch-action-icon account-batch-action-icon--quota"><ShoppingCartOutlined /></span><span>全部配额</span></button>
  </FloatButton.Group>
  <Modal :open="quotaOpen" title="全部配额" :width="560" ok-text="确认分配" cancel-text="取消" :ok-button-props="{ disabled: !quote || loading || confirming }" @ok="confirmQuota" @cancel="closeQuota">
    <p v-if="loading">正在读取套餐和余额…</p>
    <Alert v-else-if="loadError" type="error" :message="loadError" show-icon />
    <template v-else>
      <p>当前余额：{{ balance }} 配额；账号数：{{ snapshot.length }}</p>
      <div class="batch-plans"><Button v-for="(plan, index) in plans" :key="index" :type="selectedPlan === index ? 'primary' : 'default'" :disabled="confirming" @click="selectedPlan = index">{{ plan.label || `${plan.days}天` }}（{{ plan.points }}配额/号）</Button></div>
      <p v-if="!plans.length">暂无可用套餐</p>
      <label class="batch-extra">每号额外配额 <InputNumber :value="extra ?? undefined" @update:value="value => extra = value == null ? null : Number(value)" :min="0" :precision="0" :disabled="confirming" /></label>
      <div v-if="quote" class="batch-quote">
        <p>每号消耗：{{ quote.perAccount }} 配额</p><strong>预计总消耗：{{ quote.total }} 配额（{{ quote.count }}个账号）</strong>
        <p v-if="quote.affordable < quote.count" class="batch-warning">余额预计仅够 {{ quote.affordable }} 个账号，仍可确认；按列表顺序执行并保留成功、失败明细。</p>
      </div>
      <p>首个立即分配，之后每个间隔3.5秒。分配不可撤销，可取消尚未执行的账号。</p>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Alert, Button, FloatButton, InputNumber, Modal } from 'ant-design-vue'
import { CaretRightOutlined, ShoppingCartOutlined } from '@ant-design/icons-vue'
import BatchProgress from './BatchProgress.vue'
import axios from '../utils/axios'
import { runAccountBatch, batchSummary, type BatchAction, type BatchResult } from '../utils/accountBatch'
import { quotaAccounts, quotaQuote, runQuotaBatch, quotaBatchSummary, type QuotaAccount, type QuotaPlan, type QuotaBatchResult } from '../utils/quotaBatch'

const props = withDefaults(defineProps<{
  accounts: { id: number; nickname?: string; username?: string }[]
  showMenu?: boolean
  disabled: boolean
  ownerKey: string
  getStarted: (id: number) => Promise<boolean | undefined>
}>(), { showMenu: true })
const emit = defineEmits<{
  busy: [busy: boolean]
  started: [id: number, started: boolean]
  balance: [points: number]
  finished: []
}>()
const progressOpen = ref(false), requestPending = ref(false), currentLabel = ref(''), planLabel = ref('')
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function clearToast() { if (toastTimer) clearTimeout(toastTimer); toastTimer = undefined; toast.value = '' }
function showToast() { clearToast(); toast.value = `${actionLabel.value}：${summary.value}`; toastTimer = setTimeout(clearToast, 3000) }
const busy = ref(false), running = ref(false), cancelled = ref(false), menuOpen = ref(false)
const completed = ref(0), total = ref(0), action = ref<BatchAction | 'quota'>('start')
const results = ref<(BatchResult | QuotaBatchResult)[]>([]), dismissed = ref(false)
const quotaOpen = ref(false), loading = ref(false), loadError = ref(''), confirming = ref(false)
const snapshot = ref<QuotaAccount[]>([]), plans = ref<(QuotaPlan & { label?: string })[]>([])
const selectedPlan = ref(0), extra = ref<number | null>(0), balance = ref(0)
let owner: string | null = null, ownerKey = '', disposed = false, generation = 0
let dialog: ReturnType<typeof Modal.confirm> | undefined
const actionLabel = computed(() => action.value === 'quota' ? '全部配额' : action.value === 'start' ? '全部启动' : '全部停止')
const summary = computed(() => action.value === 'quota' ? quotaBatchSummary(results.value as QuotaBatchResult[]) : batchSummary(results.value as BatchResult[]))
const visibleResults = computed(() => action.value === 'quota' ? results.value : results.value.filter(row => row.status !== 'success'))
const quote = computed(() => {
  if (loading.value || loadError.value || extra.value == null || !plans.value[selectedPlan.value]) return null
  try { return quotaQuote(snapshot.value, { ...plans.value[selectedPlan.value], additionalPoints: extra.value }, balance.value) } catch { return null }
})
const current = () => !disposed && owner === localStorage.getItem('token') && ownerKey === props.ownerKey
function acquire() {
  if (disposed || busy.value || props.disabled || document.querySelector('.ant-modal-confirm')) return false
  owner = localStorage.getItem('token'); ownerKey = props.ownerKey
  if (!owner) return false
  snapshot.value = quotaAccounts(props.accounts.map(row => ({ id: Number(row.id), label: row.nickname || row.username || String(row.id) })))
  if (!snapshot.value.length) return false
  busy.value = true; cancelled.value = false; menuOpen.value = false; emit('busy', true)
  return true
}
function release() { busy.value = false; confirming.value = false; if (!disposed) emit('busy', false) }
function closeQuota() { if (running.value || confirming.value) return; generation++; quotaOpen.value = false; release() }
function progress(done: number, count: number) { if (current()) { completed.value = done; total.value = count } }
function prepare(kind: BatchAction | 'quota') {
  clearToast(); action.value = kind; results.value = []; dismissed.value = false; cancelled.value = false
  running.value = true; completed.value = 0; total.value = snapshot.value.length
  currentLabel.value = snapshot.value[0]?.label || ''; requestPending.value = false; progressOpen.value = true
}
function confirmAction(kind: BatchAction) {
  if (!acquire()) return
  dialog = Modal.confirm({ okText: '确认', cancelText: '取消', title: kind === 'start' ? '全部启动' : '全部停止', content: `将依次处理 ${snapshot.value.length} 个账号，可取消剩余账号。`,
    onCancel: () => { dialog = undefined; release() },
    onOk: () => { dialog = undefined; if (!current()) { release(); return }; void executeAction(kind) },
  })
}
async function executeAction(kind: BatchAction) {
  if (running.value || !busy.value || !current()) return
  planLabel.value = `依次处理 ${snapshot.value.length} 个角色 · 已处于目标状态的角色会跳过`
  prepare(kind)
  try {
    const rows = await runAccountBatch({ accounts: snapshot.value, action: kind,
      getStarted: async id => { if (current()) currentLabel.value = snapshot.value.find(row => row.id === id)?.label || String(id); return props.getStarted(id) },
      getExpired: async id => { const response = await axios.get(`/api/game-accounts/${id}/expired`, { handleErrorLocally: true }); return response.data?.success === true ? response.data.data?.isExpired : undefined },
      execute: async (id, act) => {
        requestPending.value = true
        try { return (await axios.post(`/api/game-accounts/${id}/${act}`, {}, { handleErrorLocally: true })).data }
        finally { requestPending.value = false }
      },
      isCancelled: () => cancelled.value || !current(),
      onStarted: (id, started) => { if (current()) emit('started', id, started) }, onProgress: progress,
    })
    if (current()) results.value = rows
  } finally { requestPending.value = false; if (!current()) progressOpen.value = false; running.value = false; release(); if (current()) emit('finished') }
}
async function openQuota() {
  if (!acquire()) return
  const version = ++generation
  quotaOpen.value = true; loading.value = true; loadError.value = ''; plans.value = []; selectedPlan.value = 0; extra.value = 0
  const active = () => current() && version === generation && quotaOpen.value
  try {
    const [funds, packages] = await Promise.all([axios.get('/api/points/balance'), axios.get('/api/quota-settings/active')])
    if (!active()) return
    const raw = funds.data?.points ?? funds.data?.data?.points
    if (raw == null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0 || funds.data?.success === false || packages.data?.success !== true || !Array.isArray(packages.data.data)) throw new Error('配额数据读取失败')
    balance.value = Number(raw)
    plans.value = packages.data.data.map((row: any) => ({ days: Number(row.days), points: Number(row.points), label: row.label, additionalPoints: 0 }))
      .filter((row: QuotaPlan) => Number.isFinite(row.days) && row.days > 0 && Number.isFinite(row.points) && row.points >= 0)
  } catch { if (active()) loadError.value = '配额数据读取失败，请关闭后重试' }
  finally { if (active()) loading.value = false; else if (!current() && version === generation) { quotaOpen.value = false; release() } }
}
function confirmQuota() {
  if (!current()) { closeQuota(); return }
  if (!quote.value || confirming.value || running.value || !busy.value) return
  // 确认时冻结名单、套餐和余额，绝不因弹窗后续变化改变扣款对象。
  const pending = { accounts: quotaAccounts(snapshot.value), plan: { ...plans.value[selectedPlan.value], additionalPoints: extra.value! }, balance: balance.value }
  const cost = quote.value.total
  confirming.value = true
  dialog = Modal.confirm({ okText: '确认', cancelText: '取消', title: '确认全部配额', content: `为 ${pending.accounts.length} 个账号分配，每号 ${pending.plan.days} 天，预计消耗 ${cost} 配额。分配不可撤销，是否继续？`,
    onCancel: () => { dialog = undefined; confirming.value = false },
    onOk: () => { dialog = undefined; if (!current()) { confirming.value = false; closeQuota(); return }; void executeQuota(pending) },
  })
}
async function executeQuota(pending: { accounts: QuotaAccount[]; plan: QuotaPlan; balance: number }) {
  if (running.value || !busy.value || !current()) return
  planLabel.value = `${pending.plan.days}天套餐 · 每个角色 ${quotaQuote(pending.accounts, pending.plan, pending.balance).perAccount} 点配额`
  quotaOpen.value = false; prepare('quota')
  try {
    const rows = await runQuotaBatch({ ...pending,
      execute: async (id, body) => {
        if (current()) { currentLabel.value = pending.accounts.find(row => row.id === id)?.label || String(id); requestPending.value = true }
        try { return (await axios.post(`/api/game-accounts/${id}/extend-quota`, body, { handleErrorLocally: true })).data }
        finally { requestPending.value = false }
      },
      isCancelled: () => cancelled.value || !current(), onProgress: (done, count) => {
        progress(done, count)
        if (current() && done < count && !requestPending.value) currentLabel.value = pending.accounts[done].label
      },
      onBalance: points => { if (current()) { balance.value = points; emit('balance', points) } },
    })
    if (current()) results.value = rows
  } finally { requestPending.value = false; if (!current()) progressOpen.value = false; running.value = false; release(); if (current()) emit('finished') }
}
function beforeUnload(event: BeforeUnloadEvent) { if (disposed || !running.value) return; event.preventDefault(); event.returnValue = '' }
watch(running, value => { if (value) window.addEventListener('beforeunload', beforeUnload); else window.removeEventListener('beforeunload', beforeUnload) }, { flush: 'sync' })
function clearResult() { if (!busy.value && !running.value) { dismissed.value = true; progressOpen.value = false; results.value = [] } }
defineExpose({ openQuota, clearResult })
watch(() => props.ownerKey, () => { progressOpen.value = false; clearToast(); cancelled.value = true; generation++; results.value = []; quotaOpen.value = false; dialog?.destroy(); dialog = undefined; if (!running.value) release() })
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); clearToast(); disposed = true; cancelled.value = true; generation++; dialog?.destroy() })
</script>

<style scoped>
.account-fab { width: 48px; bottom: calc(48px + env(safe-area-inset-bottom)); }
.account-fab :deep(> .ant-float-btn) { width: 48px; height: 48px; min-height: 48px; border-radius: 8px; }
.account-fab :deep(> .ant-float-btn .ant-float-btn-body) { height: 100%; border-radius: 8px; }
.account-fab :deep(> .ant-float-btn .ant-float-btn-content) { padding: 4px; gap: 2px; }
.account-fab :deep(> .ant-float-btn .ant-float-btn-icon) { margin: 0; height: 18px; font-size: 18px; line-height: 18px; }
.account-fab :deep(> .ant-float-btn .ant-float-btn-description) { margin: 0; font-size: 12px; line-height: 16px; white-space: nowrap; }
.account-batch-fab :deep(.ant-float-btn-group-wrap) { width: 136px; background: transparent; box-shadow: none; }
.account-batch-action {
  display: flex; align-items: center; gap: 10px; width: 136px; min-height: 44px;
  margin: 0 0 8px; padding: 8px 12px; border: 0; border-radius: 10px;
  background: #fff; color: #26334d; box-shadow: 0 4px 16px rgba(27, 50, 92, .16);
  font: inherit; font-size: 14px; white-space: nowrap; cursor: pointer;
}
.account-batch-action:hover { background: #f0f5ff; }
.account-batch-action:disabled { opacity: .5; cursor: not-allowed; }
.account-batch-action:focus-visible { outline: 2px solid #1677ff; outline-offset: 2px; }
.account-batch-action-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; color: #fff; font-size: 20px; }
.account-batch-action-icon--start { background: #36ad6a; }
.account-batch-action-icon--stop { background: #ed5862; }
.account-batch-stop-mark { width: 10px; height: 10px; background: #fff; border-radius: 1px; }

.account-batch-action-icon--quota { background: #1677ff; }

.batch-toast { position: fixed; z-index: 1100; left: 50%; top: 28px; transform: translateX(-50%); max-width: calc(100vw - 32px); padding: 10px 16px; border-radius: 8px; color: white; background: rgba(0,0,0,.8); pointer-events: none; overflow-wrap: anywhere; }
.batch-progress,.batch-result { padding: 12px 38px 12px 14px; margin-bottom: 12px; background: white; border: 1px solid #d9d9d9; border-radius: 10px; overflow-wrap: anywhere; position: relative; }
.batch-progress { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.batch-result ul { margin: 8px 0 0; padding-left: 18px; max-height: 220px; overflow: auto; overscroll-behavior: contain; }
.batch-close { position: absolute; top: 6px; right: 6px; border: 0; background: transparent; cursor: pointer; font-size: 22px; width: 28px; height: 28px; }
.batch-plans { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
.batch-plans :deep(button) { white-space: normal; height: auto; max-width: 100%; }
.batch-extra { display: flex; align-items: center; gap: 12px; margin: 14px 0; }
.batch-quote { padding: 12px; background: #f0f7ff; border-radius: 8px; margin: 12px 0; overflow-wrap: anywhere; }
.batch-warning { color: #ad4e00; margin-top: 8px; }
</style>
