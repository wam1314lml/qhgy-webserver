<template>
  <div class="quota-transfer">
    <a-card title="转移配额" :loading="loading">
      <template #extra><a-button :loading="loading" @click="load">刷新</a-button></template>
      <a-alert v-if="error" :message="error" type="error" show-icon class="notice" />
      <template v-if="settings">
        <a-alert v-if="!settings.enabled" message="配额转移暂未开放，请等待管理员开启。" type="warning" show-icon class="notice" />
        <div class="balance">可用配额 <strong>{{ settings.balance }}</strong> 点</div>
        <div class="rules">
          <h3>转移规则</h3>
          <p>1 点起转，只支持整数点数。请输入对方在本站登录使用的账号，不能转给自己。</p>
          <p>当前手续费为 <b>{{ settings.feePercent }}%</b>，按“转移点数 × 费率”向上取整至整点，由转出方额外支付。</p>
          <p v-if="settings.feePercent === 10">转移 1–10 点收 1 点；11–20 点收 2 点；21–30 点收 3 点。</p>
          <p>例如转移 30 点，对方到账 30 点，手续费 {{ exampleFee }} 点，需有 {{ 30 + exampleFee }} 点余额。</p>
          <p>成功后即时到账，并记入双方个人中心的交易历史。请仔细核对接收账号和金额，已完成的转移无法自行撤销。</p>
        </div>
        <a-alert v-if="pending" message="有一笔结果待确认的转移，请继续核对；重试会使用同一请求，避免重复扣款。" type="info" show-icon class="notice" />
        <a-form layout="vertical" :model="{ recipientUsername, amount }" @finish="preview">
          <a-form-item label="对方网站账号"><a-input v-model:value="recipientUsername" :maxlength="50" :disabled="!!pending || !settings.enabled" placeholder="请输入对方登录账号" autocomplete="off" /></a-form-item>
          <a-form-item label="转移点数"><a-input-number v-model:value="amount" :min="1" :max="99999999" :precision="0" :disabled="!!pending || !settings.enabled" style="width:100%" /></a-form-item>
          <a-button v-if="pending" type="primary" @click="resume">继续确认本笔转移</a-button>
          <a-button v-else type="primary" html-type="submit" :loading="previewing" :disabled="!settings.enabled || !validInput">预览转移</a-button>
        </a-form>
      </template>
    </a-card>
    <a-modal :open="modalOpen" title="确认转移配额" :confirm-loading="submitting" :closable="!submitting"
      :mask-closable="false" :keyboard="!submitting" :cancel-button-props="{ disabled: submitting }"
      ok-text="确认转移" cancel-text="返回" @ok="submit" @cancel="modalOpen = false">
      <template v-if="quote">
        <p>请确认转移至账号：<strong>{{ quote.recipientUsername }}</strong></p>
        <dl class="quote">
          <div><dt>转移点数</dt><dd>{{ quote.amount }} 点</dd></div>
          <div><dt>对方到账</dt><dd>{{ quote.received }} 点</dd></div>
          <div><dt>手续费（{{ quote.feePercent }}%，向上取整）</dt><dd>{{ quote.fee }} 点</dd></div>
          <div class="quote-total"><dt>实付点数</dt><dd>{{ quote.totalDebit }} 点</dd></div>
          <div><dt>当前余额</dt><dd>{{ quote.balance }} 点</dd></div>
          <div><dt>转移后剩余</dt><dd>{{ quote.balanceAfter }} 点</dd></div>
        </dl>
        <p class="hint">以上为预览，提交时会重新核对余额、费率和模块开关。</p>
        <a-alert v-if="submitError" type="error" :message="submitError" show-icon />
      </template>
    </a-modal>
    <a-alert v-if="success" type="success" :message="success" show-icon class="result" />
    <PointTransactionHistory ref="history" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from '../utils/axios'
import { getCurrentUser, updateUserBalance } from '../utils/userUtils'
import PointTransactionHistory from './PointTransactionHistory.vue'
type Quote = { recipientId: number; recipientUsername: string; amount: number; received: number; fee: number;
  totalDebit: number; feeBasisPoints: number; feePercent: number; balance: string; balanceAfter: string }
type Pending = { quote: Quote; requestId: string }
const settings = ref<any>(null), loading = ref(false), error = ref(''), success = ref('')
const recipientUsername = ref(''), amount = ref<number | null>(1), previewing = ref(false)
const quote = ref<Quote | null>(null), pending = ref<Pending | null>(null)
const modalOpen = ref(false), submitting = ref(false), submitError = ref('')
const history = ref<InstanceType<typeof PointTransactionHistory> | null>(null)
const ownerId = getCurrentUser()?.id
const storageKey = `quota-transfer-pending:${ownerId}`
const validInput = computed(() => recipientUsername.value.trim() && Number.isInteger(amount.value) && Number(amount.value) >= 1)
const exampleFee = computed(() => Math.floor((30 * (settings.value?.feeBasisPoints || 0) + 9999) / 10000))
const errorMessage = (e: any) => e.response?.data?.message || e.message || '请求失败，请稍后重试'
async function load() {
  loading.value = true; error.value = ''
  try { const { data } = await axios.get('/api/quota-transfers/settings'); if (!data.success) throw new Error(data.message); settings.value = data.data }
  catch (e) { settings.value = null; error.value = errorMessage(e) }
  finally { loading.value = false }
}
async function preview() {
  if (previewing.value || pending.value || !validInput.value || !settings.value?.enabled) return
  previewing.value = true; error.value = ''; success.value = ''
  try {
    const { data } = await axios.post('/api/quota-transfers/preview', { recipientUsername: recipientUsername.value.trim(), amount: amount.value })
    if (!data.success) throw new Error(data.message)
    quote.value = data.data; submitError.value = ''; modalOpen.value = true
  } catch (e) { error.value = errorMessage(e) }
  finally { previewing.value = false }
}
function resume() { if (pending.value) { quote.value = pending.value.quote; modalOpen.value = true } }
async function submit() {
  if (submitting.value || !quote.value) return
  if (!ownerId || getCurrentUser()?.id !== ownerId) { submitError.value = '登录账号已切换，请刷新页面'; return }
  submitting.value = true; submitError.value = ''
  try {
    if (!pending.value) {
      pending.value = { quote: { ...quote.value }, requestId: crypto.randomUUID() }
      // 先保留请求标识，再发出请求；断网、切页或刷新后都能用原标识核对。
    }
    sessionStorage.setItem(storageKey, JSON.stringify(pending.value))
    const current = pending.value
    const { data } = await axios.post('/api/quota-transfers', { requestId: current.requestId,
      recipientId: current.quote.recipientId, recipientUsername: current.quote.recipientUsername,
      amount: current.quote.amount, feeBasisPoints: current.quote.feeBasisPoints })
    if (!data.success) throw new Error(data.message || '转移结果尚未确认')
    sessionStorage.removeItem(storageKey); pending.value = null; modalOpen.value = false
    const result = data.data
    success.value = `已转移 ${result.amount} 点至 ${result.recipientUsername}，到账 ${result.received} 点，手续费 ${result.fee} 点，实付 ${result.totalDebit} 点，本笔转移后剩余 ${result.balanceAfter} 点。`
    await Promise.all([load(), updateUserBalance(), history.value?.refresh()])
  } catch (e: any) {
    submitError.value = errorMessage(e)
    // 只有明确业务拒绝才能重新预览；超时/5xx保留原请求，禁止换号重复扣款。
    if ([400, 403, 404, 409].includes(e.response?.status) && e.response?.data?.code !== 'REQUEST_CONFLICT') {
      sessionStorage.removeItem(storageKey); pending.value = null; modalOpen.value = false
      error.value = submitError.value
    }
  } finally { submitting.value = false }
}
onMounted(() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
    if (saved?.requestId && saved?.quote?.recipientId) {
      pending.value = saved; recipientUsername.value = saved.quote.recipientUsername; amount.value = saved.quote.amount
    }
  } catch { error.value = '无法读取待确认转移，请先检查个人中心交易历史' }
  void load()
})
</script>

<style scoped>
.quota-transfer{max-width:960px;margin:0 auto;display:grid;gap:24px}.notice{margin-bottom:20px}.balance{font-size:16px;margin:4px 0 22px}.balance strong{font-size:32px;color:var(--theme-primary,#10b981);margin:0 8px}.rules{background:#f7faf9;border:1px solid #e3eee8;border-radius:12px;padding:18px;margin-bottom:24px;color:#536471}.rules h3{color:#263d35;font-size:16px}.rules p{margin:7px 0;line-height:1.8}.ant-form{max-width:500px}.quote div{display:flex;justify-content:space-between;gap:15px;padding:9px 0}.quote dd{margin:0;font-weight:600}.quote-total{border-top:1px solid #eee;color:#079767;font-size:17px}.hint{font-size:12px;color:#8490a0}.result{overflow-wrap:anywhere}
</style>
