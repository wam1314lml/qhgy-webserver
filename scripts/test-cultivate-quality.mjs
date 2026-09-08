import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const bundle = await build({
  stdin: {
    contents: `export * from './src/pages/game-config/defaultConfig.ts';
      export * from './src/pages/game-config/normalizeConfigSelects.ts';
      export { deepMerge } from './src/pages/game-config/utils.ts';
      export { flowerQualityOptions } from './src/pages/game-config/options.ts';`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { createDefaultGameConfig, normalizeGameConfigSelects, deepMerge, flowerQualityOptions } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`,
)
assert.deepEqual(flowerQualityOptions, [
  { label: '绿', value: 1 }, { label: '蓝', value: 2 }, { label: '紫', value: 3 },
  { label: '金', value: 4 }, { label: '红', value: 5 },
])
const defaults = createDefaultGameConfig()
assert.equal(defaults.plant.cultivate.cultivateQualityEnabled, false)
assert.deepEqual(defaults.plant.cultivate.cultivateQualities, [1, 2, 3, 4, 5])

// 普通保存、重新加载及导入配置采用同一合并/归一化流程；显式空数组不得被默认值补满。
for (const enabled of [true, false]) {
  for (const qualityEnabled of [true, false]) {
    for (const qualities of [[1, 2, 3, 4, 5], [2, 4], []]) {
      let config = deepMerge(createDefaultGameConfig(), {
        plant: { cultivate: {
          enabled, cultivateQualityEnabled: qualityEnabled, cultivateQualities: qualities,
          videoSpeedUp: true, upgradeEnabled: true, upgradeQualityEnabled: true, upgradeQualities: [5],
        } },
      })
      for (let round = 0; round < 3; round++) {
        normalizeGameConfigSelects(config)
        assert.equal(config.plant.cultivate.cultivateQualityEnabled, qualityEnabled)
        assert.deepEqual(config.plant.cultivate.cultivateQualities, qualities)
        assert.equal(config.plant.cultivate.autoHarvestEnabled, enabled)
        assert.equal(config.plant.cultivate.videoSpeedUp, true)
        assert.equal(config.plant.cultivate.upgradeEnabled, true)
        assert.equal(config.plant.cultivate.upgradeQualityEnabled, true)
        assert.deepEqual(config.plant.cultivate.upgradeQualities, [5])
        config = deepMerge(createDefaultGameConfig(), JSON.parse(JSON.stringify(config)))
      }
    }
  }
}

const oldConfig = deepMerge(createDefaultGameConfig(), { plant: { cultivate: { enabled: true } } })
normalizeGameConfigSelects(oldConfig)
assert.equal(oldConfig.plant.cultivate.cultivateQualityEnabled, false)
assert.deepEqual(oldConfig.plant.cultivate.cultivateQualities, [1, 2, 3, 4, 5])

const mixed = deepMerge(createDefaultGameConfig(), { plant: { cultivate: {
  cultivateQualityEnabled: true,
  cultivateQualities: ['2', 4, ' 2 ', 5, 0, 6, 1.5, 'bad', true, null],
} } })
normalizeGameConfigSelects(mixed)
assert.deepEqual(mixed.plant.cultivate.cultivateQualities, [2, 4, 5])
mixed.plant.cultivate.cultivateQualities = [0, 6, 'bad', false]
normalizeGameConfigSelects(mixed)
assert.deepEqual(mixed.plant.cultivate.cultivateQualities, [], '无效品质全部排除后不能自动变成绿/全部')
mixed.plant.cultivate.cultivateQualityEnabled = 'false'
normalizeGameConfigSelects(mixed)
assert.equal(mixed.plant.cultivate.cultivateQualityEnabled, false)

const filename = 'src/pages/GameConfigPage.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'cultivate-quality-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'cultivate-quality-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])

const qualityToggle = source.match(/<CustomFormItem\s+label="指定品质"\s+name="plant\.cultivate\.cultivateQualityEnabled"[\s\S]*?<\/CustomFormItem>/)?.[0]
const qualitySelect = source.match(/<CustomFormItem\s+label="选择品质"\s+name="plant\.cultivate\.cultivateQualities"[\s\S]*?<\/CustomFormItem>/)?.[0]
assert.ok(qualityToggle && qualitySelect)
assert.match(qualityToggle, /v-if="config\.plant\.cultivate\.enabled"/)
assert.match(qualityToggle, /v-model:checked="config\.plant\.cultivate\.cultivateQualityEnabled"/)
assert.match(qualitySelect, /config\.plant\.cultivate\.enabled\s*&&\s*config\.plant\.cultivate\.cultivateQualityEnabled/)
assert.match(qualitySelect, /v-model:value="config\.plant\.cultivate\.cultivateQualities"/)
assert.match(qualitySelect, /mode="multiple"/)
assert.match(qualitySelect, /:options="flowerQualityOptions"/)
assert.match(qualitySelect, /:allow-empty="true"/)
assert.match(qualitySelect, /未选择品质时不开始新培育/)
assert.ok(source.indexOf(qualityToggle) < source.indexOf('name="plant.cultivate.autoHarvestEnabled"'))
assert.match(source, /name="plant\.cultivate\.upgradeQualityEnabled"/)
assert.match(source, /normalizeGameConfigSelects\(config\.value\)[\s\S]*?axios\.put\(`\/api\/game-accounts\/\$\{accountId\.value\}\/setting`, config\.value\)/)
assert.match(source, /deepMerge\(createDefaultGameConfig\(\), sourceResponse\.data\.data\)[\s\S]*?normalizeGameConfigSelects\(payload\)/)
const quickSetup = source.slice(source.indexOf('const applyFmlRaceQuickSetup'), source.indexOf('const handleFmlRaceQuickSetupConfirm'))
assert.equal(quickSetup.includes('plant.cultivate'), false, '公会快速设置不能清除培育品质')

console.log('培育品质前端测试通过：默认关闭、五色映射、开关联动、空选择保留、过滤非法值、保存/导入往返、升级加速隔离及 Vue 编译。')
