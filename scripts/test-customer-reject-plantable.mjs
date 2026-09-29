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
`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const load = value => {
  const config = m.deepMerge(m.createDefaultGameConfig(), structuredClone(value))
  m.normalizeGameConfigSelects(config)
  return config
}
const defaults = load({}), page = await loadSharePageModel(root)
assert.equal(defaults.order.customer.rejectPlantable, false)
for (let mask = 0; mask < 8; mask++) {
  const customer = { enabled: !!(mask & 1), rejectEnabled: !!(mask & 2), rejectPlantable: !!(mask & 4) }
  const config = load({ order: { customer } })
  assert.equal(load(JSON.parse(JSON.stringify(config))).order.customer.rejectPlantable, customer.rejectPlantable)
  const exported = page.adapter.exportConfig(config)
  assert.deepEqual(page.adapter.preview(defaults, exported).config.order.customer, config.order.customer)
  const old = { format: 1, project: 'qhgy', schemaVersion: 1, config: { order: { customer: { rejectEnabled: false } } } }
  assert.equal(page.adapter.preview(config, old).config.order.customer.rejectPlantable, customer.rejectPlantable)
}
for (const bad of ['true', 'false', 0, 1, null, [], {}]) {
  assert.equal(load({ order: { customer: { rejectPlantable: bad } } }).order.customer.rejectPlantable, false)
}
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
const item = source.match(/<CustomFormItem\s+label="可种也拒绝"[\s\S]*?<\/CustomFormItem>/)?.[0]
assert.ok(item?.includes('v-if="config.order.customer.enabled && config.order.customer.rejectEnabled"'))
assert.ok(item?.includes('v-model:checked="config.order.customer.rejectPlantable"'))
assert.ok(item?.includes('原料足够直接制作的订单仍正常完成'))
console.log('PASS 顾客可种也拒绝：默认/严格布尔、8种保存分享组合、隐藏保留、旧码兼容及实际Vue控件')
