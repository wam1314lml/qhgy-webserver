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
assert.deepEqual([...activity.matchAll(/<Divider[^>]*>([^<]+)<\/Divider>/g)].map(match => match[1]), ['卡册活动'])
assert.deepEqual([...activity.matchAll(/label="([^"]+)"/g)].map(match => match[1]), ['领取卡册任务奖励'])
assert.equal([...activity.matchAll(/<Switch\b/g)].length, 1)
assert.match(activity, /v-model:checked="config.activity.actCardCollect.enabledCardCollect"/)
assert.equal(activity.includes('enabledSmoke'), false)
assert.equal(activity.includes('cyclicNote'), false)
console.log('卡册活动测试通过：活动页仅一个开关、默认关闭、保存往返和 Vue 编译。')
