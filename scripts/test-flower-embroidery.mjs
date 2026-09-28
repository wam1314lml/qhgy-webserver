import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/pages/game-config/defaultConfig';
  export * from './src/pages/game-config/normalizeConfigSelects';
  export * from './src/pages/game-config/utils';
  export * from './src/pages/game-config/activityShop';
`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const load = value => {
  const config = m.deepMerge(m.createDefaultGameConfig(), structuredClone(value))
  m.normalizeGameConfigSelects(config)
  return config
}
const page = await loadSharePageModel(root)
const defaults = load({})
const fresh = defaults.activity.flowerEmbroidery
const guards = ['orderGuard', 'customerOrderGuard', 'artSellGuard']
assert.equal(fresh.enabled, false)
assert.equal(fresh.refreshEnabled, false)
assert.equal(fresh.unlockSlot, false)
assert.deepEqual(fresh.shop, { enabled: false, beforeEndMinutes: 5, shopItemId: 5 })
for (const key of guards) assert.deepEqual(fresh[key], { enabled: false, timeRanges: [{ start: '00:00', end: '21:00' }] })
for (let mask = 0; mask < 128; mask++) {
  const expected = structuredClone(fresh)
  expected.enabled = !!(mask & 1); expected.refreshEnabled = !!(mask & 2); expected.shop.enabled = !!(mask & 4)
  expected.unlockSlot = !!(mask & 64)
  for (const [i, key] of guards.entries()) expected[key] = { enabled: !!(mask & (8 << i)), timeRanges: [{ start: '22:00', end: '07:00' }] }
  const config = load({ activity: { flowerEmbroidery: expected } })
  assert.deepEqual(load(JSON.parse(JSON.stringify(config))).activity.flowerEmbroidery, expected)
  const exported = page.adapter.exportConfig(config)
  assert.deepEqual(page.adapter.preview(defaults, exported).config.activity.flowerEmbroidery, expected)
  const old = { format: 1, project: 'qhgy', schemaVersion: 1, config: { activity: { hdReward: { enabled: false } } } }
  assert.deepEqual(page.adapter.preview(config, old).config.activity.flowerEmbroidery, expected)
}
for (const bad of [1, 0, 'true', 'false', null, [], {}]) {
  const config = load({ activity: { flowerEmbroidery: { enabled: bad, refreshEnabled: bad, unlockSlot: bad,
    ...Object.fromEntries(guards.map(key => [key, { enabled: bad }])) } } }).activity.flowerEmbroidery
  assert.equal(config.enabled, false); assert.equal(config.refreshEnabled, false)
  assert.equal(config.unlockSlot, false)
  for (const key of guards) assert.equal(config[key].enabled, false)
}
const invalid = load({ activity: { flowerEmbroidery: { shop: { enabled: true, shopItemId: 888 },
  orderGuard: { enabled: true, timeRanges: [{ start: '24:00', end: 'broken' }] } } } }).activity.flowerEmbroidery
assert.equal(invalid.shop.enabled, false)
assert.deepEqual(invalid.orderGuard.timeRanges, [{ start: '00:00', end: '21:00' }])
for (const id of [1010, 5, 1101, 2]) assert.equal(load({ activity: { flowerEmbroidery: { shop: { enabled: true, shopItemId: String(id) } } } }).activity.flowerEmbroidery.shop.shopItemId, id)
assert.ok(m.getActivityShopOptions(m.activityShopCatalogs.flowerEmbroidery).every(row => row.label.includes('以本期活动为准')))
assert.equal(m.getActivityShopOptions(m.activityShopCatalogs.silkEmbroidery)[1].label, '水滴×4（50金丝绣线）')
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
for (const label of ['果香绘色', '居民订单守护', '顾客订单守护', '花艺守护', '勾玉刷新任务', '自动解锁任务栏', '花绣商店']) assert.ok(source.includes(label))
assert.ok(!source.includes("taskPriorityConfig['果香绘色']"))
assert.ok(source.includes(':catalog="activityShopCatalogs.flowerEmbroidery"'))
assert.ok(source.includes('activity.flowerEmbroidery.shop'))
console.log('PASS 果香绘色：128种开关组合保存/分享，旧码兼容、独立清仓、跨午夜时段、非法配置与原绣锦目录')
