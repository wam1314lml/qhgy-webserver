import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build, transform } from 'esbuild'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { compile, createSSRApp, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { loadSharePageModel } from './config-share-page-model.mjs'

// 执行真实页面的表单、保存/加载及分享代码，Axios使用内存替身。
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
export * from './src/pages/game-config/defaultConfig';
export * from './src/pages/game-config/normalizeConfigSelects';
export * from './src/pages/game-config/fmlRaceAcceptRules';
export * from './src/pages/game-config/utils';

`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'esm' })
const helpers = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const { adapter: shareAdapter } = await loadSharePageModel(root)
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
const parsed = parse(source)
assert.deepEqual(parsed.errors, [])
const ast = ts.createSourceFile('page.ts', parsed.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const names = ['clampInteger', 'handleFlowerDelayedHarvestMinutesBlur', 'saveConfig', 'fetchConfig']
const declarations = names.map(name => {
  const statement = ast.statements.find(item => ts.isVariableStatement(item)
    && item.declarationList.declarations.some(item => item.name.getText(ast) === name))
  assert.ok(statement, '缺少页面函数 ' + name)
  return statement.getText(ast)
})
const executable = await transform(declarations.join('\n'), { loader: 'ts', format: 'cjs' })
const config = ref(helpers.createDefaultGameConfig())
config.value.plant.flower.harvestEnabled = true
let saved = {}, choose, minutesInput
const fail = text => { throw new Error(String(text)) }
const env = { ...helpers, config, accountId: ref(1), loading: ref(false),
  console: { log() {}, error: fail }, message: { warning: fail, error: fail },
  Modal: { error: fail }, router: { push: fail }, showConfigNoticeModal() {},
  axios: {
    async put(url, value) {
      assert.equal(url, '/api/game-accounts/1/setting')
      saved = JSON.parse(JSON.stringify(value))
      return { data: { success: true } }
    },
    async get(url) {
      assert.equal(url, '/api/game-accounts/1/setting')
      return { status: 200, data: { data: structuredClone(saved) } }
    },
  },
}
const page = new Function(...Object.keys(env), executable.code + '\nreturn {saveConfig,fetchConfig,handleFlowerDelayedHarvestMinutesBlur};')(...Object.values(env))
const form = source.match(/<CustomFormItem\b[^>]*name="plant\.flower\.delayedHarvestEnabled"[\s\S]*?<\/CustomFormItem>/)?.[0]
assert.ok(form, '缺少普通延迟收获表单')
const minuteForm = source.match(/<CustomFormItem\b[^>]*name="plant\.flower\.delayedHarvestMinutes"[\s\S]*?<\/CustomFormItem>/)?.[0]
assert.ok(minuteForm)
assert.ok(source.indexOf('name="plant.flower.delayedHarvestEnabled"') > source.indexOf('name="plant.flower.harvestEnabled"'))
assert.ok(source.indexOf('name="plant.flower.delayedHarvestEnabled"') < source.indexOf('name="plant.flower.videoSpeedUp"'))
assert.match(form, /v-if="config\.plant\.flower\.harvestEnabled"/)
assert.match(minuteForm, /v-if="config\.plant\.flower\.harvestEnabled && config\.plant\.flower\.delayedHarvestEnabled"/)
assert.match(form, /class="config-sub-item"/)
const app = createSSRApp({ setup: () => ({ config, handleFlowerDelayedHarvestMinutesBlur: page.handleFlowerDelayedHarvestMinutesBlur }), render: compile(form + minuteForm) })
app.component('CustomFormItem', { props: ['label'], setup: (props, { slots }) =>
  () => h('section', [h('label', props.label), slots.default?.()]) })
app.component('Switch', {
  props: ['checked'], emits: ['update:checked'],
  setup(props, { emit }) {
    choose = value => emit('update:checked', value)
    return () => h('button', { 'aria-checked': String(props.checked) })
  },
})
app.component('CustomInputNumber', {
  props: ['value', 'min', 'max'], emits: ['update:value', 'blur'],
  setup(props, { emit }) {
    assert.equal(props.min, 1); assert.equal(props.max, 999)
    minutesInput = value => { emit('update:value', value); emit('blur') }
    return () => h('input', { value: props.value })
  },
})
assert.ok((await renderToString(app)).includes('延迟收获'))
assert.equal((await renderToString(app)).includes('延迟时间（分）'), false)
assert.equal(config.value.plant.flower.delayedHarvestEnabled, false)
for (const enabled of [true, false]) {
  choose(enabled)
  assert.equal(config.value.plant.flower.delayedHarvestEnabled, enabled)
  const rendered = await renderToString(app)
  assert.equal(rendered.includes('延迟时间（分）'), enabled)
  if (enabled) { minutesInput('25'); assert.equal(config.value.plant.flower.delayedHarvestMinutes, 25) }
  await page.saveConfig()
  assert.equal(saved.plant.flower.delayedHarvestMinutes, 25)
  assert.equal(saved.plant.flower.delayedHarvestEnabled, enabled)
  config.value = helpers.createDefaultGameConfig()
  await page.fetchConfig()
  assert.equal(config.value.plant.flower.delayedHarvestEnabled, enabled)
}
saved = { plant: { elves: { delayedHarvestEnabled: true, delayedHarvestMinutes: 20 } } }
await page.fetchConfig()
assert.equal(config.value.plant.flower.delayedHarvestEnabled, false)
assert.equal(config.value.plant.flower.delayedHarvestMinutes, 10)
assert.equal(config.value.plant.elves.delayedHarvestEnabled, true)
assert.equal(config.value.plant.elves.delayedHarvestMinutes, 20)
for (const value of [undefined, null, false, 'false', 'true', 0, 1, true]) {
  const current = helpers.createDefaultGameConfig()
  current.plant.flower.delayedHarvestEnabled = value
  helpers.normalizeGameConfigSelects(current)
  assert.equal(current.plant.flower.delayedHarvestEnabled, value === true)
}
const current = helpers.createDefaultGameConfig()
current.plant.flower.delayedHarvestEnabled = true
current.plant.flower.delayedHarvestMinutes = 25
const exported = shareAdapter.exportConfig(current)
assert.equal(exported.config.plant.flower.delayedHarvestEnabled, true)
const shared = shareAdapter.preview(helpers.createDefaultGameConfig(), exported)
assert.equal(shared.config.plant.flower.delayedHarvestEnabled, true)
const old = shareAdapter.exportConfig(helpers.createDefaultGameConfig())
delete old.config.plant.flower.delayedHarvestEnabled
delete old.config.plant.flower.delayedHarvestMinutes
assert.equal(shareAdapter.preview(current, old).config.plant.flower.delayedHarvestEnabled, true)
for (const [value, expected] of [[0, 1], [-1, 1], [2.8, 2], ['5', 5], [1000, 999], ['bad', 10]]) {
  const test = helpers.createDefaultGameConfig(); test.plant.flower.delayedHarvestMinutes = value
  helpers.normalizeGameConfigSelects(test)
  assert.equal(test.plant.flower.delayedHarvestMinutes, expected)
}
assert.equal(shareAdapter.preview(current, old).config.plant.flower.delayedHarvestMinutes, 25)
console.log('普通延迟收获前端检查通过：实际Vue开关、保存/重载、旧账号默认值、严格布尔及分享兼容')
