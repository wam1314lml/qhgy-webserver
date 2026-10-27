import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/features/activities/calendar.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' })
const { buildCalendar, calendarBounds, initialMonth, moveMonth } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const activity = (overrides = {}) => ({ id: 1, type: 'sign_in', status: 'active', startAt: Date.parse('2028-02-01T00:00:00+08:00'), endAt: Date.parse('2028-03-01T00:00:00+08:00'), rewards: [{ id: 'daily', kind: 'daily', options: [{ id: 'cash', type: 'points', value: 1 }] }], rewardStates: [], signIn: { today: '2028-02-28', days: [], canSignIn: true }, ...overrides })

test('真实月份网格包含闰日、正确星期、活动结束零点排除次日', () => {
  const a = activity(), cells = buildCalendar(a, '2028-02')
  assert.equal(cells.filter(Boolean).length, 29)
  assert.equal(cells[0], null) // 2028-02-01 周二
  assert.equal(cells[1].date, '2028-02-01')
  assert.deepEqual(calendarBounds(a), { first: '2028-02-01', last: '2028-02-29' })
  assert.equal(buildCalendar(a, '2027-02').filter(Boolean).length, 28)
  assert.equal(moveMonth('2028-12', 1), '2029-01')
  assert.equal(moveMonth('2028-01', -1), '2027-12')
})
test('已签漏领奖励可跨月领取，未签/未来/活动外日期不能领奖', () => {
  const a = activity({ startAt: Date.parse('2028-01-30T12:00:00+08:00'), rewardStates: [{ rewardId: 'daily', day: '2028-01-31', eligible: true, claimed: false }] })
  const jan = buildCalendar(a, '2028-01').filter(Boolean)
  assert.equal(jan[28].inPeriod, false)
  assert.equal(jan[29].action, null)
  assert.equal(jan[30].action, 'claim')
  assert.equal(jan[30].state.day, '2028-01-31')
  const feb = buildCalendar(a, '2028-02').filter(Boolean)
  assert.equal(feb[27].action, 'sign')
  assert.equal(feb[28].action, null)
  assert.equal(feb[28].label, '待开启')
  assert.equal(initialMonth(a), '2028-02')
})
test('已领与暂停状态不可点击，只有签到记录不会自行推断奖励资格', () => {
  const a = activity({ signIn: { today: '2028-02-28', days: ['2028-02-27', '2028-02-28'], signedToday: true, canSignIn: false }, rewardStates: [{ rewardId: 'daily', day: '2028-02-28', eligible: true, claimed: true }] })
  const days = buildCalendar(a, '2028-02').filter(Boolean)
  assert.equal(days[26].signed, true); assert.equal(days[26].action, null)
  assert.equal(days[27].label, '已领取'); assert.equal(days[27].action, null)
  assert.ok(buildCalendar(activity({ status: 'disabled' }), '2028-02').filter(Boolean).every(day => !day.action))
})
test('只有累计奖仍能签到；无角色字段不影响资格与服务端日期', () => {
  const a = activity({ rewards: [] }), days = buildCalendar(a, '2028-02').filter(Boolean)
  assert.equal(days[27].action, 'sign')
  assert.equal(days[27].today, true)
  assert.equal(initialMonth(activity({ signIn: { today: '2029-01-01' } })), '2028-02')
})
