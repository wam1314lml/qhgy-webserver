import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build, transform } from 'esbuild'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { compile, computed, createSSRApp, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'

// 两个前端沿用同一检查，执行各自真实页面的模板、保存、加载和快速设置。
const root = fileURLToPath(new URL('../', import.meta.url))
const source = await readFile(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
const taskOptions = source.includes("from './game-config/fmlRaceTaskTypes'")
  ? 'fmlRaceTaskTypes' : 'options'
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/pages/game-config/defaultConfig.ts';
      export * from './src/pages/game-config/normalizeConfigSelects.ts';
      export * from './src/pages/game-config/fmlRaceAcceptRules.ts';
      export * from './src/pages/game-config/${taskOptions}.ts';
      export { deepMerge } from './src/pages/game-config/utils.ts';
    `,
    resolveDir: root,
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const helpers = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const { createDefaultGameConfig, createDefaultFmlRaceAcceptRules } = helpers
const parsed = parse(source, { filename: 'GameConfigPage.vue' })
assert.deepEqual(parsed.errors, [])
const ast = ts.createSourceFile('page.ts', parsed.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const names = [
  'fmlRaceSmallAccountMode', 'fmlRaceCompleteTakenTaskInactiveNotice',
  'handleSmallAccountExclusiveChange', 'saveConfig', 'fetchConfig',
  'resetFmlRaceQuickSetup', 'applyFmlRaceQuickSetup',
]
const declarations = names.map(name => {
  const statement = ast.statements.find(item => ts.isVariableStatement(item)
    && item.declarationList.declarations.some(item => item.name.getText(ast) === name))
  assert.ok(statement, `找不到页面实际声明：${name}`)
  return statement.getText(ast)
})
const executable = await transform(declarations.join('\n'), { loader: 'ts', format: 'cjs' })
const config = ref(createDefaultGameConfig())
let saved
const env = {
  ...helpers, config, computed,
  accountId: ref(1), loading: ref(false),
  fmlRaceQuickSetupStep: ref(1), fmlRaceQuickSetupRules: ref(createDefaultFmlRaceAcceptRules()),
  fmlRaceQuickSetupMembers: ref([]), fmlRaceQuickSetupUseDiamondUpgrade: ref(true),
  fmlRaceQuickSetupVisible: ref(false),
  console: { log() {}, error(...args) { throw new Error(args.join(' ')) } },
  message: { warning(text) { throw new Error(text) }, error(text) { throw new Error(text) } },
  Modal: { error() { throw new Error('配置加载失败') } },
  router: { push() { throw new Error('不应离开配置页') } },
  showConfigNoticeModal() {},
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
const state = new Function(...Object.keys(env), `${executable.code}\nreturn { ${names.join(',')} };`)(...Object.values(env))
const form = source.match(/<CustomFormItem\b[^>]*name="union\.fmlRace\.completeTakenTask"[\s\S]*?<\/CustomFormItem>/)?.[0]
assert.ok(form, '缺少完成已接任务表单')
const modal = source.slice(source.indexOf('<Modal\n      :open="fmlRaceQuickSetupVisible"'))
const quickNotice = modal.match(/<p v-if="fmlRaceSmallAccountMode"[\s\S]*?<\/p>/)?.[0]
assert.ok(quickNotice, '快速设置缺少小号模式说明')
assert.ok(modal.indexOf(quickNotice) < modal.indexOf('fmlRaceQuickSetupStep === 1'), '两个快速设置步骤均须显示说明')

let chooseComplete
async function render(template) {
  const app = createSSRApp({ setup: () => ({ config, ...state }), render: compile(template) })
  app.component('CustomFormItem', {
    props: ['label', 'tooltip'],
    setup: (props, { slots }) => () => h('section', [h('label', props.label), slots.default?.()]),
  })
  app.component('Switch', {
    props: ['checked', 'disabled'], emits: ['update:checked'],
    setup(props, { emit }) {
      chooseComplete = value => emit('update:checked', value)
      return () => h('button', { disabled: props.disabled, 'aria-checked': String(props.checked) })
    },
  })
  return renderToString(app)
}
async function checkUi(active, checked) {
  assert.equal(state.fmlRaceSmallAccountMode.value, active)
  const html = await render(form)
  assert.equal(/<button[^>]*\bdisabled\b/.test(html), active, '禁用必须绑定两个小号子开关')
  assert.ok(html.includes(`aria-checked="${checked}"`), '禁用时仍须显示原勾选值')
  assert.equal(html.includes(state.fmlRaceCompleteTakenTaskInactiveNotice), active)
  assert.equal((await render(quickNotice)).includes(state.fmlRaceCompleteTakenTaskInactiveNotice), active)
}

for (const checked of [false, true]) {
  for (const [upgrade, refresh] of [[false, false], [true, false], [false, true], [true, true]]) {
    config.value = createDefaultGameConfig()
    Object.assign(config.value.union.fmlRace, {
      completeTakenTask: checked, smallAccountExclusiveEnabled: true,
      onlyDiamondUpgradeTask: upgrade, diamondRefreshTask: refresh,
    })
    await checkUi(upgrade || refresh, checked)
    await state.saveConfig()
    assert.equal(saved.union.fmlRace.completeTakenTask, checked, '保存不能清空原勾选')
    config.value = createDefaultGameConfig()
    await state.fetchConfig()
    await checkUi(upgrade || refresh, checked)

    state.resetFmlRaceQuickSetup()
    await state.applyFmlRaceQuickSetup()
    assert.equal(saved.union.fmlRace.completeTakenTask, checked, '快速设置不能清空原勾选')
    assert.equal(saved.union.fmlRace.onlyDiamondUpgradeTask, upgrade)
    assert.equal(saved.union.fmlRace.diamondRefreshTask, refresh)
    await checkUi(upgrade || refresh, checked)

    config.value.union.fmlRace.onlyDiamondUpgradeTask = false
    await checkUi(refresh, checked)
    config.value.union.fmlRace.diamondRefreshTask = false
    await checkUi(false, checked)
    chooseComplete(!checked)
    assert.equal(config.value.union.fmlRace.completeTakenTask, !checked, '普通模式恢复可编辑')
    await state.saveConfig()
    await state.fetchConfig()
    await checkUi(false, !checked)

    config.value.union.fmlRace.onlyDiamondUpgradeTask = true
    config.value.union.fmlRace.diamondRefreshTask = true
    state.handleSmallAccountExclusiveChange(false)
    await checkUi(false, !checked)
    assert.equal(config.value.union.fmlRace.onlyDiamondUpgradeTask, false)
    assert.equal(config.value.union.fmlRace.diamondRefreshTask, false)
  }
}
assert.equal(source.includes('开启“完成已接任务”时优先完成当前任务'), false)
assert.equal(source.includes('开启“完成已接任务”时会优先完成当前任务'), false)
// 复用真实页面保存/加载与 Vue 宿主，覆盖删除子开关，隐藏时不清空。
const keepProgressForm = source.match(/<CustomFormItem\b[^>]*name="union\.fmlRace\.keepProgressTask"[\s\S]*?<\/CustomFormItem>/)?.[0]
assert.ok(keepProgressForm, '缺少不删有进度的任务表单')
config.value = createDefaultGameConfig()
assert.equal(config.value.union.fmlRace.keepProgressTask, false)
assert.equal((await render(keepProgressForm)).includes('<button'), false)
config.value.union.fmlRace.deleteTask = true
for (const keep of [true, false]) {
  await render(keepProgressForm)
  chooseComplete(keep)
  assert.equal(config.value.union.fmlRace.keepProgressTask, keep, '开关绑定实际配置')
  assert.equal(config.value.union.fmlRace.avoidProgressTask, false, '不改变接取进度筛选')
  await state.saveConfig()
  assert.equal(saved.union.fmlRace.keepProgressTask, keep)
  config.value = createDefaultGameConfig()
  await state.fetchConfig()
  assert.ok((await render(keepProgressForm)).includes(`aria-checked="${keep}"`))
  config.value.union.fmlRace.deleteTask = false
  assert.equal((await render(keepProgressForm)).includes('<button'), false)
  assert.equal(config.value.union.fmlRace.keepProgressTask, keep)
  config.value.union.fmlRace.deleteTask = true
}
console.log('竞赛小号界面检查通过：两开关组合、原勾选保留、实际保存/加载、快速设置、关闭模式后恢复及真实 Vue 表单绑定。')
console.log('不删有进度配置通过：显隐、实际开关、保存/加载、隐藏保留及与接取开关独立。')
