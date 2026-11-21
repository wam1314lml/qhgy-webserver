<template>
  <div class="redeem-admin">
    <a-alert type="info" show-icon message="兑换码贡献奖励" description="只向上传该码的网站用户发放配额点数。游戏确认兑换成功后可手动奖励，每个渠道的同一码只奖励一次；管理员上传与历史未知来源不参与奖励。" />
    <a-space wrap>
      <a-select v-model:value="channel" style="width:160px" :options="[{value:'wechat_douyin',label:'微信／抖音'},{value:'alipay',label:'支付宝'}]" />
      <a-input v-model:value="code" placeholder="精确查询兑换码（留空显示全部）" style="width:280px;max-width:100%" @pressEnter="search" />
      <a-button :loading="loading" @click="search">查询 / 刷新</a-button>
    </a-space>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <a-table :data-source="rows" :columns="columns" row-key="id" :loading="loading" :scroll="{x:1100}"
      :pagination="{current:page,pageSize:20,total,showSizeChanger:false}" @change="changePage">
      <template #bodyCell="{column,record}">
        <template v-if="column.key === 'source'">{{ record.source === 'website' ? `网站用户 #${record.userId}` : record.source === 'admin' ? '管理员上传' : '历史来源未知' }}</template>
        <template v-else-if="column.key === 'channel'">{{ channelLabel(record.channel) }}</template>
        <template v-else-if="column.key === 'success'"><a-tag :color="record.redeemSuccess === '1' ? 'green' : 'default'">{{ successLabel(record) }}</a-tag><small v-if="record.successCount">成功 {{ record.successCount }} 次</small></template>
        <template v-else-if="column.key === 'gameReward'">{{ record.gameRewardSeen === '1' ? '已见奖励明细' : '未见奖励明细' }}</template>
        <template v-else-if="column.key === 'reward'"><a-tag :color="record.reward ? 'green' : 'default'">{{ record.reward ? `已发 ${record.reward.amount} 点` : '未发放' }}</a-tag></template>
        <template v-else-if="column.key === 'time'">{{ date(record.uploadedAt || record.lastAttemptAt) }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-space><a-button size="small" @click="details(record)">记录</a-button>
            <a-button size="small" type="primary" :disabled="record.source !== 'website' || record.redeemSuccess !== '1' || !!record.reward" @click="choose(record)">发放配额</a-button></a-space>
        </template>
      </template>
    </a-table>
    <a-modal v-model:open="rewardOpen" title="发放兑换码贡献奖励" :confirm-loading="saving" :closable="!saving" :mask-closable="false" :cancel-button-props="{disabled:saving}" @ok="grant">
      <p>上传者：网站用户 #{{ selected?.userId }}</p><p class="code">兑换码：{{ selected?.code }}</p>
      <a-form layout="vertical">
        <a-form-item label="奖励配额点数"><a-input-number v-model:value="amount" :min="1" :max="99999999" :precision="0" :disabled="saving" style="width:100%" /></a-form-item>
        <a-form-item label="发放原因"><a-textarea v-model:value="reason" :maxlength="200" :disabled="saving" /></a-form-item>
      </a-form>
      <a-alert v-if="rewardError" type="error" show-icon :message="rewardError" />
      <p class="hint">确认后计入用户配额余额，并永久记录 SQL 流水。网络中断可重试同一码核对，不会重复发奖。</p>
    </a-modal>
    <a-drawer v-model:open="detailOpen" title="兑换与奖励记录" width="min(720px, 100vw)">
      <p class="code">{{ selected?.code }} · {{ channelLabel(selected?.channel) }}</p>
      <p>上传者：{{ selected?.source === 'website' ? `网站用户 #${selected.userId}` : selected?.source === 'admin' ? '管理员上传' : '历史来源未知' }}</p>
      <a-alert v-if="selected?.reward" type="success" show-icon :message="`配额奖励已发放：${selected.reward.amount} 点`"
        :description="`管理员 ${selected.reward.admin_username}（#${selected.reward.admin_id}）；${date(selected.reward.created_at)}；流水 #${selected.reward.transaction_id}；原因：${selected.reward.reason}`" />
      <a-alert v-else message="尚无配额奖励 SQL 流水" type="info" />
      <a-alert v-if="detailError" :message="detailError" type="error" />
      <a-table :data-source="attempts" :columns="attemptColumns" :loading="detailLoading" :pagination="{current:attemptPage,pageSize:20,total:attemptTotal,showSizeChanger:false}" @change="changeAttemptPage" :scroll="{x:520}" :row-key="(r:any)=>`${r.accountHash}:${r.field}:${r.stamp}`">
        <template #bodyCell="{column,record}">
          <template v-if="column.key === 'field'">{{ ({official:'微信',douyin:'抖音',alipay:'支付宝',permanent:'永久码',weekly:'周码'} as Record<string,string>)[record.field] || record.field }}</template>
          <template v-else-if="column.key === 'status'">{{ ({success:'兑换成功',failed:'兑换失败',unknown:'结果未确认'} as Record<string,string>)[record.status] }}</template>
          <template v-else-if="column.key === 'at'">{{ date(record.at) }}</template>
          <template v-else-if="column.key === 'gameReward'">{{ record.gameRewardSeen ? '已见奖励明细' : '未见明细' }}</template>
        </template>
      </a-table>
      <p class="hint">旧“已尝试”记录不作为成功凭据。未见游戏奖励明细不代表未发游戏奖励；配额奖励以 SQL 流水为准。</p>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import axios from '../../utils/axios'
const props = defineProps<{token:string}>()
const options = () => ({headers:{Authorization:`Bearer ${props.token}`},handleErrorLocally:true})
const rows = ref<any[]>([]), total = ref(0), page = ref(1), loading = ref(false), error = ref('')
const channel = ref('wechat_douyin'), code = ref(''), filter = ref({channel:'wechat_douyin',code:''})
const selected = ref<any>(null), rewardOpen = ref(false), saving = ref(false), amount = ref<number|null>(null), reason = ref('兑换码贡献奖励'), rewardError = ref('')
const detailOpen = ref(false), detailLoading = ref(false), detailError = ref(''), attempts = ref<any[]>([]), attemptPage = ref(1), attemptTotal = ref(0)
let listGeneration = 0, detailGeneration = 0
const columns = [{title:'上传者 userid',key:'source',width:150},{title:'兑换码',dataIndex:'code',width:210},{title:'渠道',key:'channel',width:110},
  {title:'是否兑换成功',key:'success',width:145},{title:'游戏奖励回包',key:'gameReward',width:130},{title:'配额奖励（SQL）',key:'reward',width:140},{title:'收录时间',key:'time',width:180},{title:'操作',key:'actions',width:180}]
const attemptColumns = [{title:'实际渠道',key:'field'},{title:'兑换周期',dataIndex:'stamp'},{title:'结果',key:'status'},{title:'游戏奖励',key:'gameReward'},{title:'时间',key:'at'}]
const channelLabel = (v:string) => ({wechat_douyin:'微信／抖音',alipay:'支付宝',permanent:'永久',weekly:'周码'} as Record<string,string>)[v] || v
const successLabel = (r:any) => r.redeemSuccess === '1' ? '已确认成功' : r.lastStatus === 'failed' ? '尚未成功' : r.lastStatus === 'unknown' ? '结果未确认' : '等待兑换'
const date = (v:any) => { if (!v) return '—'; const d = new Date(/^\d+$/.test(String(v)) ? Number(v) : v); return Number.isFinite(d.getTime()) ? d.toLocaleString('zh-CN') : '—' }
const err = (e:any) => e.response?.data?.message || e.message || '请求失败，请稍后重试'
async function load() {
  const generation = ++listGeneration; loading.value = true; error.value = ''
  try {
    const {data} = await axios.get('/api/admin/redeem-codes', {...options(),params:{page:page.value,limit:20,...filter.value}})
    if (!data.success || !Array.isArray(data.data?.records)) throw Error('记录回执不完整')
    if (generation === listGeneration) { rows.value = data.data.records; total.value = data.data.total }
  } catch(e) { if (generation === listGeneration) error.value = err(e) }
  finally { if (generation === listGeneration) loading.value = false }
}
function search() { filter.value = {channel:channel.value,code:code.value.trim()}; page.value = 1; void load() }
function changePage(p:any) { page.value = p.current; void load() }
function choose(row:any) { selected.value = row; amount.value = null; rewardError.value = ''; rewardOpen.value = true }
async function grant() {
  if (saving.value) return
  if (!Number.isSafeInteger(amount.value) || Number(amount.value) < 1 || !reason.value.trim()) { rewardError.value = '请填写正整数配额点数和发放原因'; return }
  saving.value = true; rewardError.value = ''
  try {
    const {data} = await axios.post(`/api/admin/redeem-codes/${selected.value.id}/reward`, {amount:amount.value,reason:reason.value.trim()}, options())
    if (!data.success || !data.data?.reward?.transaction_id) throw Error('发放结果未确认，请刷新记录或重试同一码核对')
    rewardOpen.value = false
    message.success(data.data.replayed ? '该码已奖励，已核对原SQL流水' : '配额已发放，SQL流水已保存')
    if (!data.data.mirrorSynced) message.warning('更新器展示待同步，后台SQL奖励记录已生效')
    await load()
  } catch(e) { rewardError.value = err(e) }
  finally { saving.value = false }
}
function details(row:any) { selected.value = row; detailOpen.value = true; attemptPage.value = 1; attempts.value = []; void loadAttempts() }
function changeAttemptPage(p:any) { attemptPage.value = p.current; void loadAttempts() }
async function loadAttempts() {
  const generation = ++detailGeneration; detailLoading.value = true; detailError.value = ''
  try {
    const {data} = await axios.get(`/api/admin/redeem-codes/${selected.value.id}/attempts`, {...options(),params:{page:attemptPage.value,limit:20}})
    if (!data.success || !Array.isArray(data.data?.records)) throw Error('兑换记录回执不完整')
    if (generation === detailGeneration) { attempts.value = data.data.records; attemptTotal.value = data.data.total }
  } catch(e) { if (generation === detailGeneration) detailError.value = err(e) }
  finally { if (generation === detailGeneration) detailLoading.value = false }
}
onMounted(load)
</script>
<style scoped>
.redeem-admin{display:grid;gap:16px;min-width:0}.hint{color:#64748b;font-size:13px;line-height:1.8;margin-top:16px}.code{overflow-wrap:anywhere}small{display:block;color:#64748b}.redeem-admin :deep(td){overflow-wrap:anywhere}
</style>
