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
const fields = ['hd90TaskRewardEnabled', 'hd90DrawEnabled', 'hd91SignEnabled']
const defaults = load({})
for (const key of fields) assert.equal(defaults.activity.hdReward[key], false)
const page = await loadSharePageModel(root)
for (let mask = 0; mask < 32; mask++) {
  const expected = Object.fromEntries(['enabled', 'hd3013DrawEnabled', ...fields].map((key, index) => [key, !!(mask & (1 << index))]))
  const config = load({ activity: { hdReward: expected } })
  assert.deepEqual(load(JSON.parse(JSON.stringify(config))).activity.hdReward, expected)
  const payload = page.adapter.exportConfig(config)
  const imported = page.adapter.preview(defaults, payload).config
  assert.deepEqual(imported.activity.hdReward, expected)
  const legacy = page.adapter.preview(config, { format: 1, project: 'qhgy', schemaVersion: 1,
    config: { activity: { hdReward: { enabled: false, hd3013DrawEnabled: false } } },
  }).config
  for (const key of fields) assert.equal(legacy.activity.hdReward[key], expected[key])
}
for (const input of ['true', 'false', 1, 0, [], {}, null]) {
  const config = load({ activity: { hdReward: Object.fromEntries(fields.map(key => [key, input])) } })
  for (const key of fields) assert.equal(config.activity.hdReward[key], false)
}
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
for (const key of fields) {
  assert.ok(source.includes(`name="activity.hdReward.${key}"`))
  assert.ok(source.includes(`<Switch v-model:checked="config.activity.hdReward.${key}" />`), '三个开关独立，不依赖仲夏夜开关')
}
for (const label of ['酥饴寄月每日任务领奖', '酥饴寄月制作', '七日签到']) assert.ok(source.includes(`label="${label}"`))
console.log('PASS 月照团圆：32种新旧开关组合保存/分享往返、旧码保留新开关、非法布尔值、三个独立控件')
