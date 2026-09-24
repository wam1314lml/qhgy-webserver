<template>
  <div class="transfer-admin">
    <a-alert v-if="error" :message="error" type="error" show-icon />
    <a-card title="配额交易设置" :loading="loading">
      <template #extra><a-button :loading="loading" @click="load">刷新</a-button></template>
      <a-form layout="inline" v-if="settings" :model="{ enabled, feePercent }" @finish="save">
        <a-form-item label="允许转移配额"><a-switch v-model:checked="enabled" :disabled="saving" /></a-form-item>
        <a-form-item label="手续费比例"><a-input-number v-model:value="feePercent" :min="0" :max="100" :precision="2" :disabled="saving" addon-after="%" /></a-form-item>
        <a-form-item><a-button type="primary" html-type="submit" :loading="saving">保存设置</a-button></a-form-item>
      </a-form>
      <p class="hint">初始关闭，默认费率 10%。手续费向上取整，额外从转出方扣除；保存关闭后，服务器会拒绝新的转移。</p>
      <p v-if="settings">当前生效：{{ settings.enabled ? '已开启' : '已关闭' }} · 手续费 {{ settings.feePercent }}%</p>
    </a-card>
    <a-card title="玩家配额交易统计">
      <div class="stats-grid" v-if="stats">
        <div v-for="item in statFields" :key="item.key" class="stat"><span>{{ item.label }}</span><strong>{{ stats[item.key] }}<small>{{ item.key === 'tradingUsers' ? ' 人' : ' 点' }}</small></strong></div>
      </div>
      <p class="hint">全站统计，按北京时间划分今日和当月。交易额为成功转移点数，单笔只计一次且不含手续费；交易用户数为累计转入、转出双方去重人数。</p>
    </a-card>
    <a-card title="查询玩家交易历史">
      <a-form layout="inline" :model="{ searchText }" @finish="search">
        <a-form-item label="网站账号"><a-input v-model:value="searchText" :maxlength="50" placeholder="输入完整登录账号" allow-clear /></a-form-item>
        <a-form-item><a-button type="primary" html-type="submit" :disabled="!searchText.trim()">查询</a-button></a-form-item>
      </a-form>
      <p class="hint">显示该用户个人中心的完整交易历史，包括转入、转出、充值和消费；上方全站统计不随查询变化。</p>
      <PointTransactionHistory v-if="username" :key="searchVersion" admin :username="username" :token="token" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import axios from '../../utils/axios'
import PointTransactionHistory from '../PointTransactionHistory.vue'
const props = defineProps<{ token: string }>()
const authOptions = () => ({ headers: { Authorization: `Bearer ${props.token}` }, handleErrorLocally: true })
const loading = ref(false), saving = ref(false), error = ref(''), settings = ref<any>(null), stats = ref<any>(null)
const enabled = ref(false), feePercent = ref<number | null>(10)
const searchText = ref(''), username = ref(''), searchVersion = ref(0)
const statFields = [ { key: 'tradingUsers', label: '交易用户数' }, { key: 'todayAmount', label: '今日交易额' },
  { key: 'monthAmount', label: '当月交易额' }, { key: 'todayFee', label: '今日手续费' },
  { key: 'monthFee', label: '当月手续费' }, { key: 'totalAmount', label: '总交易额' }, { key: 'totalFee', label: '总手续费' } ]
const errorMessage = (e: any) => e.response?.data?.message || e.message || '请求失败'
function apply(value: any) { settings.value = value; enabled.value = value.enabled; feePercent.value = value.feePercent }
async function load() {
  if (saving.value) return
  loading.value = true; error.value = ''
  try {
    const [setting, totals] = await Promise.all([axios.get('/api/admin/quota-transfers/settings', authOptions()), axios.get('/api/admin/quota-transfers/stats', authOptions())])
    apply(setting.data.data); stats.value = totals.data.data
  } catch (e) { error.value = errorMessage(e) }
  finally { loading.value = false }
}
async function save() {
  if (saving.value || loading.value) return
  saving.value = true; error.value = ''
  try {
    const { data } = await axios.put('/api/admin/quota-transfers/settings', { enabled: enabled.value, feePercent: feePercent.value }, authOptions())
    if (!data.success) throw new Error(data.message)
    apply(data.data); message.success('配额交易设置已保存')
  } catch (e) { error.value = errorMessage(e); if (settings.value) apply(settings.value) }
  finally { saving.value = false }
}
function search() { username.value = searchText.value.trim(); searchVersion.value++ }
onMounted(load)
</script>

<style scoped>
.transfer-admin{display:grid;gap:20px}.hint{color:#758194;font-size:13px;margin-top:16px;line-height:1.8}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.stat{background:#f6f8fa;border-radius:10px;padding:18px;display:grid;gap:8px}.stat span{color:#64748b}.stat strong{font-size:24px;color:#253b32;overflow-wrap:anywhere}.stat small{font-weight:400;font-size:13px}.ant-form-item{margin-bottom:12px}
</style>
