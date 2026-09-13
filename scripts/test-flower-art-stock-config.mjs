import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

// 离线验证配置加载、保存与导入，不访问账号、接口或游戏服务。
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
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`,
)
const load = (setting = {}) => {
  const config = deepMerge(createDefaultGameConfig(), setting)
  normalizeGameConfigSelects(config)
  return config
}

for (const config of [createDefaultGameConfig(), load(), load({ plant: { artSell: {} } })]) {
  assert.equal(config.plant.artSell.stockFirst, false, '旧账号和新配置默认不清仓')
  assert.equal(config.plant.artSell.makeWhenInsufficient, true, '旧账号缺字段默认保持常规补做')
}

for (const autoSellArt of [false, true]) {
  for (const stockFirst of [false, true]) {
    for (const makeWhenInsufficient of [false, true]) {
      for (const artFirstMake of [false, true]) {
        let config = load({ plant: { artSell: {
          autoSellArt, stockFirst, makeWhenInsufficient, artFirstMake,
        } } })
        const independentSettings = JSON.stringify({ order: config.order, union: config.union })
        for (let round = 0; round < 3; round++) {
          assert.equal(config.plant.artSell.autoSellArt, autoSellArt)
          assert.equal(config.plant.artSell.stockFirst, stockFirst)
          assert.equal(config.plant.artSell.makeWhenInsufficient, makeWhenInsufficient, '保存/导入保留显式 false')
          assert.equal(config.plant.artSell.artFirstMake, artFirstMake, '常规补做与首做互不改写')
          assert.equal(JSON.stringify({ order: config.order, union: config.union }), independentSettings)
          config = load(JSON.parse(JSON.stringify(config)))
        }
      }
    }
  }
}

for (const input of [undefined, null, 'true', 'false', 0, 1, '', [], {}]) {
  const config = load({ plant: { artSell: { stockFirst: input, makeWhenInsufficient: input } } })
  assert.equal(config.plant.artSell.stockFirst, false, '只有布尔 true 开启清仓')
  assert.equal(config.plant.artSell.makeWhenInsufficient, true, '只有布尔 false 关闭常规补做')
}

const missing = createDefaultGameConfig()
delete missing.plant.artSell.stockFirst
delete missing.plant.artSell.makeWhenInsufficient
normalizeGameConfigSelects(missing)
assert.equal(missing.plant.artSell.stockFirst, false)
assert.equal(missing.plant.artSell.makeWhenInsufficient, true)

const filename = 'src/pages/GameConfigPage.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'flower-art-stock-config-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'flower-art-stock-config-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
const start = source.indexOf('<Divider orientation="left">果艺上架</Divider>')
const panel = source.slice(start, source.indexOf('<Divider orientation="left">花贸市场</Divider>', start))
for (const field of ['stockFirst', 'makeWhenInsufficient', 'artFirstMake']) {
  const block = panel.match(new RegExp(`<CustomFormItem[^>]*name="plant\\.artSell\\.${field}"[\\s\\S]*?</CustomFormItem>`))?.[0]
  assert.ok(block, field)
  assert.match(block, new RegExp(`v-model:checked="config\\.plant\\.artSell\\.${field}"`))
}
assert.match(panel, /一次性清理全部已有果艺/)
assert.match(panel, /果艺首做及顾客、公会任务制作仍由各自开关控制/)
assert.match(panel, /关闭再开启或重启脚本会重新清仓/)
assert.match(source, /deepMerge\(createDefaultGameConfig\(\), response\.data\.data\)[\s\S]*?normalizeGameConfigSelects\(mergedConfig\)/)
assert.match(source, /normalizeGameConfigSelects\(config\.value\)[\s\S]*?axios\.put\(`\/api\/game-accounts\/\$\{accountId\.value\}\/setting`, config\.value\)/)
assert.match(source, /deepMerge\(createDefaultGameConfig\(\), sourceResponse\.data\.data\)[\s\S]*?normalizeGameConfigSelects\(payload\)/)

console.log('果艺库存配置测试通过：旧账号默认值、显式 false 保存/导入、库存优先与常规补做/首做独立、实际表单绑定和 Vue 编译（全离线）。')
