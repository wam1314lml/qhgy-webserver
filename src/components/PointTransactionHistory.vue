<template>
  <section class="point-history">
    <div class="history-heading"><h3>交易历史</h3><a-button :loading="loading" @click="refresh">刷新</a-button></div>
    <p v-if="account">账号：{{ account.username }} · 当前配额：{{ account.points }} 点</p>
    <a-alert v-if="error" type="error" :message="error" show-icon />
    <a-spin :spinning="loading">
      <div v-for="item in records" :key="item.id" class="history-row">
        <div class="history-detail">
          <strong>{{ typeName(item.transaction_type) }}</strong>
          <p>{{ item.description }}</p>
          <small>{{ paymentName(item.payment_method) }} · {{ formatDate(item.created_at) }} · {{ statusName(item.status) }}</small>
        </div>
        <div class="history-amount">
          <strong :class="isDebit(item.transaction_type, item.amount) ? 'debit' : 'credit'">{{ isDebit(item.transaction_type, item.amount) ? '−' : '+' }} {{ String(item.amount).replace(/^-/, '') }}</strong>
          <small>余额：{{ item.balance_after }}</small>
        </div>
      </div>
      <a-empty v-if="!loading && !error && !records.length" description="暂无交易记录" />
    </a-spin>
    <a-pagination v-if="total > pageSize" :current="page" :page-size="pageSize" :total="total"
      :show-size-changer="false" size="small" @change="changePage" />
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import axios from '../utils/axios'
const props = defineProps<{ username?: string; admin?: boolean; token?: string }>()
const records = ref<any[]>([]), account = ref<any>(null), page = ref(1), total = ref(0)
const pageSize = 20, loading = ref(false), error = ref('')
let generation = 0
const typeNames: Record<string, string> = { recharge: '充值', consume: '消费', refund: '退款', bonus: '赠送',
  transfer_out: '配额转出（含手续费）', transfer_in: '配额转入' }
const typeName = (type: string) => typeNames[type] || type
// 兼容旧管理员扣点流水把consume金额存为负数，避免出现双负号。
const isDebit = (type: string, amount: unknown) => ['consume', 'transfer_out'].includes(type) || Number(amount) < 0
const statuses: Record<string, string> = { completed: '已完成', pending: '处理中', failed: '失败', cancelled: '已取消' }
const statusName = (status: string) => statuses[status] || status
const payments: Record<string, string> = { alipay: '支付宝', wechat: '微信支付', shengpay: '盛付通', bank: '银行卡', admin: '管理员', lakalapay: '拉卡拉', wechatAppPay: '微信支付' }
const paymentName = (method: string) => payments[method] || method || '-'
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
async function load() {
  const request = ++generation
  if (props.admin && !props.username) { records.value = []; account.value = null; total.value = 0; loading.value = false; return }
  loading.value = true; error.value = ''
  try {
    const { data } = await axios.get(props.admin ? '/api/admin/quota-transfers/user-history' : '/api/quota-transfers/history', {
      params: { page: page.value, limit: pageSize, ...(props.admin ? { username: props.username } : {}) },
      ...(props.admin && props.token ? { headers: { Authorization: `Bearer ${props.token}` } } : {}),
      handleErrorLocally: true,
    })
    if (request !== generation) return
    if (!data.success || !Array.isArray(data.data?.transactions)) throw new Error('交易记录格式异常')
    records.value = data.data.transactions; total.value = data.data.pagination.total; account.value = data.data.user || null
  } catch (e: any) { if (request === generation) error.value = e.response?.data?.message || e.message || '读取交易历史失败' }
  finally { if (request === generation) loading.value = false }
}
function refresh() { page.value = 1; return load() }
function changePage(value: number) { page.value = value; void load() }
watch(() => props.username, () => { records.value = []; account.value = null; total.value = 0; void refresh() }, { immediate: true })
onBeforeUnmount(() => { generation++ })
defineExpose({ refresh })
</script>

<style scoped>
.point-history{background:#fff;border-radius:16px;padding:24px;color:#334155}.history-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.history-heading h3{margin:0;font-size:18px}.history-row{display:flex;gap:20px;justify-content:space-between;padding:18px 0;border-bottom:1px solid #eef0f3}.history-detail{min-width:0;overflow-wrap:anywhere}.history-detail p{margin:5px 0;color:#64748b}.history-row small{display:block;color:#8490a0;font-size:12px}.history-amount{flex-shrink:0;text-align:right}.history-amount strong{font-size:18px}.debit{color:#ef4444}.credit{color:#10b981}.ant-pagination{margin-top:20px}@media(max-width:540px){.point-history{padding:16px}.history-row{gap:10px}.history-amount strong{font-size:16px}}
</style>
