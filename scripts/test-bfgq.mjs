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
assert.deepEqual(defaults.activity.actBfgq, { enabled: false, autoClaimReward: true, maxMultiple: 100,
  shop: { enabled: false, beforeEndMinutes: 5, shopItemId: 1101 } })
let checks = 1
for (const maxMultiple of [1,5,10,25,100]) for (let mask = 0; mask < 8; mask++) for (const id of [1101,1010,1004]) {
  const value = { enabled: !!(mask & 1), autoClaimReward: !!(mask & 2), maxMultiple,
    shop: { enabled: !!(mask & 4), beforeEndMinutes: 15, shopItemId: id } }
  const config = load({ activity: { actBfgq: value } })
  assert.deepEqual(config.activity.actBfgq, value)
  assert.deepEqual(load(JSON.parse(JSON.stringify(config))).activity.actBfgq, value)
  assert.deepEqual(page.adapter.preview(defaults, page.adapter.exportConfig(config)).config.activity.actBfgq, value)
  const old = { format: 1, project: 'qhgy', schemaVersion: 1, config: { activity: { actBfgq: { enabled: false } } } }
  assert.deepEqual(page.adapter.preview(config, old).config.activity.actBfgq, { ...value, enabled: false })
  checks++
}
for (const bad of [1,0,'true','false',null,[],{}]) {
  const cfg=load({activity:{actBfgq:{enabled:bad,autoClaimReward:bad,shop:{enabled:bad}}}}).activity.actBfgq
  assert.equal(cfg.enabled,false);assert.equal(cfg.autoClaimReward,bad === null);assert.equal(cfg.shop.enabled,false);checks++
}
for (const value of [true,4,0,-1,NaN,'bad']) {
  assert.equal(load({activity:{actBfgq:{maxMultiple:value}}}).activity.actBfgq.maxMultiple,100);checks++
}
assert.equal(load({activity:{actBfgq:{maxMultiple:'25'}}}).activity.actBfgq.maxMultiple,25);checks++
assert.deepEqual(load({activity:{actBfgq:{shop:{enabled:true,shopItemId:888,beforeEndMinutes:2000}}}}).activity.actBfgq.shop,
  {enabled:false,shopItemId:1101,beforeEndMinutes:1440});checks++
assert.equal(m.activityShopCatalogs.actBfgq.fallbackShopItemId,1101)
assert.equal(m.activityShopCatalogs.actBfgq.items.length,3)
console.log(`PASS 缤纷果趣前端 ${checks}组：五档倍率、三种兑换、独立开关、保存分享及非法配置`)
