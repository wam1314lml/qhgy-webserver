import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

// 配置函数内存打包执行：不运行浏览器、后台接口、游戏账号或网络。
const bundle = await build({
  stdin: {
    contents: `export * from './src/pages/game-config/defaultConfig.ts';
      export * from './src/pages/game-config/normalizeConfigSelects.ts';
      export { deepMerge } from './src/pages/game-config/utils.ts';
      export { actElimSpeedOptions } from './src/pages/game-config/options.ts';`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { createDefaultGameConfig, normalizeGameConfigSelects, deepMerge, actElimSpeedOptions } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`,
)
const expectedDefaults = {
  enabled: false, autoClaimEnergy: false, speed: 1,
}
assert.deepEqual(createDefaultGameConfig().activity.actElim, expectedDefaults)
assert.deepEqual(actElimSpeedOptions.map(option => option.value), [1, 5, 10, 25, 100], '配置必须保存真实倍率，不保存 model 档位')
const normalize = (input = {}) => {
  const config = deepMerge(createDefaultGameConfig(), { activity: { actElim: input } })
  normalizeGameConfigSelects(config)
  return config
}
assert.deepEqual(normalize().activity.actElim, expectedDefaults)
assert.deepEqual(normalize({ enabled: true, speed: 25 }).activity.actElim, {
  ...expectedDefaults, enabled: true, speed: 25,
}, '配置只保留用户可设置的三个字段')

for (const enabled of [true, false]) {
  for (const autoClaimEnergy of [true, false]) {
    for (const simpleMode of [true, false]) {
      for (const speed of [1, 5, 10, 25, 100]) {
        for (const maxScorePerMove of [1, 1000, 1000000]) {
          const settings = { enabled, autoClaimEnergy, simpleMode, speed, maxScorePerMove }
          let config = normalize(settings)
          for (let round = 0; round < 3; round++) {
            assert.deepEqual(config.activity.actElim, { enabled, autoClaimEnergy, speed })
            assert.deepEqual(config.activity.hdReward, { enabled: true, hd3013DrawEnabled: false })
            assert.equal(config.activity.actCardCollect.enabledCardCollect, false)
            config = deepMerge(createDefaultGameConfig(), JSON.parse(JSON.stringify(config)))
            normalizeGameConfigSelects(config)
          }
        }
      }
    }
  }
}
for (const speed of ['1', '5', '10', '25', '100']) {
  assert.equal(normalize({ speed }).activity.actElim.speed, Number(speed))
}
for (const speed of [0, 2, 3, 4, 6, 50, 101, -1, 1.5, 'bad', Infinity]) {
  assert.equal(normalize({ speed }).activity.actElim.speed, 1)
}
for (const input of [undefined, null, true, false, 0, 500, 1000, 1000000, '', ' ', 'bad', Infinity, NaN, {}, []]) {
  const config = createDefaultGameConfig()
  config.activity.actElim.maxScorePerMove = input
  normalizeGameConfigSelects(config)
  assert.equal(Object.hasOwn(config.activity.actElim, 'maxScorePerMove'), false, '历史或手工上限不再保存')
}
for (const input of ['true', 'false', 1, 0, null]) {
  const normalized = normalize({ enabled: input, autoClaimEnergy: input, simpleMode: input }).activity.actElim
  assert.equal(normalized.enabled, false)
  assert.equal(normalized.autoClaimEnergy, false)
  assert.equal(Object.hasOwn(normalized, 'simpleMode'), false, '历史简易模式设置不再保存')
}

const filename = 'src/pages/GameConfigPage.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'act-elim-config-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'act-elim-config-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
const start = source.indexOf('<Divider orientation="left">甘之如饴</Divider>')
assert.ok(start > source.indexOf(`<div v-if="activeTab === '活动'"`))
const panel = source.slice(start, source.indexOf('</Form>', start))
assert.deepEqual([...panel.matchAll(/name="activity\.actElim\.([^\"]+)"/g)].map(match => match[1]), [
  'enabled', 'autoClaimEnergy', 'speed',
])
for (const field of ['enabled', 'autoClaimEnergy', 'speed']) {
  const block = panel.match(new RegExp(`<CustomFormItem[^>]*name="activity\\.actElim\\.${field}"[\\s\\S]*?</CustomFormItem>`))?.[0]
  assert.ok(block, field)
  assert.match(block, new RegExp(`v-model:(?:checked|value)="config\\.activity\\.actElim\\.${field}"`))
  if (field !== 'enabled') assert.match(block, /:disabled="!config\.activity\.actElim\.enabled"/)
}
assert.match(panel, /:options="actElimSpeedOptions"/)
assert.match(panel, /每日任务完成后的体力奖励，以及已耗体力达标的进度奖励/)
assert.match(panel, /label="最高倍率"/)
assert.match(panel, /按解锁积分与脚本内部策略自动降档/)
assert.doesNotMatch(panel, /simpleMode|maxScorePerMove|简易模式|分数上限/)
assert.match(source, /normalizeGameConfigSelects\(config\.value\)[\s\S]*?axios\.put\(`\/api\/game-accounts\/\$\{accountId\.value\}\/setting`, config\.value\)/)
assert.match(source, /deepMerge\(createDefaultGameConfig\(\), sourceResponse\.data\.data\)[\s\S]*?normalizeGameConfigSelects\(payload\)/)

console.log('甘之如饴前端测试通过：仅三个配置项、内部策略字段清理、保存导入往返、真实倍率、其他活动隔离及Vue编译（全离线）。')
