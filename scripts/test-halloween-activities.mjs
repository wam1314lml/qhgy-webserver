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
const fields = ['hd1002SignEnabled', 'hd1002TaskRewardEnabled', 'hd1002DrawEnabled', 'hd1002GiftEnabled']
const defaults = load({}), page = await loadSharePageModel(root)
for (const key of fields) assert.equal(defaults.activity.hdReward[key], false)
for (let mask = 0; mask < 32; mask++) {
  const expected = { ...defaults.activity.hdReward,
    ...Object.fromEntries(['enabled', ...fields].map((key, i) => [key, !!(mask & (1 << i))])) }
  const config = load({ activity: { hdReward: expected } })
  assert.deepEqual(load(JSON.parse(JSON.stringify(config))).activity.hdReward, expected)
  assert.deepEqual(page.adapter.preview(defaults, page.adapter.exportConfig(config)).config.activity.hdReward, expected)
  const legacy = page.adapter.preview(config, { format: 1, project: 'qhgy', schemaVersion: 1,
    config: { activity: { hdReward: { hd42SignEnabled: true } } },
  }).config
  for (const key of fields) assert.equal(legacy.activity.hdReward[key], expected[key])
}
for (const value of ['true', 'false', 1, 0, [], {}, null]) {
  const config = load({ activity: { hdReward: Object.fromEntries(fields.map(key => [key, value])) } })
  for (const key of fields) assert.equal(config.activity.hdReward[key], false)
}
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
for (const key of fields) assert.ok(source.includes(`name="activity.hdReward.${key}"`))
assert.ok(source.includes(`handleDiamondCostSwitchChange('activity.hdReward.hd1002GiftEnabled', checked === true)`))
assert.ok(source.includes(':disabled="!config.activity.hdReward.hd1002DrawEnabled"'))
assert.ok(source.includes('68、198、520'))
console.log('PASS 万圣狂想：32种开关保存/分享往返、旧码保留、严格布尔值、购买授权与捣蛋依赖')
