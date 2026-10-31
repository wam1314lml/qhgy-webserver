import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/features/activities/rewardAccounts.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' })
const { canReceiveTimeReward } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const now = Date.parse('2026-11-01T00:00:00+08:00')

test('无角色、空有效期、无效时间、已过期和恰好到期均不能领取时长', () => {
  assert.equal(canReceiveTimeReward(undefined, now), false)
  for (const expireTime of [null, '', 'invalid', NaN, Infinity, now - 1, now, new Date(now).toISOString()]) {
    assert.equal(canReceiveTimeReward({ expireTime }, now), false, String(expireTime))
  }
})
test('只有目标角色有效才可选，其他有效角色不能替过期角色领取', () => {
  const accounts = [{ id: 1, expireTime: now }, { id: 2, expireTime: now + 1 }]
  assert.deepEqual(accounts.filter(account => canReceiveTimeReward(account, now)).map(account => account.id), [2])
})
test('不同偏移量的时间按同一绝对时刻校验', () => {
  for (const expireTime of ['2026-11-01T00:00:01+08:00', '2026-10-31T16:00:01Z', now + 1000]) {
    assert.equal(canReceiveTimeReward({ expireTime }, now), true)
    assert.equal(canReceiveTimeReward({ expireTime }, now + 1000), false)
  }
})
test('弹窗打开后到期必须拒绝，续期后可重新选择', () => {
  const account = { expireTime: now + 1000 }
  assert.equal(canReceiveTimeReward(account, now), true)
  assert.equal(canReceiveTimeReward(account, now + 1000), false)
  account.expireTime = now + 3600000
  assert.equal(canReceiveTimeReward(account, now + 1000), true)
})
