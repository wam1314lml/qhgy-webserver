import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/pages/game-config/defaultConfig';
  export * from './src/pages/game-config/normalizeConfigSelects';
  export * from './src/pages/game-config/utils';
`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node' })
const model = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const load = value => {
  const config = model.deepMerge(model.createDefaultGameConfig(), structuredClone(value))
  model.normalizeGameConfigSelects(config)
  return config
}
const fields = ['enabled', 'hd3013DrawEnabled', 'hd90TaskRewardEnabled', 'hd90DrawEnabled', 'hd91SignEnabled',
  'hd42SignEnabled', 'hd44TaskRewardEnabled', 'hd44GiftEnabled']
const newFields = fields.slice(5), defaults = load({})
for (const field of newFields) assert.equal(defaults.activity.hdReward[field], false)
assert.equal(defaults.union.redBag.enabled, false)
const page = await loadSharePageModel(root)
for (let mask = 0; mask < 512; mask++) {
  const expected = Object.fromEntries(fields.map((key, index) => [key, !!(mask & (1 << index))]))
  const enabled = !!(mask & 256)
  const config = load({ activity: { hdReward: expected }, union: { redBag: { enabled } } })
  const saved = load(JSON.parse(JSON.stringify(config)))
  assert.deepEqual(saved.activity.hdReward, expected)
  assert.equal(saved.union.redBag.enabled, enabled)
  const imported = page.adapter.preview(defaults, page.adapter.exportConfig(config)).config
  assert.deepEqual(imported.activity.hdReward, expected)
  assert.equal(imported.union.redBag.enabled, enabled)
  const legacy = page.adapter.preview(config, { format: 1, project: 'qhgy', schemaVersion: 1,
    config: { activity: { hdReward: { enabled: false } }, union: { build: { free: true } } },
  }).config
  for (const key of newFields) assert.equal(legacy.activity.hdReward[key], expected[key])
  assert.equal(legacy.union.redBag.enabled, enabled)
}
for (const value of ['true', 'false', 1, 0, [], {}, null]) {
  const config = load({ activity: { hdReward: Object.fromEntries(newFields.map(key => [key, value])) }, union: { redBag: { enabled: value } } })
  for (const key of newFields) assert.equal(config.activity.hdReward[key], false)
  assert.equal(config.union.redBag.enabled, false)
}
const filename = 'src/pages/GameConfigPage.vue', source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
for (const field of newFields) assert.ok(source.includes(`name="activity.hdReward.${field}"`))
assert.ok(source.includes(`handleDiamondCostSwitchChange('activity.hdReward.hd44GiftEnabled', checked === true)`))
assert.ok(source.includes('name="union.redBag.enabled"'))
assert.ok(source.includes('达到520集结值后领取柠趣气球并停止购买'))
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'kingdom-test' })
const template = compileTemplate({ source: parsed.descriptor.template.content, filename, id: 'kingdom-test',
  compilerOptions: { bindingMetadata: script.bindings } })
assert.deepEqual(template.errors, [])
console.log('PASS 王国庆典/公会红包：512种新旧开关保存与分享、旧码保留、非法布尔值、勾玉确认接线和Vue编译')
