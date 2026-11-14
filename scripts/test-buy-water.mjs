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
const load = value => {
  const config = m.deepMerge(m.createDefaultGameConfig(), structuredClone(value))
  m.normalizeGameConfigSelects(config)
  return config
}
const page = await loadSharePageModel(root), defaults = load({})
assert.equal(defaults.plant.flower.autoBuyWater, false)
assert.equal(defaults.plant.flower.buyWaterPreferVoucher, true)
assert.equal(defaults.plant.flower.buyWaterWithDiamond, false)
assert.equal(defaults.plant.flower.buyWaterDiamondReserve, 500)
assert.equal(defaults.plant.flower.buyWaterBelow, 0)
const fields = ['autoBuyWater', 'buyWaterPreferVoucher', 'buyWaterWithDiamond', 'buyWaterDiamondReserve', 'buyWaterBelow']
for (let mask = 0; mask < 16; mask++) {
  const expected = { plantEnabled: !!(mask & 8), autoBuyWater: !!(mask & 1),
    buyWaterPreferVoucher: !!(mask & 2), buyWaterWithDiamond: !!(mask & 4),
    buyWaterDiamondReserve: mask % 2 ? 500 : 0, buyWaterBelow: mask % 2 ? 9999 : 0 }
  const config = load({ plant: { flower: expected } })
  const saved = load(JSON.parse(JSON.stringify(config)))
  const shared = page.adapter.preview(defaults, page.adapter.exportConfig(config)).config
  const old = page.adapter.preview(config, { format: 1, project: 'qhgy', schemaVersion: 1,
    config: { plant: { flower: { waterThreshold: 30 } } } }).config
  for (const key of fields) {
    assert.equal(saved.plant.flower[key], expected[key])
    assert.equal(shared.plant.flower[key], expected[key])
    assert.equal(old.plant.flower[key], expected[key])
  }
}
for (const value of ['true', 'false', 1, 0, [], {}]) {
  const config = load({ plant: { flower: { autoBuyWater: value, buyWaterPreferVoucher: value, buyWaterWithDiamond: value } } })
  for (const key of fields.slice(0, 3)) assert.equal(config.plant.flower[key], false)
}
for (const [input, expected] of [[-10, 0], [2.9, 2], ['35', 35], [1e10, 9999999]]) {
  const config = load({ plant: { flower: { buyWaterBelow: input, buyWaterDiamondReserve: input } } })
  assert.equal(config.plant.flower.buyWaterBelow, expected)
  assert.equal(config.plant.flower.buyWaterDiamondReserve, expected)
}
for (const invalid of [null, '', 'bad']) {
  const config = load({ plant: { flower: { buyWaterDiamondReserve: invalid } } })
  assert.equal(config.plant.flower.buyWaterDiamondReserve, 500)
}
console.log('PASS 买水：16种开关保存/分享组合、旧码缺字段保值、布尔/数值边界与隐藏子项保留')
