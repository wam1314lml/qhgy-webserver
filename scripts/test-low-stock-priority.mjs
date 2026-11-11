// 运行实际默认配置、归一化和页面分享适配器；所有数据均为本地合成值。
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/pages/game-config/defaultConfig';
  export * from './src/pages/game-config/normalizeConfigSelects';
  export * from './src/pages/game-config/utils';
`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'esm' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const load = (raw = {}, platform) => {
  const config = m.deepMerge(m.createDefaultGameConfig(), structuredClone(raw))
  m.normalizeGameConfigSelects(config, platform)
  return config
}
const payload = flower => ({ format: 1, project: 'qhgy', schemaVersion: 1, config: { plant: { flower } } })
let checks = 0
for (const platform of [1, 3]) {
  const page = await loadSharePageModel(root, { platform })
  assert.equal(load({}, platform).plant.flower.lowStockPriority, 'lowest')
  assert.equal('lowStockPriority' in load({}, platform).union.land, false)
  assert.equal(load({}, platform).plant.flower.lowStockAvoidElves, false)
  assert.equal('lowStockAvoidElves' in load({}, platform).union.land, false)
  checks++
  for (const value of [undefined, null, '', 'true', 'false', 0, 1, false, true, [], {}]) {
    const config = load({ plant: { flower: { lowStockAvoidElves: value } } }, platform)
    assert.equal(config.plant.flower.lowStockAvoidElves, value === true)
    checks++
  }
  for (const value of [true, false]) {
    const config = load({ plant: { flower: { plantingMode: 'lowStock', lowStockAvoidElves: value } } }, platform)
    const reload = load(JSON.parse(JSON.stringify(config)), platform)
    assert.equal(reload.plant.flower.lowStockAvoidElves, value)
    const shared = page.adapter.preview(load({}, platform), page.adapter.exportConfig(reload)).config
    assert.equal(shared.plant.flower.lowStockAvoidElves, value)
    const old = page.adapter.preview(shared, payload({ lowStockThreshold: 600 })).config
    assert.equal(old.plant.flower.lowStockAvoidElves, value, '旧分享码缺字段不得清掉接收方选择')
    shared.plant.flower.plantingMode = 'count'
    assert.equal(load(shared, platform === 1 ? 3 : 1).plant.flower.lowStockAvoidElves, value)
    assert.equal(page.adapter.preview(shared, payload({ lowStockAvoidElves: !value })).config.plant.flower.lowStockAvoidElves, !value)
    checks++
  }
  for (const bad of [undefined, null, '', 'unknown', 'Closest', 0, 1, false, true, [], {}]) {
    const config = load({ plant: { flower: { lowStockPriority: bad } } }, platform)
    assert.equal(config.plant.flower.lowStockPriority, 'lowest')
    checks++
  }
  for (const priority of ['lowest', 'closest']) {
    const config = load({ plant: { flower: { plantingMode: 'lowStock', lowStockPriority: priority,
      lowStockThreshold: 500, lowStockExcludeEnabled: true, lowStockExcludeFlowerIds: ['52046'] } } }, platform)
    const unionBefore = structuredClone(config.union.land)
    const reload = load(JSON.parse(JSON.stringify(config)), platform)
    assert.equal(reload.plant.flower.lowStockPriority, priority)
    assert.deepEqual(reload.union.land, unionBefore)
    assert.deepEqual(reload.plant.flower.plantExcludeFlowerIds, ['52046'])
    const shared = page.adapter.preview(load({}, platform), page.adapter.exportConfig(reload)).config
    assert.equal(shared.plant.flower.lowStockPriority, priority)
    // 旧码包含同一 flower 节点，也不能把接收方新选择补成默认值。
    const old = page.adapter.preview(shared, payload({ lowStockThreshold: 600 })).config
    assert.equal(old.plant.flower.lowStockPriority, priority)
    assert.equal(old.plant.flower.lowStockThreshold, 600)
    assert.equal(page.adapter.preview(old, payload({ lowStockPriority: 'unknown' })).config.plant.flower.lowStockPriority, 'lowest')
    // 隐藏控件仍保留选择，恢复库存模式和跨渠道复制均沿用原值。
    shared.plant.flower.plantingMode = 'count'
    const copied = load(shared, platform === 1 ? 3 : 1)
    assert.equal(copied.plant.flower.lowStockPriority, priority)
    copied.plant.flower.plantingMode = 'lowStock'
    assert.equal(load(copied, platform).plant.flower.lowStockPriority, priority)
    checks++
  }
}
console.log(`PASS 库存补充优先级与果灵避让 ${checks} 组：双渠道、旧配置默认、非法值、保存重载、分享、旧码保值、隐藏保值、复制及公会隔离`)
