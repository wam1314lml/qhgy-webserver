import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build, transform } from 'esbuild'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { compile, createSSRApp, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
const bundle = await build({ stdin: { contents: `
export * from './src/pages/game-config/defaultConfig';
export * from './src/pages/game-config/normalizeConfigSelects';
export * from './src/pages/game-config/fmlRaceAcceptRules';
export * from './src/pages/game-config/utils';
`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'esm' })
const helpers = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const { createDefaultGameConfig, normalizeGameConfigSelects } = helpers
const { adapter: gardenShareAdapter } = await loadSharePageModel(root)
const parsed = parse(source)
assert.deepEqual(parsed.errors, [])
const ast = ts.createSourceFile('page.ts', parsed.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const names = ['saveConfig', 'fetchConfig']
const declarations = names.map(name => ast.statements.find(item => ts.isVariableStatement(item)
  && item.declarationList.declarations.some(item => item.name.getText(ast) === name)).getText(ast))
const executable = await transform(declarations.join('\n'), { loader: 'ts', format: 'cjs' })
const config = ref(createDefaultGameConfig())
let saved
const fail = text => { throw new Error(text) }
const env = { ...helpers, config, accountId: ref(1), loading: ref(false),
  console: { log() {}, error: fail }, message: { warning: fail, error: fail },
  Modal: { error: fail }, router: { push: fail }, showConfigNoticeModal() {},
  axios: {
    async put(url, data) { assert.equal(url, '/api/game-accounts/1/setting'); saved = JSON.parse(JSON.stringify(data)); return { data: { success: true } } },
    async get(url) { assert.equal(url, '/api/game-accounts/1/setting'); return { status: 200, data: { data: structuredClone(saved) } } },
  },
}
const page = new Function(...Object.keys(env), `${executable.code}\nreturn { ${names.join(',')} };`)(...Object.values(env))
const form = name => source.match(new RegExp(`<CustomFormItem\\b[^>]*name="${name.replaceAll('.', '\\.')}"[\\s\\S]*?<\\/CustomFormItem>`))?.[0]
const strategy = form('plant.elves.clearBeforePlant')
const reserve = form('plant.friendSteal.friendCoinReserve')
assert.ok(strategy && reserve)
let choose, setReserve
async function render(template) {
  const app = createSSRApp({ setup: () => ({ config }), render: compile(template) })
  app.component('CustomFormItem', { props: ['label', 'tooltip'], setup: (props, { slots }) => () => h('section', { title: props.tooltip }, [props.label, slots.default?.()]) })
  app.component('Space', { setup: (_, { slots }) => () => h('div', slots.default?.()) })
  app.component('Radio.Group', { props: ['value'], emits: ['update:value'], setup(props, { emit, slots }) {
    choose = value => emit('update:value', value)
    return () => h('div', { 'data-selected': String(props.value) }, slots.default?.())
  } })
  app.component('Radio', { props: ['value'], setup: (props, { slots }) => () => h('input', { type: 'radio', value: String(props.value), 'data-label': slots.default?.()[0]?.children }) })
  app.component('CustomInputNumber', { props: ['value', 'min', 'max', 'step', 'precision'], emits: ['update:value'], setup(props, { emit }) {
    setReserve = value => emit('update:value', value)
    return () => h('input', { type: 'number', ...props })
  } })
  return renderToString(app)
}

assert.equal((await render(strategy)).includes('type="radio"'), false)
config.value.plant.elves.enabled = true
let html = await render(strategy)
assert.ok(html.includes('data-selected="true"'))
assert.equal((html.match(/type="radio"/g) || []).length, 2)
assert.ok(html.includes('全部铲完种') && html.includes('等待收获完成种'))
assert.ok(!strategy.includes('<Switch'))
assert.ok(html.includes('保留目标主副果、成熟地块、已生成果灵和竞赛需求作物'))
choose(false)
assert.equal(config.value.plant.elves.clearBeforePlant, false)
config.value.plant.elves.enabled = false
assert.equal((await render(strategy)).includes('type="radio"'), false)
config.value.plant.elves.enabled = true
assert.ok((await render(strategy)).includes('data-selected="false"'))

assert.equal((await render(reserve)).includes('type="number"'), false)
config.value.plant.friendSteal.buyStealEnabled = true
html = await render(reserve)
assert.ok(html.includes('min="0"') && html.includes('max="9999"'))
assert.ok(html.includes('value="0"') && html.includes('precision="0"'))
setReserve(200)
assert.equal(config.value.plant.friendSteal.friendCoinReserve, 200)
config.value.plant.friendSteal.buyStealEnabled = false
assert.equal((await render(reserve)).includes('type="number"'), false)
assert.equal(config.value.plant.friendSteal.friendCoinReserve, 200)

for (const strategyValue of [true, false]) {
  for (const amount of [0, 200, 9999]) {
    config.value.plant.elves.clearBeforePlant = strategyValue
    config.value.plant.friendSteal.friendCoinReserve = amount
    await page.saveConfig()
    config.value = createDefaultGameConfig()
    await page.fetchConfig()
    assert.equal(config.value.plant.elves.clearBeforePlant, strategyValue)
    assert.equal(config.value.plant.friendSteal.friendCoinReserve, amount)
    const imported = gardenShareAdapter.preview(createDefaultGameConfig(), gardenShareAdapter.exportConfig(config.value)).config
    assert.equal(imported.plant.elves.clearBeforePlant, strategyValue)
    assert.equal(imported.plant.friendSteal.friendCoinReserve, amount)
    const old = gardenShareAdapter.preview(imported, { format: 1, project: 'qhgy', schemaVersion: 1, config: { basic: { mail: true } } }).config
    assert.equal(old.plant.elves.clearBeforePlant, strategyValue)
    assert.equal(old.plant.friendSteal.friendCoinReserve, amount)
  }
}
for (const [raw, expected] of [[undefined, 0], [null, 0], ['', 0], ['200', 200], [-1, 0], [200.9, 200], [10000, 9999], ['bad', 0], [Infinity, 0]]) {
  config.value.plant.friendSteal.friendCoinReserve = raw
  normalizeGameConfigSelects(config.value)
  assert.equal(config.value.plant.friendSteal.friendCoinReserve, expected)
}
saved = { plant: { elves: { enabled: true }, friendSteal: { buyStealEnabled: true } } }
await page.fetchConfig()
assert.equal(config.value.plant.elves.clearBeforePlant, true)
assert.equal(config.value.plant.friendSteal.friendCoinReserve, 0)
console.log('果灵策略/友情币保留：真实 Vue 显隐与双向绑定、页面保存加载、分享/旧码保留及边界归一化通过')
