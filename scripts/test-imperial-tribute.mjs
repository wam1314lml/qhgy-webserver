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
  const config = m.deepMerge(m.createDefaultGameConfig(), structuredClone(raw))
  m.normalizeGameConfigSelects(config)
  return config
}
const page = await loadSharePageModel(root), defaults = load({})
assert.deepEqual(defaults.activity.imperialTribute, { taskRewardEnabled: false, tributeEnabled: false, jadeRefreshEnabled: false })
let checks = 1
for (let mask = 0; mask < 8; mask++) {
  const value = { taskRewardEnabled: !!(mask & 1), tributeEnabled: !!(mask & 2), jadeRefreshEnabled: !!(mask & 4) }
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
  const config = load({ activity: { imperialTribute: { taskRewardEnabled: bad, tributeEnabled: bad, jadeRefreshEnabled: bad } } })
  assert.deepEqual(config.activity.imperialTribute, defaults.activity.imperialTribute); checks++
}
console.log(`PASS 御前献珍前端 ${checks}组：八种开关组合、保存/分享、旧码和部分字段保值、严格布尔`)
