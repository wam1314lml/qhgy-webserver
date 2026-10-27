import type { ActivityView, RewardState } from './types'

const DAY = 86_400_000
export const beijingDate = (time: number) => new Date(time + 28_800_000).toISOString().slice(0, 10)
export function calendarBounds(activity: ActivityView) {
  // 结束时刻不包含：北京时间零点结束的活动，前一天才是最后活动日。
  return { first: beijingDate(activity.startAt), last: beijingDate(activity.endAt - 1) }
}
export function calendarToday(activity: ActivityView) { return activity.signIn?.today || beijingDate(Date.now()) }
export function moveMonth(month: string, delta: number) {
  const [year, index] = month.split('-').map(Number)
  return new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7)
}
export function initialMonth(activity: ActivityView) {
  const { first, last } = calendarBounds(activity)
  const today = calendarToday(activity)
  return (today < first ? first : today > last ? last : today).slice(0, 7)
}
export function buildCalendar(activity: ActivityView, month: string) {
  const { first, last } = calendarBounds(activity), today = calendarToday(activity)
  const daily = activity.rewards.find(reward => reward.kind === 'daily')
  const signed = new Set(activity.signIn?.days || [])
  if (activity.signIn?.signedToday) signed.add(today)
  const states = new Map(activity.rewardStates.filter(state => state.rewardId === daily?.id && state.day).map(state => [state.day!, state]))
  const timestamp = Date.parse(`${month}-01T00:00:00Z`)
  const offset = (new Date(timestamp).getUTCDay() + 6) % 7
  const length = new Date(Date.parse(`${moveMonth(month, 1)}-01T00:00:00Z`) - DAY).getUTCDate()
  return Array.from({ length: Math.ceil((offset + length) / 7) * 7 }, (_, index) => {
    const number = index - offset + 1
    if (number < 1 || number > length) return null
    const date = `${month}-${String(number).padStart(2, '0')}`
    const state: RewardState = states.get(date) || { rewardId: daily?.id || '', day: date, eligible: false, claimed: false }
    const inPeriod = date >= first && date <= last
    const isSigned = signed.has(date) || state.eligible || state.claimed
    const action = !inPeriod || activity.status !== 'active' ? null
      : daily && state.eligible && !state.claimed ? 'claim'
      : date === today && activity.signIn?.canSignIn ? 'sign' : null
    const label = !inPeriod ? '非活动日' : state.claimed ? '已领取' : action === 'claim' ? '可领取'
      : isSigned ? '已签到' : date === today ? '待签到' : date > today ? '待开启' : '未签到'
    return { date, number, inPeriod, signed: isSigned, today: date === today, state, action, label }
  })
}
