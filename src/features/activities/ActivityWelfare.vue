<template>
  <section class="activity-welfare" :class="`activity-${type}`" :aria-label="type === 'guild_rally' ? '公会集结活动' : '签到活动'">
    <div class="activity-toolbar">
      <div class="activity-intro"><span class="section-icon"><TeamOutlined v-if="type === 'guild_rally'" /><CalendarOutlined v-else /></span><div><h2>{{ type === 'guild_rally' ? '同盟聚首，共享好礼' : '每日相见，好礼相伴' }}</h2><p>{{ type === 'guild_rally' ? '分配活动配额，与公会伙伴一起解锁集结奖励。' : '每天签到领取一份心意，累计签到还有更多奖励。' }}</p></div></div>
      <a-button class="refresh-button" :loading="loading" @click="load(true)"><template #icon><ReloadOutlined /></template>刷新</a-button>
    </div>
    <a-alert v-if="error" :message="error" type="error" show-icon class="activity-alert" />
    <a-spin :spinning="loading && activities.length === 0">
      <div v-if="!loading && !visibleActivities.length && !error" class="activity-empty"><CalendarOutlined v-if="type === 'sign_in'" /><TeamOutlined v-else /><h3>{{ type === 'sign_in' ? '新的签到礼，敬请期待' : '下一场集结，期待与你相见' }}</h3><p>{{ type === 'sign_in' ? '当前没有进行中的签到活动，已领取的奖励仍可在下方查看。' : '活动发布后将在这里展示，过往奖励记录会为你保留。' }}</p></div>
      <article v-for="activity in visibleActivities" :key="activity.id" class="activity-card">
        <ActivityArtwork :type="activity.type" :background-url="activity.backgroundUrl" />
        <header class="activity-heading">
          <div class="activity-title-group"><span class="activity-seal"><TeamOutlined v-if="activity.type === 'guild_rally'" /><CalendarOutlined v-else /></span><div><span class="activity-id">{{ activity.type === 'guild_rally' ? '公会集结' : '签到活动' }} · 第 {{ activity.id }} 期</span><h3>{{ activity.title }}</h3></div></div>
          <span class="status-pill" :class="`status-${activity.status}`"><i aria-hidden="true"></i>{{ statusLabels[activity.status] }}</span>
        </header>
        <p v-if="activity.description" class="activity-description">{{ activity.description }}</p>
        <div class="activity-period"><ClockCircleOutlined /><span>{{ formatActivityTime(activity.startAt) }} — {{ formatActivityTime(activity.endAt) }}<small>北京时间 · 活动 ID：{{ activity.id }}</small></span></div>
        <div class="activity-content">
          <template v-if="activity.type === 'guild_rally'">
            <div class="role-selection"><label class="field-label" :for="`guild-account-${activity.id}`">参与角色</label><a-select :id="`guild-account-${activity.id}`" :value="guildFor(activity)?.accountId" :options="guildOptions(activity)" :disabled="!!busy" placeholder="请选择要参与的角色" class="activity-select" @change="(value: number) => selectedGuild[activity.id] = value" /></div>
            <div v-if="guildFor(activity)" class="rally-layout">
              <div class="guild-progress">
                <div class="guild-caption"><span>本期集结进度</span><TeamOutlined /></div>
                <h4>{{ guildFor(activity)!.unionName || '尚未同步公会名称' }}</h4>
                <div class="guild-count"><strong>{{ guildFor(activity)!.participants }}</strong><span>人已参与</span></div>
                <div class="guild-track" role="progressbar" aria-label="公会集结进度" :aria-valuenow="Math.min(guildFor(activity)!.participants, guildMaximum(activity))" :aria-valuemin="0" :aria-valuemax="guildMaximum(activity)" :aria-valuetext="`已集结 ${guildFor(activity)!.participants} 人，最高奖励需 ${guildMaximum(activity)} 人`"><span :style="{ width: `${guildPercent(activity)}%` }"></span></div>
                <div class="guild-milestones"><span v-for="reward in guildRewards(activity)" :key="reward.id" class="guild-milestone" :class="{ reached: guildFor(activity)!.participants >= reward.threshold }" :style="{ left: `${reward.threshold / guildMaximum(activity) * 100}%` }" :title="`${reward.threshold} 人：${guildFor(activity)!.participants >= reward.threshold ? '已达成' : '未达成'}`"><i aria-hidden="true"></i><span class="guild-milestone-label" :style="{ transform: `translateX(-${reward.threshold / guildMaximum(activity) * 100}%)` }"><CheckCircleOutlined v-if="guildFor(activity)!.participants >= reward.threshold" /><GiftOutlined v-else />{{ reward.threshold }} 人</span></span></div>
                <p class="guild-next">{{ nextGuildHint(activity) }}</p>
                <p class="guild-note">同一角色只计 1 人，按首次参与的公会统计。</p>
              </div>
              <div v-if="activity.quota" class="activity-quota">
                <span class="quota-caption">本期专属配额</span><div class="quota-duration"><strong>{{ activity.quota.days }}</strong><span>天</span></div>
                <dl class="quota-details"><div><dt>每次消耗</dt><dd>{{ activity.quota.points }} 点数</dd></div><div><dt>本角色已分配</dt><dd>{{ guildFor(activity)!.allocationCount }} / {{ activity.quota.maxPerRole }} 次</dd></div></dl>
                <GuildAllocation :key="`${activity.id}-${guildFor(activity)!.accountId}`" :activity="activity" :guild="guildFor(activity)!" :busy="!!busy" @working="value => busy = value ? `allocate-${activity.id}` : ''" @changed="afterMutation" />
              </div>
            </div>
            <a-alert v-else message="请先在首页绑定角色，并等待游戏公会信息同步后参与。" type="info" show-icon class="activity-alert" />
          </template>
          <SignInCalendar v-else :activity="activity" :busy="busy" @sign-in="signIn(activity)" @claim="(reward, state) => openClaim(activity, reward, state)" />

          <template v-if="activity.type === 'guild_rally'">
          <div class="rewards-heading"><h4><GiftOutlined />活动奖励</h4><span>每档任选一项，分别领取</span></div>
          <div class="reward-list">
            <div v-for="row in rewardRows(activity)" :key="row.key" class="reward-row" :class="{ 'reward-ready': row.state.eligible && !row.state.claimed, 'reward-claimed': row.state.claimed }">
              <div class="reward-topline"><span><GiftOutlined />{{ row.reward.kind === 'daily' ? '每日签到礼' : row.reward.kind === 'guild' ? '公会集结礼' : '累计签到礼' }}</span><span class="reward-state">{{ row.state.claimed ? '已领取' : row.state.eligible ? '可领取' : '待解锁' }}</span></div>
              <div class="reward-copy"><strong>{{ row.reward.label }}</strong><p>{{ rewardRequirement(row.reward, row.state) }}</p></div>
              <div class="reward-options-text"><span v-for="option in row.reward.options" :key="option.id"><RewardIcon :type="option.type" />{{ rewardText(option.type, option.value) }}</span></div>
              <a-button block :type="row.state.eligible && !row.state.claimed ? 'primary' : 'default'" :disabled="!row.state.eligible || row.state.claimed || activity.status !== 'active' || !!busy" @click="openClaim(activity, row.reward, row.state)">{{ row.state.claimed ? '已领取' : row.state.eligible ? '选择奖励' : '未达成' }}<CheckOutlined v-if="row.state.claimed" /></a-button>
            </div>
          </div>
          </template>
        </div>
      </article>
    </a-spin>

    <section class="activity-history">
      <div class="history-heading"><div><h3><HistoryOutlined />我的活动奖励</h3><p>每一份收获，都为你留存。</p></div><a-button type="text" :loading="historyLoading" @click="loadHistory(1)"><template #icon><ReloadOutlined /></template>刷新记录</a-button></div>
      <a-alert v-if="historyError" :message="historyError" type="warning" show-icon />
      <a-empty v-else-if="!historyLoading && !claims.length" :image="Empty.PRESENTED_IMAGE_SIMPLE" description="领取第一份奖励，点亮你的收获记录" />
      <a-spin :spinning="historyLoading"><div class="claim-record-list"><div v-for="claim in claims" :key="claim.id" class="claim-record"><span class="claim-icon"><RewardIcon :type="claim.type" /></span><div class="claim-detail"><strong>{{ claim.title }} · {{ claim.rewardLabel }}</strong><p>{{ rewardText(claim.type, claim.value) }}<span v-if="claim.targetNickname">，已到账角色：{{ claim.targetNickname }}</span></p><div v-if="claim.cardCode" class="claim-code"><code>{{ claim.cardCode }}</code><a-button size="small" @click="copyCode(claim.cardCode)">复制卡密</a-button></div><time>{{ formatActivityTime(claim.createdAt) }}</time></div></div></div></a-spin>
      <a-pagination v-if="claimTotal > 20" :current="historyPage" :total="claimTotal" :page-size="20" :show-size-changer="false" size="small" @change="loadHistory" />
    </section>

    <a-modal v-model:open="claimOpen" title="选择本档奖励" :confirm-loading="!!busy" :mask-closable="!busy" :closable="!busy" :cancel-button-props="{ disabled: !!busy }" ok-text="确认领取" cancel-text="取消" @ok="claimReward">
      <template v-if="claimSelection"><p>{{ claimSelection.activity.title }} · {{ claimSelection.reward.label }}</p><a-radio-group v-model:value="selectedOptionId" class="claim-option-group"><a-radio v-for="option in claimSelection.reward.options" :key="option.id" :value="option.id" :disabled="!!busy"><RewardIcon :type="option.type" /> {{ rewardText(option.type, option.value) }}</a-radio></a-radio-group><p class="muted">本档只能领取一次，确认后不能更换奖励。</p>
        <template v-if="selectedOption?.type === 'time'"><label for="activity-target-account" class="field-label">增加时长的角色</label><a-select id="activity-target-account" v-model:value="targetAccountId" class="activity-select" placeholder="选择名下角色（已过期也可）" :disabled="!!busy" :options="accountOptions" /><p v-if="!accounts.length" class="muted">领取时长时请先绑定角色，或选择点数、卡密奖励。</p></template>
        <a-alert v-else-if="selectedOption?.type === 'card'" message="领取后生成一张点数福利卡，不限制兑换人。卡密可在下方奖励记录查看、复制。" type="info" show-icon />
        <a-alert v-else-if="selectedOption?.type === 'points'" message="点数将直接加入当前网站账号余额。" type="info" show-icon />
      </template>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Empty, message } from 'ant-design-vue'
import { CalendarOutlined, CheckCircleOutlined, CheckOutlined, ClockCircleOutlined, GiftOutlined, HistoryOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons-vue'
import SignInCalendar from './SignInCalendar.vue'
import ActivityArtwork from './ActivityArtwork.vue'
import RewardIcon from './RewardIcon.vue'
import GuildAllocation from './GuildAllocation.vue'
import { getCurrentUser, updateUserBalance } from '@/utils/userUtils'
import { activitiesApi, activityError, formatActivityTime, rewardText } from './api'
import { notifyWelfareChanged, useWelfareNotifications } from './useWelfareNotifications'
import type { ActivityAccount, ActivityClaim, ActivityReward, ActivityType, ActivityView, RewardState } from './types'

const props = defineProps<{ type: ActivityType }>()
useWelfareNotifications()
const activities = ref<ActivityView[]>([])
const accounts = ref<ActivityAccount[]>([])
const visibleActivities = computed(() => activities.value.filter(item => item.type === props.type && (props.type !== 'sign_in' || item.status === 'active')))
const selectedGuild = ref<Record<number, number>>({})
const loading = ref(false)
const error = ref('')
const busy = ref('')
const claims = ref<ActivityClaim[]>([])
const historyPage = ref(1)
const claimTotal = ref(0)
const historyLoading = ref(false)
const historyError = ref('')
const claimOpen = ref(false)
const claimSelection = ref<{ activity: ActivityView; reward: ActivityReward; state: RewardState }>()
const selectedOptionId = ref('')
const targetAccountId = ref<number>()
const selectedOption = computed(() => claimSelection.value?.reward.options.find(item => item.id === selectedOptionId.value))
const accountOptions = computed(() => accounts.value.map(account => ({ value: account.id, label: `${account.serverName || '未知大区'} · ${account.nickname}` })))
const statusLabels = { upcoming: '即将开始', active: '进行中', ended: '已结束', disabled: '已停用' }
let disposed = false
let loadPromise: Promise<void> | undefined
let reloadQueued = false
let historyVersion = 0
let poll: ReturnType<typeof setInterval> | undefined

function guildFor(activity: ActivityView) {
  return activity.guilds?.find(item => item.accountId === selectedGuild.value[activity.id]) || activity.guilds?.[0]
}
function guildOptions(activity: ActivityView) {
  return (activity.guilds || []).map(guild => ({ value: guild.accountId, label: `${guild.nickname} · ${guild.unionName || '未同步公会'}${guild.allocationCount ? '（已参与）' : ''}` }))
}
function guildRewards(activity: ActivityView) { return activity.rewards.filter(item => item.kind === 'guild').sort((a, b) => a.threshold - b.threshold) }
// 以最高奖励人数固定刻度；参与人数超过目标时填满，不移动奖励节点。
function guildMaximum(activity: ActivityView) { return Math.max(...guildRewards(activity).map(item => item.threshold), 1) }
function guildPercent(activity: ActivityView) {
  const maximum = guildMaximum(activity)
  return Math.min(100, (guildFor(activity)?.participants || 0) / maximum * 100)
}
function nextGuildHint(activity: ActivityView) {
  const count = guildFor(activity)?.participants || 0
  const next = guildRewards(activity).find(item => item.threshold > count)
  return next ? `再有 ${next.threshold - count} 人参与，可解锁「${next.label}」` : '本期公会人数已达成全部奖励档位'
}
function rewardRows(activity: ActivityView) {
  const guild = guildFor(activity)
  return activity.rewards.flatMap(reward => {
    const states = (activity.rewardStates || []).filter(state => state.rewardId === reward.id && (
      activity.type !== 'guild_rally' || (!!guild && ((guild.participationId != null && state.participationId === guild.participationId) || state.accountId === guild.accountId))
    ))
    const rows = states.length ? states : [{ rewardId: reward.id, eligible: false, claimed: false }]
    return rows.map(state => ({ reward, state, key: `${reward.id}-${state.participationId || ''}-${state.day || ''}` }))
  })
}
function rewardRequirement(reward: ActivityReward, state: RewardState) {
  if (reward.kind === 'guild') return `公会集结 ${reward.threshold} 人，参与角色可领取`
  if (reward.kind === 'cumulative') return `本期累计签到 ${reward.threshold} 天`
  return state.day ? `${state.day} 签到奖励` : '每日签到后可领取'
}
async function load(showLoading = false) {
  if (loadPromise) { reloadQueued = true; return loadPromise }
  if (showLoading || !activities.value.length) loading.value = true
  loadPromise = (async () => {
    do {
      reloadQueued = false
      const identity = getCurrentUser()?.id
      try {
        const result = await activitiesApi.list()
        if (disposed || identity !== getCurrentUser()?.id) return
        activities.value = result.activities
        accounts.value = result.accounts
        error.value = ''
      } catch (err) {
        if (!disposed && identity === getCurrentUser()?.id) error.value = activityError(err)
      }
    } while (reloadQueued && !disposed)
    loading.value = false
  })()
  try { await loadPromise } finally { loadPromise = undefined; loading.value = false }
}
async function loadHistory(page = 1) {
  const version = ++historyVersion
  const identity = getCurrentUser()?.id
  historyLoading.value = true
  try {
    const data = await activitiesApi.claims(page)
    if (disposed || version !== historyVersion || identity !== getCurrentUser()?.id) return
    claims.value = data.records
    claimTotal.value = data.total
    historyPage.value = page
    historyError.value = ''
  } catch (err) { if (version === historyVersion) historyError.value = activityError(err) }
  finally { if (version === historyVersion) historyLoading.value = false }
}
async function afterMutation() {
  notifyWelfareChanged()
  window.dispatchEvent(new CustomEvent('activityAccountsUpdated'))
  await Promise.allSettled([load(), loadHistory(1), updateUserBalance()])
}
async function signIn(activity: ActivityView) {
  if (busy.value) return
  busy.value = `signin-${activity.id}`
  try {
    await activitiesApi.signIn(activity.id)
    message.success('签到成功，可选择领取今日奖励')
    await afterMutation()
  } catch (err) { message.error(activityError(err)); void load() }
  finally { busy.value = '' }
}
function openClaim(activity: ActivityView, reward: ActivityReward, state: RewardState) {
  claimSelection.value = { activity, reward, state }
  selectedOptionId.value = reward.options[0]?.id || ''
  targetAccountId.value = undefined
  claimOpen.value = true
}
async function claimReward() {
  const selection = claimSelection.value
  if (!selection || !selectedOption.value || busy.value) return
  if (selectedOption.value.type === 'time' && !targetAccountId.value) { message.warning('请选择增加时长的角色'); return }
  busy.value = 'claim'
  try {
    await activitiesApi.claim(selection.activity.id, {
      rewardId: selection.reward.id, optionId: selectedOption.value.id,
      ...(selection.state.participationId != null ? { participationId: selection.state.participationId } : {}),
      ...(selection.state.day ? { day: selection.state.day } : {}),
      ...(selectedOption.value.type === 'time' ? { targetAccountId: targetAccountId.value } : {}),
    })
    claimOpen.value = false
    message.success('奖励领取成功，请查看下方奖励记录')
    await afterMutation()
  } catch (err) { message.error(activityError(err)); void load() }
  finally { busy.value = '' }
}
async function copyCode(code: string) {
  try { await navigator.clipboard.writeText(code); message.success('卡密已复制') }
  catch { message.info('无法自动复制，请长按或选中卡密复制') }
}
function refreshVisible() { if (document.visibilityState === 'visible') void load() }
function changed() { void load() }
function reset() {
  activities.value = []; accounts.value = []; claims.value = []
  selectedGuild.value = {}; claimOpen.value = false; claimSelection.value = undefined
  historyVersion++
}
function storage(event: StorageEvent) {
  if (!event.key || event.key === 'user' || event.key === 'token') { reset(); void load(); void loadHistory() }
}
onMounted(() => {
  void load(true); void loadHistory()
  poll = setInterval(refreshVisible, 60_000)
  window.addEventListener('focus', refreshVisible)
  window.addEventListener('pageshow', refreshVisible)
  document.addEventListener('visibilitychange', refreshVisible)
  window.addEventListener('activitiesChanged', changed)
  window.addEventListener('logout', reset)
  window.addEventListener('storage', storage)
})
onUnmounted(() => {
  disposed = true
  clearInterval(poll)
  window.removeEventListener('focus', refreshVisible)
  window.removeEventListener('pageshow', refreshVisible)
  document.removeEventListener('visibilitychange', refreshVisible)
  window.removeEventListener('activitiesChanged', changed)
  window.removeEventListener('logout', reset)
  window.removeEventListener('storage', storage)
})
</script>

<style scoped src="./ActivityWelfare.css"></style>
