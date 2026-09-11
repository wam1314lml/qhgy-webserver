import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const bundle = await build({
  stdin: {
    contents: `export * from './src/pages/game-config/defaultConfig.ts';
      export * from './src/pages/game-config/normalizeConfigSelects.ts';
      export { deepMerge } from './src/pages/game-config/utils.ts';`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { createDefaultGameConfig, normalizeGameConfigSelects, deepMerge } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
)
assert.equal(createDefaultGameConfig().activity.actCardCollect.enabledCardCollect, false)
assert.deepEqual(createDefaultGameConfig().activity.hdReward, { enabled: true, hd3013DrawEnabled: false })
for (const enabled of [true, false]) {
  for (const hd3013DrawEnabled of [true, false]) {
    let saved = deepMerge(createDefaultGameConfig(), { activity: { hdReward: { enabled, hd3013DrawEnabled } } })
    for (let round = 0; round < 3; round++) {
      normalizeGameConfigSelects(saved)
      assert.deepEqual(saved.activity.hdReward, { enabled, hd3013DrawEnabled })
      saved = deepMerge(createDefaultGameConfig(), JSON.parse(JSON.stringify(saved)))
    }
  }
}
const old = deepMerge(createDefaultGameConfig(), { activity: { actCardCollect: { enabledCardCollect: true } } })
normalizeGameConfigSelects(old)
assert.deepEqual(old.activity.hdReward, { enabled: true, hd3013DrawEnabled: false })
assert.equal(old.activity.actCardCollect.enabledCardCollect, true)
const malformed = deepMerge(createDefaultGameConfig(), { activity: { hdReward: { enabled: 'false', hd3013DrawEnabled: 'false' } } })
normalizeGameConfigSelects(malformed)
assert.deepEqual(malformed.activity.hdReward, { enabled: false, hd3013DrawEnabled: false })
for (const enabled of [true, false]) {
  const saved = deepMerge(createDefaultGameConfig(), {
    activity: { actCardCollect: { enabledCardCollect: enabled } },
  })
  normalizeGameConfigSelects(saved)
  const loaded = deepMerge(createDefaultGameConfig(), JSON.parse(JSON.stringify(saved)))
  normalizeGameConfigSelects(loaded)
  assert.equal(loaded.activity.actCardCollect.enabledCardCollect, enabled)
}
const filename = 'src/pages/GameConfigPage.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'card-album-activity-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'card-album-activity-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
const start = source.indexOf(`<div v-if="activeTab === '活动'"`)
assert.ok(start >= 0)
const activity = source.slice(start, source.indexOf('</Form>', start))
assert.deepEqual([...activity.matchAll(/<Divider[^>]*>([^<]+)<\/Divider>/g)].map(match => match[1]), ['卡册活动', '仲夏夜之梦 · 萤夜蝶舞', '甘之如饴'])
// 原有活动控件保持原样；甘之如饴的五项配置由独立专项覆盖。
const existingActivity = activity.slice(0, activity.indexOf('<Divider orientation="left">甘之如饴</Divider>'))
assert.deepEqual([...existingActivity.matchAll(/label="([^"]+)"/g)].map(match => match[1]), ['领取卡册任务奖励', '自动领取任务奖励', '活动抽奖'])
assert.equal([...existingActivity.matchAll(/<Switch\b/g)].length, 3)
assert.match(activity, /v-model:checked="config.activity.hdReward.enabled"/)
assert.match(activity, /v-model:checked="config.activity.hdReward.hd3013DrawEnabled"/)
assert.match(activity, /:disabled="!config.activity.hdReward.enabled"/)
assert.match(activity, /v-model:checked="config.activity.actCardCollect.enabledCardCollect"/)
assert.equal(activity.includes('enabledSmoke'), false)
assert.equal(activity.includes('cyclicNote'), false)
console.log('活动页测试通过：卡册原开关保留、仲夏夜任务默认开启/抽奖默认关闭、禁用关联、旧配置/保存往返和 Vue 编译。')
