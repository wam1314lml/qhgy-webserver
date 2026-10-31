<template>
  <section class="signin-calendar" aria-label="签到奖励日历">
    <div class="signin-board">
      <div class="calendar-main">
        <div class="calendar-heading">
          <div class="calendar-title"><CalendarOutlined /><div><h4>{{ monthTitle }}<span>签到有礼</span></h4><p>本期累计 <strong>{{ activity.signIn?.totalDays || 0 }}</strong> 天 · 无需连续</p></div></div>
          <div class="calendar-navigation">
            <a-button type="text" aria-label="上个月" :disabled="month <= bounds.first.slice(0, 7)" @click="month = moveMonth(month, -1)"><LeftOutlined /></a-button>
            <a-button type="text" aria-label="回到本月" @click="month = initialMonth(activity)">本月</a-button>
            <a-button type="text" aria-label="下个月" :disabled="month >= bounds.last.slice(0, 7)" @click="month = moveMonth(month, 1)"><RightOutlined /></a-button>
          </div>
        </div>
        <div class="calendar-legend"><span><RewardIcon type="points" />点数</span><span><RewardIcon type="time" />时长（小时）</span><span><RewardIcon type="card" />福利卡（点）</span></div>
        <p class="calendar-rule">{{ daily ? daily.options.length > 1 ? '每日签到后，任选一项奖励；点击可领取的日期领礼。' : '每日签到后，点击可领取的日期领礼。' : '签到积累天数，解锁本期累计奖励。' }}</p>
        <table class="calendar-table">
          <caption class="visually-hidden">{{ monthTitle }}签到奖励，按北京时间计算</caption>
          <thead><tr><th v-for="weekday in weekdays" :key="weekday" scope="col">{{ weekday }}</th></tr></thead>
          <tbody><tr v-for="(week, index) in weeks" :key="index"><td v-for="(day, column) in week" :key="day?.date || `empty-${column}`">
            <button v-if="day" type="button" class="calendar-day" :data-date="day.date" :class="{ 'day-today': day.today, 'day-signed': day.signed, 'day-claimed': day.state.claimed, 'day-ready': day.action === 'claim', 'day-outside': !day.inPeriod }" :disabled="!day.action || !!busy" :aria-label="dayLabel(day)" :aria-current="day.today ? 'date' : undefined" @click="selectDay(day)">
              <span class="day-number">{{ day.number }}<small v-if="day.today">今天</small></span>
              <span v-if="day.inPeriod && daily" class="day-rewards"><span v-for="option in daily.options" :key="option.id" class="calendar-reward" :title="rewardText(option.type, option.value)"><RewardIcon :type="option.type" /><span>{{ quantity(option.value) }}</span></span></span>
              <span v-else-if="day.inPeriod" class="day-sign-symbol"><CheckCircleOutlined v-if="day.signed" /><CalendarOutlined v-else /></span>
              <span v-else class="day-placeholder">—</span>
              <span class="day-status"><CheckOutlined v-if="day.state.claimed || (day.signed && !daily)" />{{ day.label }}</span>
            </button>
          </td></tr></tbody>
        </table>
        <div class="calendar-footer">
          <div><strong>{{ activity.signIn?.signedToday ? '今日已签到' : '今日还未签到' }}</strong><p>{{ activity.signIn?.reason || '北京时间 00:00 更新，已签到奖励可在活动结束前补领。' }}</p></div>
          <button class="signin-cta" type="button" :disabled="!activity.signIn?.canSignIn || !!busy || activity.status !== 'active'" @click="emit('signIn')"><LoadingOutlined v-if="busy === `signin-${activity.id}`" />{{ activity.signIn?.signedToday ? '今日已签到' : '立即签到' }}</button>
        </div>
        <p class="signin-access-note">签到需名下至少一个未过期角色。已签到奖励可继续领取；时长可发给名下角色，已过期角色也支持。</p>
      </div>
      <aside class="calendar-milestones" aria-label="累计签到奖励">
        <div class="milestone-heading"><GiftOutlined /><h4>累计签到礼</h4><span>每档任选一项</span></div>
        <p v-if="!cumulative.length" class="milestone-empty">本期未设置累计奖励，每日签到礼在左侧日历领取。</p>
        <div v-for="row in cumulative" :key="row.reward.id" class="milestone-card" :class="{ 'milestone-ready': row.state.eligible && !row.state.claimed }">
          <div class="milestone-title"><span class="milestone-days"><strong>{{ row.reward.threshold }}</strong> 天</span><div><strong>{{ row.reward.label }}</strong><p>{{ Math.min(activity.signIn?.totalDays || 0, row.reward.threshold) }} / {{ row.reward.threshold }} 天</p></div></div>
          <div class="milestone-rewards"><div v-for="option in row.reward.options" :key="option.id"><RewardIcon :type="option.type" /><span>{{ rewardText(option.type, option.value) }}</span></div></div>
          <a-button block :type="row.state.eligible && !row.state.claimed ? 'primary' : 'default'" :disabled="!row.state.eligible || row.state.claimed || !!busy || activity.status !== 'active'" @click="emit('claim', row.reward, row.state)">{{ row.state.claimed ? '已领取' : row.state.eligible ? '选择奖励' : '未达成' }}</a-button>
        </div>
      </aside>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarOutlined, CheckCircleOutlined, CheckOutlined, GiftOutlined, LeftOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons-vue'
import RewardIcon from './RewardIcon.vue'
import { buildCalendar, calendarBounds, calendarToday, initialMonth, moveMonth } from './calendar'
import { rewardText } from './api'
import type { ActivityReward, ActivityView, RewardState } from './types'
const props = defineProps<{ activity: ActivityView; busy?: string }>()
const emit = defineEmits<{ signIn: []; claim: [reward: ActivityReward, state: RewardState] }>()
const month = ref(initialMonth(props.activity))
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const bounds = computed(() => calendarBounds(props.activity))
const daily = computed(() => props.activity.rewards.find(reward => reward.kind === 'daily'))
const days = computed(() => buildCalendar(props.activity, month.value))
const weeks = computed(() => Array.from({ length: days.value.length / 7 }, (_, index) => days.value.slice(index * 7, index * 7 + 7)))
const monthTitle = computed(() => `${month.value.slice(0, 4)} 年 ${Number(month.value.slice(5))} 月`)
const cumulative = computed(() => props.activity.rewards.filter(reward => reward.kind === 'cumulative').sort((a, b) => a.threshold - b.threshold).map(reward => ({ reward, state: props.activity.rewardStates.find(state => state.rewardId === reward.id) || { rewardId: reward.id, eligible: false, claimed: false } })))
watch(() => `${props.activity.id}:${calendarToday(props.activity)}:${props.activity.startAt}:${props.activity.endAt}`, () => { month.value = initialMonth(props.activity) })
function quantity(value: number) { return value >= 10000 && value % 10000 === 0 ? `${value / 10000}万` : String(value) }
type Day = NonNullable<ReturnType<typeof buildCalendar>[number]>
function dayLabel(day: Day) { return `${day.date}，${day.label}${day.inPeriod && daily.value ? `，${daily.value.options.map(option => rewardText(option.type, option.value)).join(' / ')}` : ''}` }
function selectDay(day: Day) {
  if (props.busy) return
  if (day.action === 'sign') emit('signIn')
  else if (day.action === 'claim' && daily.value) emit('claim', daily.value, day.state)
}
</script>
<style scoped src="./SignInCalendar.css"></style>
