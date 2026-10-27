<template>
  <div class="guild-allocation">
    <a-checkbox v-if="!pending && guild.canPrepare !== undefined && !guild.requiresGuildSync" v-model:checked="refreshGuild" :disabled="working || busy || activity.status !== 'active'" class="refresh-guild-choice">公会信息不对，重新同步后参与</a-checkbox>
    <template v-if="!pending">
      <p v-if="needsSync" class="allocation-note">先分配 1 天，扣除 {{ firstPoints }} 点；启动角色并读到最新公会后，自动补足 {{ activity.quota!.days - 1 }} 天、扣除余款 {{ remainingPoints }} 点。</p>
      <a-popconfirm :title="confirmation" ok-text="确认分配" cancel-text="取消" :disabled="!canBegin || working || busy" @confirm="begin">
        <a-button type="primary" block :disabled="!canBegin || working || busy" :loading="working">{{ needsSync ? '先分配 1 天，准备同步公会' : guild.allocationCount ? '再次分配活动配额' : '分配配额并参与' }}</a-button>
      </a-popconfirm>
    </template>
    <template v-else>
      <div class="allocation-summary"><CheckCircleOutlined /><span>首日配额已到账 · 已扣 {{ pending.paidPoints }} 点</span></div>
      <p class="allocation-note">待补 {{ pending.remainingDays }} 天，余款 {{ pending.remainingPoints }} 点。读取到最新公会后自动完成；两步合计只算一次分配。</p>
      <div v-if="phase !== 'complete'" class="allocation-actions">
        <a-button type="primary" block :loading="working" :disabled="working || busy || activity.status !== 'active'" @click="startAndSync">{{ phase === 'failed' ? '重新启动并继续同步' : '启动角色并刷新公会' }}</a-button>
        <a-button block :disabled="working || busy || activity.status !== 'active'" @click="waitForGuild">已启动，刷新公会信息</a-button>
      </div>
      <p class="allocation-note">已运行的角色会重新启动。启动失败或暂未入盟时，进度保留，重试不会重复扣首日费用。</p>
    </template>
    <div v-if="phase !== 'idle'" class="allocation-progress" role="status" aria-live="polite">
      <a-progress :percent="progress" :status="phase === 'failed' ? 'exception' : phase === 'complete' ? 'success' : working ? 'active' : 'normal'" :show-info="false" stroke-color="#be9853" />
      <strong>{{ statusText }}</strong>
      <small v-if="phase === 'syncing'">等待游戏同步中，读取完成后自动补足配额，请保持此页打开。</small>
    </div>
    <p v-if="!pending && !working" class="allocation-note">{{ guild.reason || '分配成功，即可加入本期集结' }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import { getCurrentUser } from '@/utils/userUtils'
import { activitiesApi, activityError } from './api'
import type { ActivityView, AllocationPreparation, GuildProgress } from './types'

const props = defineProps<{ activity: ActivityView; guild: GuildProgress; busy: boolean }>()
const emit = defineEmits<{ changed: []; working: [value: boolean] }>()
const refreshGuild = ref(false)
const prepared = ref<AllocationPreparation>()
const completedPreparation = ref<number>()
const pending = computed(() => {
  const value = prepared.value || props.guild.preparation
  return value?.id === completedPreparation.value ? undefined : value
})
const needsSync = computed(() => !!pending.value || props.guild.requiresGuildSync || refreshGuild.value)
const firstPoints = computed(() => props.guild.firstPoints ?? Math.ceil(props.activity.quota!.points * 100 / props.activity.quota!.days) / 100)
const remainingPoints = computed(() => Math.round((props.activity.quota!.points - firstPoints.value) * 100) / 100)
const canBegin = computed(() => props.activity.status === 'active' && (needsSync.value ? props.guild.canPrepare : props.guild.canAllocate))
const confirmation = computed(() => needsSync.value
  ? `为 ${props.guild.nickname} 先分配 1 天，扣除 ${firstPoints.value} 点，公会同步成功后自动扣余款 ${remainingPoints.value} 点并补足？`
  : `为 ${props.guild.nickname} 分配 ${props.activity.quota!.days} 天活动配额，消耗 ${props.activity.quota!.points} 点数？`)
const phase = ref<'idle' | 'preparing' | 'prepared' | 'starting' | 'syncing' | 'completing' | 'complete' | 'failed'>('idle')
const working = ref(false)
const statusText = ref('')
const progress = computed(() => ({ idle: 0, preparing: 10, prepared: 25, starting: 45, syncing: 65, completing: 90, complete: 100, failed: pending.value ? 25 : 0 })[phase.value])
let version = 0, disposed = false
let timer: ReturnType<typeof setTimeout> | undefined
let wake: (() => void) | undefined
function cancel() { version++; clearTimeout(timer); wake?.(); wake = undefined; working.value = false; emit('working', false) }
function setWorking(value: boolean) { working.value = value; emit('working', value) }
function startOperation() {
  const current = ++version, user = getCurrentUser()?.id, token = localStorage.getItem('token')
  return () => !disposed && current === version && !!token && localStorage.getItem('token') === token && getCurrentUser()?.id === user
}
function fail(error: unknown) { phase.value = 'failed'; statusText.value = activityError(error) }
function success() {
  completedPreparation.value = pending.value?.id; prepared.value = undefined
  phase.value = 'complete'; statusText.value = '配额已全部到账，公会集结参与成功'
  message.success('活动配额已分配，参与成功'); emit('changed')
}
async function begin() {
  if (working.value || props.busy || !canBegin.value) return
  const active = startOperation()
  const operation = version
  setWorking(true); phase.value = 'preparing'; statusText.value = needsSync.value ? '正在分配首日配额' : '正在分配活动配额'
  try {
    if (needsSync.value) {
      const result = await activitiesApi.prepareAllocation(props.activity.id, props.guild.accountId)
      if (!active()) return
      prepared.value = result.preparation; phase.value = 'prepared'; statusText.value = '第一步已完成，请启动角色同步公会'; emit('changed')
    } else {
      await activitiesApi.allocate(props.activity.id, props.guild.accountId)
      if (active()) success()
    }
  } catch (error) { if (active()) { fail(error); emit('changed') } }
  finally { if (!disposed && operation === version) setWorking(false) }
}
async function sync(active: () => boolean) {
  const preparation = pending.value
  if (!preparation) return
  phase.value = 'syncing'; statusText.value = '正在读取最新公会信息'
  const deadline = Date.now() + 180_000
  do {
    const result = await activitiesApi.allocationStatus(props.activity.id, props.guild.accountId, preparation.id)
    if (!active()) return
    if (result.completed) { success(); return }
    statusText.value = result.message || '等待公会信息同步'
    if (result.ready) {
      phase.value = 'completing'; statusText.value = `已读取 ${result.guild?.unionName || '公会'}，正在补足剩余配额`
      await activitiesApi.completeAllocation(props.activity.id, props.guild.accountId, preparation.id)
      if (active()) success()
      return
    }
    if (Date.now() >= deadline) throw new Error('暂未读到最新公会信息。首日配额和已付费用已保留，请检查角色登录及入盟状态后重试。')
    await new Promise<void>(resolve => { wake = resolve; timer = setTimeout(resolve, 5000) })
    wake = undefined
  } while (active())
}
async function runSync(restart: boolean) {
  if (!pending.value || working.value || props.busy || props.activity.status !== 'active') return
  const active = startOperation(), operation = version; setWorking(true)
  try {
    if (restart) {
      phase.value = 'starting'; statusText.value = '正在启动角色，已运行的角色将重新启动'
      const current = await activitiesApi.allocationStatus(props.activity.id, props.guild.accountId, pending.value!.id)
      if (!active()) return
      if (current.completed) { success(); return }
      if (current.ready) { await sync(active); return }
      await activitiesApi.startAllocationAccount(props.guild.accountId, active)
      if (!active()) return
    }
    await sync(active)
  } catch (error) { if (active()) { fail(error); emit('changed') } }
  finally { if (!disposed && operation === version) setWorking(false) }
}
function startAndSync() { return runSync(true) }
function waitForGuild() { return runSync(false) }
function storage(event: StorageEvent) { if (!event.key || event.key === 'user' || event.key === 'token') cancel() }
window.addEventListener('logout', cancel)
window.addEventListener('storage', storage)
onUnmounted(() => { disposed = true; cancel(); window.removeEventListener('logout', cancel); window.removeEventListener('storage', storage) })
</script>

<style scoped>
.guild-allocation { margin-top: 14px; }
.refresh-guild-choice { font-size: 12px; margin-bottom: 12px; color: #536963; }
.allocation-note { font-size: 12px; line-height: 1.7; color: #72857e; margin: 10px 0; }
.allocation-summary { display: flex; gap: 8px; align-items: baseline; color: #236e61; font-size: 13px; }
.allocation-actions { display: grid; gap: 8px; }
.allocation-progress { background: #f3f6ef; border-radius: 10px; padding: 10px 12px; margin-top: 12px; }
.allocation-progress strong, .allocation-progress small { display: block; font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; color: #435a51; }
.allocation-progress small { color: #7b8c82; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .allocation-progress :deep(.ant-progress-bg::before) { animation: none; } }
</style>
