import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/pages/game-config/defaultConfig';
  export * from './src/pages/game-config/normalizeConfigSelects';
  export * from './src/pages/game-config/utils';
`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const load = raw => {
  const source = structuredClone(raw)
  m.prepareImperialTributeQualities(source)
  const config = m.deepMerge(m.createDefaultGameConfig(), source)
  m.normalizeGameConfigSelects(config)
  return config
}
const page = await loadSharePageModel(root), defaults = load({})
const allQualities = [1, 2, 3, 4, 5]
assert.deepEqual(defaults.activity.imperialTribute, { taskRewardEnabled: false, tributeEnabled: false, goldTributeEnabled: false, adRefreshEnabled: true, adRefreshQualities: [5], jadeRefreshEnabled: false, jadeRefreshQualities: allQualities, jadeReserve: 0 })
let checks = 1
for (let mask = 0; mask < 32; mask++) {
  const value = { taskRewardEnabled: !!(mask & 1), tributeEnabled: !!(mask & 2), jadeRefreshEnabled: !!(mask & 4), goldTributeEnabled: !!(mask & 8), adRefreshEnabled: !!(mask & 16), adRefreshQualities: [4, 5], jadeRefreshQualities: allQualities, jadeReserve: 500 }
  const config = load({ activity: { imperialTribute: value } })
  assert.deepEqual(config.activity.imperialTribute, value)
  assert.deepEqual(load(JSON.parse(JSON.stringify(config))).activity.imperialTribute, value)
  assert.deepEqual(page.adapter.preview(defaults, page.adapter.exportConfig(config)).config.activity.imperialTribute, value)
  const old = { format: 1, project: 'qhgy', schemaVersion: 1, config: { activity: { hdReward: { enabled: false } } } }
  assert.deepEqual(page.adapter.preview(config, old).config.activity.imperialTribute, value)
  const partial = { ...old, config: { activity: { imperialTribute: { tributeEnabled: false } } } }
  assert.deepEqual(page.adapter.preview(config, partial).config.activity.imperialTribute, { ...value, tributeEnabled: false })
  checks++
}
for (const bad of [1, 0, 'true', 'false', null, [], {}]) {
  const config = load({ activity: { imperialTribute: { taskRewardEnabled: bad, tributeEnabled: bad, goldTributeEnabled: bad, jadeRefreshEnabled: bad } } })
  assert.deepEqual(config.activity.imperialTribute, defaults.activity.imperialTribute); checks++
}
const legacy = { format: 1, project: 'qhgy', schemaVersion: 1, config: { activity: { imperialTribute: { taskRewardEnabled: true, tributeEnabled: true, jadeRefreshEnabled: false } } } }
for (const enabled of [false, true]) {
  const receiver = load({ activity: { imperialTribute: { goldTributeEnabled: enabled } } })
  assert.equal(page.adapter.preview(receiver, legacy).config.activity.imperialTribute.goldTributeEnabled, enabled)
  checks++
}
// 五品质全部32种组合，含只红、金红、空选；关闭开关也必须保留选择。
for (let mask = 0; mask < 32; mask++) {
  const qualities = allQualities.filter(color => mask & (1 << (color - 1)))
  const config = load({ activity: { imperialTribute: { tributeEnabled: true, jadeRefreshEnabled: true, jadeRefreshQualities: qualities } } })
  const selected = value => value.activity.imperialTribute.jadeRefreshQualities
  assert.deepEqual(selected(config), qualities)
  assert.deepEqual(selected(load(JSON.parse(JSON.stringify(config)))), qualities)
  const shared = page.adapter.exportConfig(config)
  assert.deepEqual(selected(page.adapter.preview(defaults, shared).config), qualities)
  assert.deepEqual(selected(page.adapter.preview(config, legacy).config), qualities)
  config.activity.imperialTribute.tributeEnabled = false
  config.activity.imperialTribute.jadeRefreshEnabled = false
  assert.deepEqual(selected(load(config)), qualities)
  checks++
}
for (const [value, expected] of [
  [undefined, allQualities], [null, []], [false, []], [true, []], [5, []], ['5', []], [{ 0: 5 }, []],
  [[5, '4', 5, '1', 0, 6, 2.5, null, true, false, {}, [], [2], 'bad'], [1, 4, 5]],
  [[6, 0, 'bad'], []],
]) {
  const config = load({ activity: { imperialTribute: { jadeRefreshQualities: value } } })
  assert.deepEqual(config.activity.imperialTribute.jadeRefreshQualities, expected)
  if (value !== undefined) {
    const code = { ...legacy, config: { activity: { imperialTribute: { jadeRefreshQualities: value } } } }
    assert.deepEqual(page.adapter.preview(defaults, code).config.activity.imperialTribute.jadeRefreshQualities, expected)
  }
  checks++
}
for (const [value, expected] of [[undefined, 0], [null, 0], ['', 0], ['500', 500], [500.9, 500],
  [-1, 0], [10000000, 9999999], [Infinity, 0], [NaN, 0], [true, 0], [[500], 0], [{}, 0]]) {
  assert.equal(load({ activity: { imperialTribute: { jadeReserve: value } } }).activity.imperialTribute.jadeReserve, expected)
  checks++
}
for (const jadeReserve of [0, 500, 9999999]) {
  const config = load({ activity: { imperialTribute: { jadeReserve } } })
  assert.equal(load(JSON.parse(JSON.stringify(config))).activity.imperialTribute.jadeReserve, jadeReserve)
  assert.equal(page.adapter.preview(defaults, page.adapter.exportConfig(config)).config.activity.imperialTribute.jadeReserve, jadeReserve)
  assert.equal(page.adapter.preview(config, legacy).config.activity.imperialTribute.jadeReserve, jadeReserve)
  const reset = { ...legacy, config: { activity: { imperialTribute: { jadeReserve: 0 } } } }
  assert.equal(page.adapter.preview(config, reset).config.activity.imperialTribute.jadeReserve, 0)
  checks++
}
// 广告品质与勾玉品质独立保存/分享；旧码缺字段不重置接收方选择。
for (let mask = 0; mask < 32; mask++) {
  const qualities = allQualities.filter(color => mask & (1 << (color - 1)))
  const config = load({ activity: { imperialTribute: { tributeEnabled: true, adRefreshEnabled: true,
    adRefreshQualities: qualities, jadeRefreshQualities: [2, 4] } } })
  const selected = value => value.activity.imperialTribute.adRefreshQualities
  assert.deepEqual(selected(config), qualities)
  assert.deepEqual(selected(load(JSON.parse(JSON.stringify(config)))), qualities)
  const shared = page.adapter.exportConfig(config)
  assert.deepEqual(selected(page.adapter.preview(defaults, shared).config), qualities)
  assert.deepEqual(selected(page.adapter.preview(config, legacy).config), qualities)
  assert.deepEqual(config.activity.imperialTribute.jadeRefreshQualities, [2, 4])
  config.activity.imperialTribute.tributeEnabled = false
  config.activity.imperialTribute.adRefreshEnabled = false
  assert.deepEqual(selected(load(config)), qualities)
  assert.equal(page.adapter.preview(config, legacy).config.activity.imperialTribute.adRefreshEnabled, false)
  assert.equal(page.adapter.preview(defaults, page.adapter.exportConfig(config)).config.activity.imperialTribute.adRefreshEnabled, false)
  checks++
}
for (const [value, expected] of [
  [undefined, [5]], [null, []], [false, []], [true, []], [5, []], ['5', []], [{ 0: 5 }, []],
  [[5, '4', 5, '1', 0, 6, 2.5, null, true, false, {}, [], [2], 'bad'], [1, 4, 5]], [[6, 0, 'bad'], []],
]) {
  assert.deepEqual(load({ activity: { imperialTribute: { adRefreshQualities: value } } }).activity.imperialTribute.adRefreshQualities, expected)
  if (value !== undefined) {
    const code = { ...legacy, config: { activity: { imperialTribute: { adRefreshQualities: value } } } }
    assert.deepEqual(page.adapter.preview(defaults, code).config.activity.imperialTribute.adRefreshQualities, expected)
  }
  checks++
}
for (const value of [false, null, 1, 'true', 'false', [], {}]) {
  assert.equal(load({ activity: { imperialTribute: { adRefreshEnabled: value } } }).activity.imperialTribute.adRefreshEnabled, false)
  const code = { ...legacy, config: { activity: { imperialTribute: { adRefreshEnabled: value } } } }
  assert.equal(page.adapter.preview(defaults, code).config.activity.imperialTribute.adRefreshEnabled, false)
  checks++
}
const snapshot = load({})
snapshot.activity.imperialTribute.adRefreshQualities.length = 0
assert.deepEqual(load({}).activity.imperialTribute.adRefreshQualities, [5])
console.log(`PASS 御前献珍前端 ${checks}组：广告/勾玉开关与品质、保留勾玉、保存/分享、旧码保值及坏值过滤`)
