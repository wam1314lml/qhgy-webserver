import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { compileScript, parse } from '@vue/compiler-sfc'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/features/config-share/core'; export * from './src/features/config-share/project';
  export { createDefaultGameConfig } from './src/pages/game-config/defaultConfig';
  export { normalizeGameConfigSelects } from './src/pages/game-config/normalizeConfigSelects';
  export { deepMerge } from './src/pages/game-config/utils';
`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'esm' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const page = await loadSharePageModel(root), adapter = page.adapter, project = m.shareProject
const clone = value => JSON.parse(JSON.stringify(value)), fresh = () => clone(page.current)
const payload = config => ({ format: 1, project: project.id, schemaVersion: 1, config })
let count = 0
function test(name, fn) { fn(); count++; console.log(`PASS ${name}`) }
function firstBoolean(rule, path = []) {
  if (rule.type === 'boolean') return path
  if (rule.type === 'object') for (const [key, child] of Object.entries(rule.properties)) { const result = firstBoolean(child, [...path, key]); if (result) return result }
}
const fixturePath = firstBoolean(project.schema)
const fixtureConfig = value => fixturePath.reduceRight((child, key) => ({ [key]: child }), value)
const valueAt = (value, path) => path.reduce((current, key) => current?.[key], value)
test('真实页面默认配置可分享、导入，原对象不被修改', () => {
  const original = fresh(), before = clone(original), exported = adapter.exportConfig(original)
  const result = adapter.preview(original, exported)
  assert.deepEqual(original, before)
  assert.deepEqual(adapter.exportConfig(result.config), exported)
})
test('旧码仅改现有字段，新字段及当前其他设置保留', () => {
  const current = fresh(); current.futureModule = { enabled: true }
  const desired = !valueAt(current, fixturePath)
  const result = adapter.preview(current, payload(fixtureConfig(desired)))
  assert.equal(valueAt(result.config, fixturePath), desired)
  assert.deepEqual(result.config.futureModule, current.futureModule)
  const expected = m.mergeConfig(current, fixtureConfig(desired), project.schema).config
  assert.deepEqual(result.config, expected)
})

test('平台奖励旧配置默认开启，关闭保存/分享可往返，旧码保留当前开关', () => {
  const load = setting => {
    const config = m.deepMerge(m.createDefaultGameConfig(), setting)
    m.normalizeGameConfigSelects(config)
    return config
  }
  assert.equal(fresh().basic.benefit.platformRwd, true)
  for (const setting of [{}, { basic: { benefit: {} } }]) {
    assert.equal(load(setting).basic.benefit.platformRwd, true)
  }
  for (const value of [false, true]) {
    let config = load({ basic: { benefit: { platformRwd: value } } })
    for (let round = 0; round < 3; round++) {
      assert.equal(config.basic.benefit.platformRwd, value)
      config = load(clone(config))
    }
    const shared = adapter.exportConfig(config)
    assert.equal(shared.config.basic.benefit.platformRwd, value)
    const imported = adapter.preview(fresh(), shared).config
    assert.equal(imported.basic.benefit.platformRwd, value)
    const old = adapter.preview(imported, payload({ basic: { benefit: { buff: true } } })).config
    assert.equal(old.basic.benefit.platformRwd, value)
    assert.equal(old.basic.benefit.buff, true)
  }
})
test('铲除后种植旧配置默认开启，显式关闭和旧分享码不会被重置', () => {
  const missing = fresh()
  delete missing.plant.elves.clearBeforePlant
  m.normalizeGameConfigSelects(missing)
  assert.equal(missing.plant.elves.clearBeforePlant, true)
  for (const enabled of [false, true]) {
    const current = fresh()
    current.plant.elves.clearBeforePlant = enabled
    m.normalizeGameConfigSelects(current)
    assert.equal(current.plant.elves.clearBeforePlant, enabled)
    const shared = adapter.exportConfig(current)
    assert.equal(shared.config.plant.elves.clearBeforePlant, enabled)
    const imported = adapter.preview(fresh(), shared).config
    assert.equal(imported.plant.elves.clearBeforePlant, enabled)
    const old = adapter.preview(imported, payload({
      plant: { elves: { delayedHarvestEnabled: true } },
    })).config
    assert.equal(old.plant.elves.clearBeforePlant, enabled)
    assert.equal(old.plant.elves.delayedHarvestEnabled, true)
    const reloaded = JSON.parse(JSON.stringify(old))
    m.normalizeGameConfigSelects(reloaded)
    assert.equal(reloaded.plant.elves.clearBeforePlant, enabled)
  }
})

test('竞赛不删有进度默认关闭，新码保留真假、旧码保留当前值，接取开关独立', () => {
  const missing = fresh()
  delete missing.union.fmlRace.keepProgressTask
  m.normalizeGameConfigSelects(missing)
  assert.equal(missing.union.fmlRace.keepProgressTask, false)
  for (const keep of [false, true]) {
    for (const avoid of [false, true]) {
      const current = fresh()
      Object.assign(current.union.fmlRace, { keepProgressTask: keep, avoidProgressTask: avoid })
      m.normalizeGameConfigSelects(current)
      const shared = adapter.exportConfig(current)
      assert.equal(shared.config.union.fmlRace.keepProgressTask, keep)
      const imported = adapter.preview(fresh(), shared).config
      assert.equal(imported.union.fmlRace.keepProgressTask, keep)
      assert.equal(imported.union.fmlRace.avoidProgressTask, avoid)
      const old = adapter.preview(imported, payload({ union: { fmlRace: { deleteTask: true } } })).config
      assert.equal(old.union.fmlRace.keepProgressTask, keep)
      const reloaded = m.deepMerge(m.createDefaultGameConfig(), clone(old))
      m.normalizeGameConfigSelects(reloaded)
      assert.equal(reloaded.union.fmlRace.keepProgressTask, keep)
    }
  }
})

test('项目名和24小时时限，整段与裸码解析、跨项目拒绝', () => {
  const result = { code: 'aBcdEF12_345-789', createdAt: Date.UTC(2026, 8, 14), expiresAt: Date.UTC(2026, 8, 15) }
  const text = m.formatShareText(result, project)
  assert.ok(text.startsWith(`杰尼龟~${project.name}~`)); assert.match(text, /有效期:24小时/)
  assert.equal(m.parseShareText(text, project), result.code)
  assert.equal(m.parseShareText(result.code, project), result.code)
  assert.throws(() => m.parseShareText(text, { ...project, name: '其他项目' }))
  assert.throws(() => adapter.preview(fresh(), { ...payload(fixtureConfig(true)), project: 'other' }))
})
test('密码/凭据排除，正常Token/Secret业务字段保留', () => {
  const rule = m.buildSchema({ password: '', accessToken: '', secret: '', secretTower: false, expeditionUseSoldierTokenEnabled: false }, {})
  const value = m.sanitizeConfig({ password: 'private', accessToken: 'private', secret: 'private', secretTower: true, expeditionUseSoldierTokenEnabled: true }, rule).config
  assert.deepEqual(value, { secretTower: true, expeditionUseSoldierTokenEnabled: true })
  const shared = adapter.exportConfig(fresh())
  assert.equal(JSON.stringify(shared.config).includes('putFlowerPassword'), false)
})
test('高级JSON保持结构并过滤嵌套凭据、原型污染及超限拒绝', () => {
  const rule = { type: 'object', properties: { advanced: { type: 'json' } } }
  assert.deepEqual(m.sanitizeConfig({ advanced: { teams: [[1, 'two']], nested: { password: 'x', enabled: true } } }, rule).config,
    { advanced: { teams: [[1, 'two']], nested: { enabled: true } } })
  assert.throws(() => m.sanitizeConfig(JSON.parse('{"advanced":{"__proto__":{}}}'), rule))
  assert.throws(() => m.assertSafeJson({ list: Array(250).fill('字'.repeat(256)) }))
})
test('false/0/空列表覆盖，固定对象叶子合并', () => {
  const rule = m.buildSchema({ a: { enabled: true, n: 4 }, list: [1] }, {})
  assert.deepEqual(m.mergeConfig({ a: { enabled: true, n: 4, future: 7 }, list: [1] }, { a: { enabled: false, n: 0 }, list: [] }, rule).config,
    { a: { enabled: false, n: 0, future: 7 }, list: [] })
  assert.throws(() => adapter.preview(fresh(), payload(fixtureConfig('wrong-type'))))
})

const source = await readFile(new URL('../src/features/config-share/ConfigShareDialog.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const compiled = compileScript(descriptor, { id: 'config-share-test', inlineTemplate: true })
assert.ok(compiled.content.includes('读取并预览'))
// 实际 SFC 逻辑/模板 + 内存渲染宿主，网络与 Ant 外观替身；不需要真实账号。
const uiBundle = await build({
  stdin: { contents: compiled.content, resolveDir: fileURLToPath(new URL('../src/features/config-share/', import.meta.url)), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  plugins: [{ name: 'ant-test-host', setup(build) {
    build.onResolve({ filter: /^ant-design-vue$/ }, () => ({ path: 'ant', namespace: 'test' }))
    build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
      import { defineComponent, h } from 'vue';
      const wrapper = (name, props = []) => defineComponent({ props, setup(p, { attrs, slots }) { return () => name === 'modal' && !p.open ? null : h(name, attrs, slots.default?.()) } });
      export const Modal = wrapper('modal', ['open']);
      export const Tabs = wrapper('tabs'); Tabs.TabPane = wrapper('tab');
      export const Button = wrapper('button');
      export const Alert = defineComponent({ props: ['message'], setup(p) { return () => h('alert', p.message) } });
      export const Input = {}; Input.TextArea = defineComponent({ props: ['value'], emits: ['update:value'], setup(p, { attrs, emit }) { return () => h('textarea', { ...attrs, value: p.value, onInput: e => emit('update:value', e.target.value) }) } });
      export const message = { success() {}, info() {} };
    ` }))
  } }],
})
const require = createRequire(import.meta.url)
const uiModule = { exports: {} }
new Function('require', 'module', 'exports', uiBundle.outputFiles[0].text)(require, uiModule, uiModule.exports)
const { createRenderer, h, shallowRef, ref, nextTick } = require('vue')
const node = (type, text = '') => ({ type, text, props: {}, children: [], parent: null })
const renderer = createRenderer({
  createElement: type => node(type), createText: text => node('text', text), createComment: text => node('comment', text),
  setText: (item, text) => { item.text = text }, setElementText: (item, text) => { item.text = text; item.children = [] },
  patchProp: (item, key, _before, after) => { item.props[key] = after },
  insert(item, parent, anchor = null) { if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1); item.parent = parent; const at = anchor ? parent.children.indexOf(anchor) : -1; if (at < 0) parent.children.push(item); else parent.children.splice(at, 0, item) },
  remove(item) { if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1) },
  parentNode: item => item.parent,
  nextSibling: item => item.parent?.children[item.parent.children.indexOf(item) + 1] || null,
})
const host = node('root'); const open = ref(true); const current = shallowRef(fresh())
const applied = []; let reads = 0; let creates = 0; let expired = false
const metadata = { code: 'aBcdEF12_345-789', createdAt: Date.now(), expiresAt: Date.now() + 86400000 }
const api = {
  async create(value) { creates++; return metadata },
  async resolve(code) { reads++; assert.equal(code, metadata.code); if (expired) throw new Error('分享码不存在或已过期'); return { ...payload(fixtureConfig(!valueAt(page.current, fixturePath))), ...metadata } },
}
const app = renderer.createApp({ setup: () => () => h(uiModule.exports.default, {
  open: open.value, current: current.value, adapter: adapter, api,
  'onUpdate:open': value => { open.value = value }, onApply: value => { applied.push(value); current.value = value },
}) })
const all = root => [root, ...root.children.flatMap(all)]
const textOf = item => item.text + item.children.map(textOf).join('')
const button = label => all(host).find(item => item.type === 'button' && textOf(item).includes(label))
app.mount(host)
try {
  const textarea = all(host).find(item => item.type === 'textarea')
  textarea.props.onInput({ target: { value: m.formatShareText(metadata, project) } }); await nextTick()
  await button('读取并预览').props.onClick(); await nextTick()
  assert.equal(reads, 1); assert.equal(applied.length, 0)
  assert.ok(textOf(host).includes('将修改 1 项设置'))
  expired = true
  await button('应用到当前页面').props.onClick(); await nextTick()
  assert.equal(applied.length, 0); assert.equal(open.value, true); assert.ok(textOf(host).includes('已过期'))
  expired = false
  current.value = { ...current.value, futureModule: { enabled: true } }
  await nextTick(); await button('应用到当前页面').props.onClick(); await nextTick()
  assert.equal(reads, 3); assert.equal(applied.length, 1); assert.equal(applied[0].futureModule.enabled, true)
  assert.equal(valueAt(applied[0], fixturePath), !valueAt(page.current, fixturePath)); assert.equal(open.value, false)
  open.value = true; await nextTick()
  await button('生成分享码').props.onClick(); await nextTick()
  assert.equal(creates, 1); assert.ok(button('复制完整分享文本')); assert.equal(applied.length, 1)
  assert.equal(button('生成分享码'), undefined)
  assert.equal(button('重新生成'), undefined)
  count++; console.log('PASS 真实弹窗读取预览、到期拒绝、再次核验、最新表单保留及生成复制流程')
} finally { app.unmount() }
console.log(`配置分享 ${count} 组回归及真实 Vue 模板/交互通过`)
