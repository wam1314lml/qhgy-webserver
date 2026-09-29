<template>
    <div v-if="!busy && results.length && !dismissed" class="quota-batch-receipt">
      <div class="quota-batch-receipt-icon"><ShoppingCartOutlined v-if="action === 'quota'" /><CaretRightOutlined v-else-if="action === 'start'" /><span v-else class="account-batch-stop-mark" style="background: currentColor" /></div>
      <div class="quota-batch-receipt-text">
        <strong>{{ title }}</strong>
        <span>{{ summary }}</span>
      </div>
      <Button type="link" @click="$emit('update:open', true)">查看结果</Button>
      <button type="button" class="quota-batch-receipt-close" aria-label="关闭批量结果提示" @click="dismiss">×</button>
    </div>
    <Modal
      v-if="open"
      :open="open"
      wrap-class-name="quota-progress-modal"
      :width="560"
      centered
      :footer="null"
      :closable="!running"
      :mask-closable="false"
      :keyboard="!running"
      :destroy-on-close="true"
      @cancel="close"
    >
      <template #title>
        <div class="quota-progress-heading">
          <span class="quota-progress-icon"><ShoppingCartOutlined v-if="action === 'quota'" /><CaretRightOutlined v-else-if="action === 'start'" /><span v-else class="account-batch-stop-mark" style="background: currentColor" /></span>
          <div><span class="quota-progress-kicker">{{ operationLabel }}</span><h2>{{ title }}</h2></div>
        </div>
      </template>
      <div class="quota-progress-content">
        <p class="quota-progress-plan">{{ planLabel }}</p>
        <div v-if="running" class="quota-progress-current" role="status" aria-live="polite">
          <SyncOutlined :spin="true" />
          <div>
            <span>{{ cancelled ? '正在取消剩余操作' : requestPending ? '正在提交' : action === 'quota' ? '准备下一位' : '正在检查状态' }}</span>
            <strong>{{ headline }}</strong>
          </div>
        </div>
        <div class="quota-progress-meter">
          <div class="quota-progress-meter-label">
            <span>{{ running ? '已处理' : '已汇总' }} {{ completed }} / {{ total }} 个角色</span>
            <strong>{{ percent }}<small>%</small></strong>
          </div>
          <div class="quota-progress-track" :class="{ 'is-running': running }" role="progressbar" :aria-label="operationLabel + '进度'" :aria-valuenow="completed" :aria-valuemax="total" :aria-valuemin="0">
            <div class="quota-progress-fill" :style="{ width: percent + '%' }"></div>
          </div>
        </div>
        <div v-if="running" class="quota-progress-notice">
          <LockOutlined />
          <div><strong>处理中，请保持此页面打开</strong><p>请勿刷新或关闭页面，否则剩余操作将终止。</p></div>
        </div>
        <template v-else>
          <div class="quota-progress-stats">
            <div v-for="item in stats" :key="item.status" :class="'quota-progress-stat--' + item.status">
              <strong>{{ item.count }}</strong><span>{{ item.label }}</span>
            </div>
          </div>
          <p v-if="hasUnknown" class="quota-progress-unknown">部分提交结果未确认，请先刷新核对角色配额，避免重复分配。</p>
          <div class="quota-progress-results">
            <div class="quota-progress-results-title">处理明细 <span>{{ results.length }} 个角色</span></div>
            <ul :aria-label="operationLabel + '结果'">
              <li v-for="row in results" :key="row.id">
                <span class="quota-progress-result-dot" :class="'is-' + row.status"></span>
                <div><strong>{{ row.label }}</strong><span>{{ row.reason }}</span></div>
                <span class="quota-progress-result-status" :class="'is-' + row.status">{{ resultLabels[row.status] }}</span>
              </li>
            </ul>
          </div>
        </template>
        <div class="quota-progress-footer">
          <template v-if="running">
            <p>{{ cancelled ? '正在等待当前处理结束，已完成的操作会保留。' : '可取消尚未开始的角色，已完成的操作会保留。' }}</p>
            <Button :disabled="cancelled" @click="$emit('cancel')">{{ cancelled ? '正在取消…' : '取消剩余' }}</Button>
          </template>
          <template v-else><p>本次处理已结束，可关闭此窗口。</p><Button type="primary" @click="close">完成</Button></template>
        </div>
      </div>
    </Modal>
</template>
<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { Modal, Button } from 'ant-design-vue'
import { ShoppingCartOutlined, CaretRightOutlined, SyncOutlined, LockOutlined } from '@ant-design/icons-vue'
const props = defineProps<{ open: boolean; running: boolean; busy: boolean; cancelled: boolean; dismissed: boolean; action: 'start' | 'stop' | 'quota'; completed: number; total: number; results: {id: number; label: string; status: string; reason: string}[]; summary: string; label: string; planLabel: string; requestPending: boolean }>()
const { open, running, busy, cancelled, dismissed, action, completed, total, results, summary, label, planLabel, requestPending } = toRefs(props)
const emit = defineEmits<{ 'update:open': [value: boolean]; cancel: []; dismiss: [] }>()
function close() { if (!running.value) emit('update:open', false) }
function dismiss() { if (!running.value) { close(); emit('dismiss') } }
const operationLabel = computed(() => action.value === 'quota' ? '全部配额' : action.value === 'start' ? '启动全部' : '停止全部')
const operationVerb = computed(() => action.value === 'quota' ? '分配配额' : action.value === 'start' ? '启动' : '停止')
const resultLabels: Record<string, string> = { success: '成功', skipped: '跳过', failed: '失败', cancelled: '已取消', unknown: '待核对' }
const stats = computed(() => (action.value === 'quota' ? ['success', 'failed', 'cancelled', 'unknown'] : ['success', 'skipped', 'failed', 'cancelled']).map(status => ({
  status, label: resultLabels[status], count: results.value.filter(row => row.status === status).length,
})))
const hasUnknown = computed(() => results.value.some(row => row.status === 'unknown'))
const title = computed(() => running.value ? `正在${operationVerb.value}`
  : hasUnknown.value ? '分配结果待核对'
  : results.value.some(row => row.status !== 'success') ? (action.value === 'quota' ? '本次分配已结束' : `本次${operationVerb.value}已结束`) : (action.value === 'quota' ? '配额分配完成' : `${operationVerb.value}完成`))
const percent = computed(() => total.value ? Math.min(100, Math.round(completed.value / total.value * 100)) : 0)
const headline = computed(() => cancelled.value
  ? requestPending.value ? `等待「${label.value}」处理完成` : '未开始的角色将不再处理'
  : action.value === 'quota' ? `${requestPending.value ? '正在' : '即将'}为「${label.value}」分配配额`
  : requestPending.value ? `正在${operationVerb.value}「${label.value}」` : `正在检查「${label.value}」`)
</script>
<style scoped>
.quota-progress-heading { display: flex; align-items: center; gap: 14px; padding-right: 20px; }
.quota-progress-icon, .quota-batch-receipt-icon { display: grid; place-items: center; flex-shrink: 0; color: var(--theme-primary-dark, #16a34a); background: rgba(var(--theme-primary-rgb,34,197,94),.12); }
.quota-progress-icon { width: 50px; height: 50px; border-radius: 16px; font-size: 24px; }
.quota-progress-kicker { display: block; font-size: 12px; font-weight: 500; color: #6b7a76; margin-bottom: 3px; }
.quota-progress-heading h2 { margin: 0; color: #203a35; font-size: 20px; font-weight: 650; line-height: 1.4; }
.quota-progress-content { color: #334840; }
.quota-progress-plan { margin: 0 0 18px; font-size: 13px; color: #6b7a76; }
.quota-progress-current { display: flex; align-items: center; gap: 12px; padding: 18px; border-radius: 16px; background: rgba(var(--theme-primary-rgb,34,197,94),.07); border: 1px solid rgba(var(--theme-primary-rgb,34,197,94),.14); }
.quota-progress-current > .anticon { font-size: 22px; color: var(--theme-primary-dark, #16a34a); flex-shrink: 0; }
.quota-progress-current > div { min-width: 0; }
.quota-progress-current span:not(.anticon) { display: block; color: #6b7a76; font-size: 12px; margin-bottom: 5px; }
.quota-progress-current strong { display: block; font-size: 16px; line-height: 1.6; overflow-wrap: anywhere; }
.quota-progress-meter { margin: 22px 0; }
.quota-progress-meter-label { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; font-size: 13px; color: #6b7a76; }
.quota-progress-meter-label strong { font-size: 26px; font-variant-numeric: tabular-nums; color: var(--theme-primary-dark, #16a34a); line-height: 1; }
.quota-progress-meter-label small { font-size: 13px; margin-left: 2px; }
.quota-progress-track { height: 10px; border-radius: 99px; overflow: hidden; background: rgba(var(--theme-primary-rgb,34,197,94),.1); }
.quota-progress-fill { position: relative; height: 100%; border-radius: inherit; transition: width .35s ease; background: linear-gradient(90deg, var(--theme-primary, #22c55e), var(--theme-primary-dark, #16a34a)); }
.quota-progress-track.is-running .quota-progress-fill::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, transparent, rgba(255,255,255,.45), transparent); animation: quota-progress-shine 1.8s ease-in-out infinite; }
@keyframes quota-progress-shine { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.quota-progress-notice { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,.75); border: 1px solid rgba(var(--theme-primary-rgb,34,197,94),.15); }
.quota-progress-notice > .anticon { margin-top: 3px; color: var(--theme-primary-dark, #16a34a); }
.quota-progress-notice strong { font-size: 13px; font-weight: 600; }
.quota-progress-notice p { margin: 5px 0 0; font-size: 12px; line-height: 1.7; color: #6b7a76; }
.quota-progress-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-bottom: 20px; }
.quota-progress-stats > div { display: flex; align-items: center; flex-direction: column; gap: 4px; border-radius: 14px; padding: 12px 4px; background: rgba(var(--theme-primary-rgb,34,197,94),.055); }
.quota-progress-stats strong { font-size: 24px; line-height: 1.3; font-variant-numeric: tabular-nums; }
.quota-progress-stats span { font-size: 12px; color: #6b7a76; }
.quota-progress-stat--success { color: var(--theme-primary-dark,#16a34a); }
.quota-progress-stat--failed { color: #c94b55; }
.quota-progress-stat--cancelled { color: #7a8582; }
.quota-progress-stat--unknown { color: #a66b17; }
.quota-progress-unknown { padding: 12px; border-radius: 12px; background: #fff7e6; color: #915d12; font-size: 13px; line-height: 1.6; }
.quota-progress-results-title { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.quota-progress-results-title > span { font-weight: 400; color: #88938f; font-size: 12px; }
.quota-progress-results ul { list-style: none; padding: 0; margin: 0; max-height: 220px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(var(--theme-primary-rgb,34,197,94),.28) transparent; }
.quota-progress-results li { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid rgba(30,60,45,.06); }
.quota-progress-results li:last-child { border-bottom: 0; }
.quota-progress-results li > div { flex: 1; min-width: 0; }
.quota-progress-results li strong { display: block; overflow-wrap: anywhere; font-size: 13px; font-weight: 600; }
.quota-progress-results li div > span { display: block; font-size: 12px; color: #7b8882; margin-top: 4px; line-height: 1.5; overflow-wrap: anywhere; }
.quota-progress-result-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: currentColor; }
.quota-progress-result-status { flex-shrink: 0; padding: 3px 8px; font-size: 11px; border-radius: 7px; background: rgba(255,255,255,.8); border: 1px solid currentColor; }
.quota-progress-result-dot.is-success, .quota-progress-result-status.is-success { color: var(--theme-primary-dark,#16a34a); }
.quota-progress-result-dot.is-failed, .quota-progress-result-status.is-failed { color: #c94b55; }
.quota-progress-result-dot.is-cancelled, .quota-progress-result-status.is-cancelled { color: #7a8582; }
.quota-progress-result-dot.is-unknown, .quota-progress-result-status.is-unknown { color: #a66b17; }
.quota-progress-footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(var(--theme-primary-rgb,34,197,94),.12); }
.quota-progress-footer p { flex: 1; margin: 0; font-size: 12px; color: #7b8882; line-height: 1.6; }
.quota-progress-footer .ant-btn { flex-shrink: 0; height: 38px; padding: 0 18px; border-radius: 11px; font-size: 13px; box-shadow: none; }
.quota-batch-receipt { display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 16px; border-radius: 16px; background: rgba(255,255,255,.78); border: 1px solid rgba(var(--theme-primary-rgb,34,197,94),.18); backdrop-filter: blur(16px); }
.quota-batch-receipt-icon { width: 38px; height: 38px; border-radius: 12px; font-size: 19px; }
.quota-batch-receipt-text { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; overflow-wrap: anywhere; }
.quota-batch-receipt-text strong { font-size: 13px; color: #334840; }
.quota-batch-receipt-text span { font-size: 12px; color: #7b8882; }
.quota-batch-receipt .ant-btn { flex-shrink: 0; padding: 0; font-size: 12px; color: var(--theme-primary-dark, #16a34a); }
.quota-batch-receipt-close { flex-shrink: 0; border: 0; border-radius: 8px; width: 28px; height: 28px; background: transparent; color: #7b8882; font-size: 22px; cursor: pointer; }
.quota-batch-receipt-close:hover { background: rgba(var(--theme-primary-rgb,34,197,94),.08); }
.quota-batch-receipt-close:focus-visible { outline: 2px solid var(--theme-primary,#22c55e); }
@media (max-width: 480px) {
  .quota-progress-heading h2 { font-size: 18px; }
  .quota-progress-current { padding: 14px; }
  .quota-progress-current strong { font-size: 14px; }
  .quota-progress-footer { align-items: flex-end; gap: 12px; }
  .quota-batch-receipt { gap: 8px; padding: 12px; }
  .quota-batch-receipt-icon { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .quota-progress-fill { transition: none; }
  .quota-progress-track.is-running .quota-progress-fill::after { animation: none; }
}

.quota-progress-stat--skipped, .quota-progress-result-dot.is-skipped, .quota-progress-result-status.is-skipped { color: #6375a0; }
</style>
<style>
.quota-progress-modal .ant-modal-content {
  padding: 26px; border-radius: 24px; overflow: hidden;
  background: linear-gradient(145deg, rgba(255,255,255,.97), rgba(255,255,255,.88)), var(--theme-page-bg, #f0fdf4);
  border: 1px solid rgba(255,255,255,.95); backdrop-filter: blur(24px);
  box-shadow: 0 24px 80px rgba(15, 35, 30, .22), 0 0 0 1px rgba(var(--theme-primary-rgb, 34,197,94), .1);
}
.quota-progress-modal .ant-modal-header { background: transparent; margin-bottom: 20px; }
.quota-progress-modal .ant-modal-body { max-height: calc(100dvh - 180px); overflow-y: auto; }
.quota-progress-modal .ant-modal-close { top: 16px; right: 16px; border-radius: 12px; }
@media (max-width: 480px) {
  .quota-progress-modal .ant-modal { max-width: calc(100vw - 24px); margin: 12px auto; }
  .quota-progress-modal .ant-modal-content { padding: 20px; border-radius: 20px; }
}
</style>
