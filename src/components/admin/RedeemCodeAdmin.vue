<template>
  <div class="redeem-admin">
    <a-alert type="info" show-icon message="兑换码贡献奖励" description="同渠道兑换码不区分英文字母大小写，合并展示并归属最早收录者。游戏确认兑换成功后可手动奖励，每码只奖励一次；管理员上传与历史未知来源不参与奖励。" />
    <a-space wrap>
      <a-select v-model:value="channel" style="width:160px" :options="[{value:'wechat_douyin',label:'微信／抖音'},{value:'alipay',label:'支付宝'}]" />
      <a-input v-model:value="code" placeholder="精确查询兑换码（留空显示全部）" style="width:280px;max-width:100%" @pressEnter="search" />
      <a-button :loading="loading" @click="search">查询 / 刷新</a-button>
      <a-button type="primary" :disabled="saving" @click="chooseBatch">批量发放奖励</a-button>
    </a-space>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <a-alert v-if="retryResult" class="retry-result" type="info" show-icon message="指定码失败清理结果"
      :description="`${retryResult.code}（${channelLabel(retryResult.channel)}）：本次符合条件 ${retryResult.eligible} 条，已放行重试 ${retryResult.cleared} 条，跳过 ${retryResult.skipped} 条，尝试标记不存在 ${retryResult.missing} 条。运行中的脚本将在下一轮检查时尝试，默认每30秒检查；离线或忙碌账号需等待恢复。`" />
    <a-alert v-if="batchResult" class="batch-result" :type="batchResult.failed || batchResult.mirrorPending ? 'warning' : 'success'" show-icon
      message="批量处理结果"
      :description="`确认新增 ${batchResult.issued} 条，共 ${batchResult.pointsIssued} 点；跳过已发奖 ${batchResult.alreadyRewarded} 条、不符合条件 ${batchResult.ineligible} 条；失败或待核对 ${batchResult.failed} 条。${batchResult.mirrorPending ? `其中 ${batchResult.mirrorPending} 条奖励已到账，更新器展示待同步。` : ''}`" />
    <a-collapse v-if="batchResult?.failures.length">
      <a-collapse-panel key="failures" :header="`查看 ${batchResult.failed} 条失败或待核对记录`">
        <p class="hint">可刷新后再次批量发放，已到账的码会自动跳过。结果未确认不代表未到账，以奖励记录为准。</p>
        <a-table :data-source="batchResult.failures" :columns="batchFailureColumns" row-key="id" size="small"
          :pagination="{pageSize:10,showSizeChanger:false}" :scroll="{x:520}" />
      </a-collapse-panel>
    </a-collapse>
    <a-table :data-source="rows" :columns="columns" row-key="id" :loading="loading" :scroll="{x:1100}"
      :pagination="{current:page,pageSize:20,total,showSizeChanger:false}" @change="changePage">
      <template #bodyCell="{column,record}">
        <template v-if="column.key === 'source'">{{ record.source === 'website' ? `网站用户 #${record.userId}` : record.source === 'admin' ? '管理员上传' : '历史来源未知' }}</template>
        <template v-else-if="column.key === 'channel'">{{ channelLabel(record.channel) }}</template>
        <template v-else-if="column.key === 'success'"><a-tag :color="record.redeemSuccess === '1' ? 'green' : 'default'">{{ successLabel(record) }}</a-tag><small v-if="record.successCount">成功 {{ record.successCount }} 次</small></template>
        <template v-else-if="column.key === 'gameReward'">{{ record.gameRewardSeen === '1' ? '已见奖励明细' : '未见奖励明细' }}</template>
        <template v-else-if="column.key === 'reward'"><a-tag :color="record.reward ? 'green' : 'default'">{{ record.reward ? `已发 ${record.reward.amount} 点` : '未发放' }}</a-tag></template>
        <template v-else-if="column.key === 'time'">{{ date(record.uploadedAt || record.lastAttemptAt) }}</template>
        <template v-else-if="column.key === 'schedule'">{{ record.startAt > 0 ? `${beijingDate(record.startAt)} 起` : '全天' }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-space wrap><a-button size="small" @click="details(record)">记录</a-button>
            <a-button v-if="['wechat_douyin','alipay'].includes(record.channel)" size="small" :disabled="retrySaving" @click="chooseRetry(record)">清理失败</a-button>
            <a-button size="small" type="primary" :disabled="record.source !== 'website' || record.redeemSuccess !== '1' || !!record.reward" @click="choose(record)">发放配额</a-button></a-space>
        </template>
      </template>
    </a-table>
    <a-modal v-model:open="retryOpen" title="清理指定兑换码的失败尝试" ok-text="清理失败，允许重试" :confirm-loading="retrySaving"
      :closable="!retrySaving" :mask-closable="false" :keyboard="!retrySaving" :cancel-button-props="{disabled:retrySaving}" @ok="retryFailed">
      <p class="code">兑换码：{{ retrySelected?.code }} · {{ channelLabel(retrySelected?.channel) }}</p>
      <p>仅清理这个渠道、这个码今天明确兑换失败账号的尝试标记，大小写视为同一码。成功账号、结果未确认的账号、其他兑换码和奖励流水保留。</p>
      <p class="hint">新版脚本会在下个整点后自动重试明确失败的码，也可手动提前放行。清理后用户无需重启脚本，下一轮检查即可重试，默认每30秒检查；仍遵守该码的开始兑换时间，历史失败记录保留。</p>
      <a-alert v-if="retryError" type="error" show-icon :message="retryError" />
    </a-modal>
    <a-modal v-model:open="rewardOpen" :title="batchMode ? '批量发放兑换码贡献奖励' : '发放兑换码贡献奖励'" :confirm-loading="saving" :closable="!saving" :mask-closable="false" :cancel-button-props="{disabled:saving}" @ok="grant">
      <a-alert v-if="batchMode" type="info" show-icon message="发放给全部符合条件的兑换码"
        description="覆盖微信／抖音和支付宝全部分页，不受当前查询条件限制。仅奖励网站用户上传、已确认兑换成功且尚未发奖的码；同一用户有多个符合条件的码，按码累计奖励。" />
      <template v-else><p>上传者：网站用户 #{{ selected?.userId }}</p><p class="code">兑换码：{{ selected?.code }}</p></template>
      <a-form layout="vertical">
        <a-form-item :label="batchMode ? '每个兑换码奖励点数' : '奖励配额点数'"><a-input-number v-model:value="amount" :min="1" :max="99999999" :precision="0" :disabled="saving" style="width:100%" /></a-form-item>
        <a-form-item label="发放原因"><a-textarea v-model:value="reason" :maxlength="200" :disabled="saving" /></a-form-item>
      </a-form>
      <a-alert v-if="rewardError" type="error" show-icon :message="rewardError" />
      <p v-if="batchMode" class="hint">确认后开始批量发放，请等待处理结果。个别失败不影响其他码；网络中断后可刷新并再次批量发放，已到账奖励自动跳过。</p>
      <p v-else class="hint">确认后计入用户配额余额，并永久记录 SQL 流水。网络中断可重试同一码核对，不会重复发奖。</p>
    </a-modal>
    <a-drawer v-model:open="detailOpen" title="兑换与奖励记录" width="min(720px, 100vw)">
      <p class="code">{{ selected?.code }} · {{ channelLabel(selected?.channel) }}</p>
      <p>上传者：{{ selected?.source === 'website' ? `网站用户 #${selected.userId}` : selected?.source === 'admin' ? '管理员上传' : '历史来源未知' }}</p>
      <a-alert v-if="selected?.reward" type="success" show-icon :message="`配额奖励已发放：${selected.reward.amount} 点`"
        :description="`实际受奖 userid：${selected.reward.uploader_user_id}；管理员 ${selected.reward.admin_username}（#${selected.reward.admin_id}）；${date(selected.reward.created_at)}；流水 #${selected.reward.transaction_id}；原因：${selected.reward.reason}`" />
      <a-alert v-else message="尚无配额奖励 SQL 流水" type="info" />
      <a-alert v-if="detailError" :message="detailError" type="error" />
      <a-table :data-source="attempts" :columns="attemptColumns" :loading="detailLoading" :pagination="{current:attemptPage,pageSize:20,total:attemptTotal,showSizeChanger:false}" @change="changeAttemptPage" :scroll="{x:520}" :row-key="(r:any)=>JSON.stringify([r.accountHash,r.field,r.stamp,r.code])">
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
interface BatchRewardResult {
  total: number; issued: number; alreadyRewarded: number; ineligible: number; failed: number; mirrorPending: number; pointsIssued: number
  failures: { id: string; code: string; userId: string; message: string }[]
}
const batchMode = ref(false), batchResult = ref<BatchRewardResult|null>(null)
interface RetryResult { requestId:string; code:string; channel:string; day:string; eligible:number; cleared:number; skipped:number; missing:number }
const retryOpen = ref(false), retrySaving = ref(false), retrySelected = ref<any>(null), retryError = ref(''), retryResult = ref<RetryResult|null>(null)
let retryRequestId = ''
const batchFailureColumns = [{title:'兑换码',dataIndex:'code'},{title:'上传者 userid',dataIndex:'userId'},{title:'原因',dataIndex:'message'}]
const detailOpen = ref(false), detailLoading = ref(false), detailError = ref(''), attempts = ref<any[]>([]), attemptPage = ref(1), attemptTotal = ref(0)
let listGeneration = 0, detailGeneration = 0
const columns = [{title:'上传者 userid',key:'source',width:150},{title:'兑换码',dataIndex:'code',width:210},{title:'渠道',key:'channel',width:110},
  {title:'开始兑换时间（北京时间）',key:'schedule',width:195},{title:'是否兑换成功',key:'success',width:145},{title:'游戏奖励回包',key:'gameReward',width:130},{title:'配额奖励（SQL）',key:'reward',width:140},{title:'收录时间',key:'time',width:180},{title:'操作',key:'actions',width:270}]
const attemptColumns = [{title:'实际渠道',key:'field'},{title:'兑换周期',dataIndex:'stamp'},{title:'结果',key:'status'},{title:'游戏奖励',key:'gameReward'},{title:'时间',key:'at'}]
const channelLabel = (v:string) => ({wechat_douyin:'微信／抖音',alipay:'支付宝',permanent:'永久',weekly:'周码'} as Record<string,string>)[v] || v
const successLabel = (r:any) => r.redeemSuccess === '1' ? '已确认成功' : r.lastStatus === 'failed' ? '尚未成功' : r.lastStatus === 'unknown' ? '结果未确认' : '等待兑换'
const date = (v:any) => { if (!v) return '—'; const d = new Date(/^\d+$/.test(String(v)) ? Number(v) : v); return Number.isFinite(d.getTime()) ? d.toLocaleString('zh-CN') : '—' }
const beijingDate = (v:any) => { const d = new Date(Number(v)); return Number.isFinite(d.getTime()) ? d.toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false}) : '—' }
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
function choose(row:any) { batchMode.value = false; selected.value = row; amount.value = null; rewardError.value = ''; rewardOpen.value = true }
function chooseBatch() { batchMode.value = true; batchResult.value = null; amount.value = null; rewardError.value = ''; rewardOpen.value = true }
function chooseRetry(row:any) {
  retrySelected.value = row; retryError.value = ''; retryResult.value = null
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  retryRequestId = [...bytes].map(value => value.toString(16).padStart(2,'0')).join('').replace(/^(........)(....)(....)(....)(............)$/, '$1-$2-$3-$4-$5')
  retryOpen.value = true
}
async function retryFailed() {
  if (retrySaving.value) return
  retrySaving.value = true; retryError.value = ''
  try {
    const {data} = await axios.post(`/api/admin/redeem-codes/${retrySelected.value.id}/retry-failed`, {requestId:retryRequestId}, {...options(),timeout:180000})
    const result = data.data
    if (!data.success || !result || result.requestId !== retryRequestId || result.code !== retrySelected.value.code || result.channel !== retrySelected.value.channel
      || !['eligible','cleared','skipped','missing'].every(key => Number.isSafeInteger(result[key]) && result[key] >= 0)
      || result.eligible !== result.cleared + result.skipped + result.missing) throw Error('清理结果未确认，请在当前窗口重试核对')
    retryResult.value = result; retryOpen.value = false
    await load()
  } catch(e) { retryError.value = err(e) }
  finally { retrySaving.value = false }
}
function validBatchResult(value:any): value is BatchRewardResult {
  const counts = ['total','issued','alreadyRewarded','ineligible','failed','mirrorPending','pointsIssued']
  return value && counts.every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)
    && value.total === value.issued + value.alreadyRewarded + value.ineligible + value.failed
    && value.pointsIssued === value.issued * Number(amount.value)
    && value.mirrorPending <= value.issued + value.alreadyRewarded
    && Array.isArray(value.failures) && value.failures.length === value.failed
    && value.failures.every((row:any) => row && ['id','code','userId','message'].every(key => typeof row[key] === 'string'))
}
async function grant() {
  if (saving.value) return
  if (!Number.isSafeInteger(amount.value) || Number(amount.value) < 1 || !reason.value.trim()) { rewardError.value = '请填写正整数配额点数和发放原因'; return }
  saving.value = true; rewardError.value = ''
  try {
    if (batchMode.value) {
      const {data} = await axios.post('/api/admin/redeem-codes/batch-reward', {amount:amount.value,reason:reason.value.trim()}, {...options(),timeout:180000})
      if (!data.success || !validBatchResult(data.data)) throw Error('批量发放结果未确认，请刷新记录后重试；已到账奖励不会重复发放')
      batchResult.value = data.data
      rewardOpen.value = false
      await load()
      return
    }
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
