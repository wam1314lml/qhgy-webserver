<template>
  <Modal :open="open" title="上传兑换码" :footer="null" :width="480" centered
    :mask-closable="!busy" :closable="!busy" :keyboard="!busy" @cancel="close">
    <div class="redeem-upload">
      <p class="redeem-intro">分享官方发布的限时兑换码，请核对渠道和内容。</p>
      <form @submit.prevent="submit">
        <Radio.Group v-model:value="channel" class="redeem-channels" button-style="solid" :disabled="busy || loading"
          aria-label="兑换码渠道">
          <Radio.Button value="wechat_douyin">微信／抖音</Radio.Button>
          <Radio.Button value="alipay">支付宝</Radio.Button>
        </Radio.Group>
        <label class="redeem-label" for="redeem-upload-code">限时兑换码</label>
        <Input id="redeem-upload-code" v-model:value="code" :disabled="busy || loading" :maxlength="256"
          placeholder="每次填写一个兑换码" autocomplete="off" allow-clear />
        <label class="redeem-label" for="redeem-upload-time">开始兑换时间（北京时间）</label>
        <Select id="redeem-upload-time" v-model:value="startHour" :options="timeOptions" show-search option-filter-prop="label" :disabled="busy || loading" style="width:100%" aria-label="开始兑换时间" />
        <p class="redeem-rules">全天：收录后即可尝试；选择几点：从收录当天该整点起尝试。失败后每小时重试，成功后停止该周期重试。重复提交不会修改原兑换时间。</p>
        <p class="redeem-rules">每位用户每30分钟可新增一个，两个渠道共用次数。同渠道兑换码不区分英文字母大小写，重复不占次数。</p>
        <p v-if="remaining > 0" class="redeem-wait" role="status">
          下次可新增：{{ waitText }}后。重复码仍可提交，不会延长等待时间。
        </p>
        <Alert v-if="pending" type="warning" show-icon message="上次提交尚未确认，已填回原兑换码，请重新提交确认。" />
        <Alert v-if="feedback" :type="feedbackType" show-icon :message="feedback" role="status" />
        <div class="redeem-actions">
          <Button :disabled="busy" @click="close">关闭</Button>
          <Button type="primary" html-type="submit" :loading="busy || loading" :disabled="busy || loading || !code.trim()">
            {{ pending ? '重试确认' : '提交兑换码' }}
          </Button>
        </div>
      </form>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Alert, Button, Input, Modal, Radio, Select } from 'ant-design-vue'
import { codeInputError, redeemUploadApi, type RedeemChannel, type RedeemStatus } from './api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const channel = ref<RedeemChannel>('wechat_douyin')
const code = ref('')
const startHour = ref(-1)
const timeOptions = [{value:-1,label:'全天'}, ...Array.from({length:24}, (_, hour) => ({value:hour,label:`${String(hour).padStart(2,'0')}:00（${hour}点起）`}))]
const busy = ref(false), loading = ref(false), pending = ref(false)
const feedback = ref(''), feedbackType = ref<'success' | 'info' | 'error'>('info')
const remaining = ref(0)
const waitText = computed(() => `${Math.floor(remaining.value / 60)}分${String(remaining.value % 60).padStart(2, '0')}秒`)
let generation = 0, timer: ReturnType<typeof setInterval> | undefined
function stopTimer() { if (timer) clearInterval(timer); timer = undefined }
function setCooldown(seconds: number) {
  stopTimer()
  const duration = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0
  const deadline = Date.now() + duration * 1000
  const tick = () => {
    remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (!remaining.value) stopTimer()
  }
  tick()
  if (duration) timer = setInterval(tick, 1000)
}
function applyStatus(status: RedeemStatus, restore = false) {
  setCooldown(status.retryAfter)
  pending.value = !!status.pending
  if (restore && status.pending) {
    channel.value = status.pending.channel
    code.value = status.pending.code
    startHour.value = status.pending.startHour ?? -1
  }
}
function fail(error: unknown) {
  const body = (error as { response?: { data?: { message?: string; retryAfter?: number } } })?.response?.data
  feedbackType.value = 'error'
  feedback.value = body?.message || (error as Error)?.message || '上传失败，请保留原兑换码稍后重试'
  if (typeof body?.retryAfter === 'number' && body.retryAfter > 0) setCooldown(body.retryAfter)
}
function close() { if (!busy.value) emit('update:open', false) }
watch([channel, code, startHour], () => { feedback.value = '' })
watch(() => props.open, async open => {
  const current = ++generation
  stopTimer()
  if (!open) return
  code.value = ''; startHour.value = -1; feedback.value = ''; pending.value = false; remaining.value = 0
  loading.value = true
  try {
    const status = await redeemUploadApi.status()
    if (current === generation) applyStatus(status, true)
  } catch (error) { if (current === generation) fail(error) }
  finally { if (current === generation) loading.value = false }
})
async function submit() {
  if (busy.value || loading.value) return
  const error = codeInputError(code.value)
  if (error) { feedbackType.value = 'error'; feedback.value = error; return }
  const current = generation
  busy.value = true; feedback.value = ''
  try {
    const result = await redeemUploadApi.submit({ channel: channel.value, code: code.value.trim(), startHour: startHour.value })
    if (current !== generation) return
    applyStatus(result)
    feedbackType.value = result.outcome === 'added' ? 'success' : 'info'
    feedback.value = result.outcome === 'added'
      ? '上传成功，已加入所选渠道的限时码。'
      : '该兑换码已收录，本次不占提交次数。'
  } catch (error) { if (current === generation) fail(error) }
  finally { if (current === generation) busy.value = false }
}
onUnmounted(() => { generation++; stopTimer() })
</script>

<style scoped>
.redeem-intro { margin: 4px 0 20px; color: #64748b; }
.redeem-channels { display: flex; width: 100%; }
.redeem-channels :deep(.ant-radio-button-wrapper) { flex: 1; text-align: center; }
.redeem-label { display: block; margin: 20px 0 8px; font-weight: 500; }
.redeem-rules { margin: 12px 0; color: #64748b; font-size: 13px; line-height: 1.7; }
.redeem-wait { color: #956318; font-size: 13px; line-height: 1.7; }
.redeem-upload :deep(.ant-alert) { margin-top: 12px; }
.redeem-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
</style>
