import assert from 'node:assert/strict'
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
const load = raw => {
  const config = m.deepMerge(m.createDefaultGameConfig(), structuredClone(raw))
  m.normalizeGameConfigSelects(config)
  return config
}
const page = await loadSharePageModel(root), defaults = load({})
assert.deepEqual(defaults.activity.actCyclicStory, { enabled: false, refreshEnabled: false, maxFinshCntPerBatch: 0,
  shop: { enabled: false, beforeEndMinutes: 5, shopItemId: 5 } })
let checks = 1
for (let mask = 0; mask < 8; mask++) for (const id of [1010, 5, 1101, 2]) {
  const value = { enabled: !!(mask & 1), refreshEnabled: !!(mask & 2), maxFinshCntPerBatch: 3800,
    shop: { enabled: !!(mask & 4), beforeEndMinutes: 15, shopItemId: id } }
  const config = load({ activity: { actCyclicStory: value }, plant: { flower: { taskPriorityConfig: { 莳花纪闻: 0 } } } })
  assert.deepEqual(config.activity.actCyclicStory, value)
  assert.deepEqual(load(JSON.parse(JSON.stringify(config))).activity.actCyclicStory, value)
  const exported = page.adapter.exportConfig(config)
  const shared = page.adapter.preview(defaults, exported).config
  assert.deepEqual(shared.activity.actCyclicStory, value)
  assert.equal(shared.plant.flower.taskPriorityConfig['莳花纪闻'], 0)
  const old = { format: 1, project: 'qhgy', schemaVersion: 1, config: { activity: { actCyclicStory: { enabled: false } } } }
  assert.deepEqual(page.adapter.preview(config, old).config.activity.actCyclicStory, { ...value, enabled: false })
  checks++
}
for (const bad of [1, 0, 'true', 'false', null, [], {}]) {
  const cfg = load({ activity: { actCyclicStory: { enabled: bad, refreshEnabled: bad, shop: { enabled: bad } } } }).activity.actCyclicStory
  assert.equal(cfg.enabled, false); assert.equal(cfg.refreshEnabled, false); assert.equal(cfg.shop.enabled, false); checks++
}
for (const [value, expected] of [[-1, 0], [3.9, 3], ['3800', 3800], [1e10, 9999999], [true, 0], ['bad', 0]]) {
  assert.equal(load({ activity: { actCyclicStory: { maxFinshCntPerBatch: value } } }).activity.actCyclicStory.maxFinshCntPerBatch, expected); checks++
}
const invalid = load({ activity: { actCyclicStory: { shop: { enabled: true, shopItemId: 888, beforeEndMinutes: 2000 } } } }).activity.actCyclicStory
assert.deepEqual(invalid.shop, { enabled: false, shopItemId: 5, beforeEndMinutes: 1440 }); checks++
assert.ok(m.getActivityShopOptions(m.activityShopCatalogs.actCyclicStory).every(row => row.label.includes('以本期活动为准')))
console.log(`PASS 悦果序曲前端 ${checks}组：开关组合、四种兑换、保存/分享、旧码保值、旧优先级兼容及非法配置`)
