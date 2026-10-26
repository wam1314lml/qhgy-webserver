#!/usr/bin/env node

// 果灵指定种植离线回归：复用真实规则、配置归一化、页面分享适配器和 CustomSelect。
// 仅读取已登记脚本导出；禁止账号、游戏、Web API 及其他网络连接。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire, syncBuiltinESMExports } from 'node:module'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import dgram from 'node:dgram'
import dns from 'node:dns'
import { build } from 'esbuild'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const sourceDir = resolve(root, '..', '..', 'qhgy-assistant-master/export/qhgy-database')
const require = createRequire(import.meta.url)
const networkAttempts = []
const forbid = name => () => {
  networkAttempts.push(name)
  throw new Error(`离线测试禁止网络调用：${name}`)
}
for (const [name, target, methods] of [
  ['http', http, ['request', 'get']],
  ['https', https, ['request', 'get']],
  ['net', net, ['connect', 'createConnection']],
  ['socket', net.Socket.prototype, ['connect']],
  ['tls', tls, ['connect']],
  ['udp', dgram, ['createSocket']],
  ['dns', dns, ['lookup', 'resolve', 'resolve4', 'resolve6']],
  ['dns.promises', dns.promises, ['lookup', 'resolve', 'resolve4', 'resolve6']],
]) for (const method of methods) target[method] = forbid(`${name}.${method}`)
globalThis.fetch = forbid('fetch')
if ('WebSocket' in globalThis) globalThis.WebSocket = forbid('WebSocket')
syncBuiltinESMExports()

const bundle = await build({
  stdin: {
    contents: `
      export * from './src/pages/game-config/elfPlantOptions';
      export * from './src/pages/game-config/elfPlantRules';
      export { elfOptions } from './src/pages/game-config/elfOptions';
      export { createDefaultGameConfig } from './src/pages/game-config/defaultConfig';
      export { normalizeGameConfigSelects } from './src/pages/game-config/normalizeConfigSelects';
      export { deepMerge } from './src/pages/game-config/utils';
      export { shareProject } from './src/features/config-share/project';
    `,
    resolveDir: root,
  },
  bundle: true, write: false, platform: 'node', format: 'cjs',
})
const module = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, module, module.exports)
const m = module.exports
const page = await loadSharePageModel(root)
const rows = JSON.parse(await readFile(resolve(sourceDir, 'fruit-elves.json'), 'utf8'))
const fruits = JSON.parse(await readFile(resolve(sourceDir, 'fruits.json'), 'utf8'))
const fruitIds = new Set(fruits.map(row => Number(row.id)))
const expected = rows.flatMap(row => row.bookEntries
  .filter(book => fruitIds.has(book.mainFruitId) && fruitIds.has(book.secondaryFruitId))
  .map(book => ({ row, book })))
const clone = value => JSON.parse(JSON.stringify(value))
const fresh = () => clone(page.current)
const selected = config => config.plant.elves.selectedElvesIds
const load = ids => {
  const config = m.deepMerge(m.createDefaultGameConfig(), { plant: { elves: { selectedElvesIds: ids } } })
  m.normalizeGameConfigSelects(config)
  return config
}
const payload = config => ({ format: 1, project: m.shareProject.id, schemaVersion: 1, config })
let count = 0
async function test(name, fn) {
  await fn()
  count++
  console.log(`PASS ${name}`)
}

await test('种植目录仅包含当前图鉴的 36 个有效主副果组合，逐项对应脚本导出', () => {
  assert.equal(expected.length, 36)
  assert.equal(m.elfPlantOptions.length, 36)
  assert.equal(new Set(m.elfPlantOptions.map(option => option.value)).size, 36)
  assert.deepEqual(m.elfPlantOptions.map(option => option.value).sort(), expected.map(({ row }) => String(row.id)).sort())
  for (const { row, book } of expected) {
    const option = m.elfPlantOptions.find(item => item.value === String(row.id))
    assert.equal(option.name, row.name)
    assert.equal(option.bookId, book.bookId)
    assert.equal(option.mainFruitId, book.mainFruitId)
    assert.equal(option.secondaryFruitId, book.secondaryFruitId)
    for (const labelPart of [row.name, String(row.id), book.mainFruitName, book.secondaryFruitName]) {
      assert.ok(option.label.includes(labelPart), `${row.id} 标签应包含 ${labelPart}`)
    }
    assert.notEqual(option.disabled, true)
  }
})

await test('完整 96 个果灵仍用于好友选择，含旧同名 ID，不受种植目录裁剪', () => {
  assert.equal(rows.length, 96)
  assert.equal(m.elfOptions.length, 96)
  assert.deepEqual(m.elfOptions, rows.map(row => ({ value: String(row.id), label: row.displayName, title: row.displayName })))
  const config = fresh()
  config.plant.friendSteal.specifiedElvesIds = m.elfOptions.map(option => option.value)
  m.normalizeGameConfigSelects(config)
  assert.deepEqual(config.plant.friendSteal.specifiedElvesIds, m.elfOptions.map(option => option.value))
  assert.notEqual(m.elfOptions.find(option => option.value === '210111').label, m.elfOptions.find(option => option.value === '210311').label)
  assert.match(m.elfOptions.find(option => option.value === '210111').label, /【摩羯·汐月星帘】.*210111/)
  assert.match(m.elfOptions.find(option => option.value === '210311').label, /【甜苹华舞】.*210311/)
})

await test('旧 210111 保留原值且不会按同名迁移到 210311', () => {
  assert.deepEqual(m.normalizeSelectedElvesIds(['210111']), ['210111'])
  assert.deepEqual(selected(load(['210111'])), ['210111'])
  assert.equal(m.elfPlantOptions.some(option => option.value === '210111'), false)
  const options = m.getElfPlantOptions(['210111'])
  const legacy = options.find(option => option.value === '210111')
  assert.equal(legacy.disabled, true)
  assert.match(legacy.label, /【摩羯·汐月星帘】.*当前图鉴未收录有效种植组合.*请重新选择/)
  assert.match(legacy.title, /物品说明组合：摩羯·汐月星帘 \+ 汀南暖熹/)
  assert.match(legacy.label, /210111/)
  assert.equal(options.find(option => option.value === '210311').disabled === true, false)
})

await test('未知非空 ID 和全无效列表不被归一化清空，保留顺序并去重', () => {
  const values = [210111, ' 999999 ', '210111', '', '  ', 'future-elf']
  const ids = ['210111', '999999', 'future-elf']
  assert.deepEqual(m.normalizeSelectedElvesIds(values), ids)
  assert.deepEqual(selected(load(values)), ids)
  const options = m.getElfPlantOptions(ids)
  assert.equal(options.length, 39)
  for (const value of ids) {
    const option = options.find(item => item.value === value)
    assert.ok(option, `旧值 ${value} 应继续显示`)
    assert.equal(option.disabled, true)
    assert.match(option.label, /未收录有效种植组合.*请重新选择/)
  }
})

await test('全非法及混合非法指定经加载保存分享仍为警告，对象只留固定占位且不泄露内容', () => {
  const privateMarkers = ['ELF_TEST_PRIVATE_PASSWORD', 'ELF_TEST_PRIVATE_TOKEN']
  const invalidObject = { password: privateMarkers[0], nested: { token: privateMarkers[1] } }
  const illegalValues = [null, false, invalidObject, Number.NaN, -1, 0, undefined]
  const inputs = [...illegalValues.map(value => [value]), illegalValues, [...illegalValues, 'future-elf', '210311']]
  const weeklyNotice = m.getElfPlantSelectionNotice([]).text
  const assertSafeSelection = config => {
    const ids = selected(config)
    assert.ok(ids.length > 0, '异常旧指定不能变成空数组后误启用双倍')
    assert.ok(ids.every(id => typeof id === 'string' && id.length > 0))
    const notice = m.getElfPlantSelectionNotice(ids)
    assert.equal(notice.type, 'warning')
    assert.notEqual(notice.text, weeklyNotice)
    assert.match(notice.text, /不自动改选.*双倍/)
    if (!ids.includes('210311')) assert.match(notice.text, /暂停.*果灵种植/)
    const display = JSON.stringify({ ids, labels: m.getElfPlantOptions(ids).map(option => option.label), notice })
    for (const marker of privateMarkers) assert.equal(display.includes(marker), false, '对象原始敏感子字段不能进入归一化或提示')
    assert.equal(display.includes('[object Object]'), false)
  }
  assert.deepEqual(m.normalizeSelectedElvesIds([invalidObject]), ['无效果灵配置'])
  for (const raw of inputs) {
    const normalized = m.normalizeSelectedElvesIds(raw)
    assert.ok(normalized.length > 0)
    const loaded = load(raw)
    assert.deepEqual(selected(loaded), normalized)
    assertSafeSelection(loaded)
    const reloaded = m.deepMerge(m.createDefaultGameConfig(), clone(loaded))
    m.normalizeGameConfigSelects(reloaded)
    assert.deepEqual(selected(reloaded), normalized)
    assertSafeSelection(reloaded)
    const shared = page.adapter.exportConfig(reloaded)
    assert.deepEqual(shared.config.plant.elves.selectedElvesIds, normalized)
    const imported = page.adapter.preview(load([]), shared).config
    assert.deepEqual(selected(imported), normalized)
    assertSafeSelection(imported)
    // 原始 JSON 中的 NaN / undefined 会变成 null，仍须保留“存在指定”的意图。
    assertSafeSelection(load(clone(raw)))
  }
})

await test('所有 36 个有效图鉴旧 bookId 继续可识别，原值和顺序保留', () => {
  for (const option of m.elfPlantOptions) {
    const id = String(option.bookId)
    assert.deepEqual(m.normalizeSelectedElvesIds([id]), [id])
    assert.deepEqual(selected(load([id])), [id])
    const bookOption = m.getElfPlantOptions([id]).find(item => item.value === id)
    assert.ok(bookOption, `旧图鉴 ID ${id} 必须可显示`)
    assert.notEqual(bookOption.disabled, true)
    assert.ok(bookOption.label.includes(option.name))
    assert.equal(m.getElfPlantSelectionNotice([id]).type, 'info')
  }
})

await test('空数组初始加载与连续保存重载均保留空，明确表示当期双倍', () => {
  assert.deepEqual(m.normalizeSelectedElvesIds([]), [])
  let config = load([])
  for (let round = 0; round < 3; round++) {
    assert.deepEqual(selected(config), [])
    config = m.deepMerge(m.createDefaultGameConfig(), clone(config))
    m.normalizeGameConfigSelects(config)
  }
  assert.deepEqual(selected(config), [])
  const notice = m.getElfPlantSelectionNotice([])
  assert.equal(notice.type, 'info')
  assert.match(notice.text, /双倍/)
  assert.equal(m.getElfPlantOptions([]).length, 36)
})

await test('全无效提示暂停果灵种植并恢复原土地策略，不静默切到双倍', () => {
  for (const ids of [['210111'], ['999999'], ['210111', '999999']]) {
    const notice = m.getElfPlantSelectionNotice(ids)
    assert.equal(notice.type, 'warning')
    assert.match(notice.text, /暂停.*果灵种植/)
    assert.match(notice.text, /(?:不会|不自动|不再|不).*双倍/)
    assert.match(notice.text, /(?:恢复|仍按|沿用).*原.*(?:土地|种植)/)
    assert.match(notice.text, /重新选择/)
  }
})

await test('混合列表顺序不变，仅首个有效候选执行且指出无效项', () => {
  const candidates = m.elfPlantOptions.filter(option => option.value !== '210311')
  for (const valid of [['210311', candidates[0].value], [candidates[0].value, '210311']]) {
    const ids = ['210111', ...valid, '999999']
    assert.deepEqual(selected(load(ids)), ids)
    const notice = m.getElfPlantSelectionNotice(ids)
    assert.equal(notice.type, 'warning')
    assert.match(notice.text, /(?:首|第一).*有效|有效.*(?:首|第一)/)
    assert.ok(notice.text.includes(valid[0]), '提示应指出当前第一个有效 ID')
    assert.match(notice.text, /210111/)
    assert.match(notice.text, /999999/)
  }
})

await test('仅有效列表提示只使用第一个候选，不暗示种植多种果灵', () => {
  const ids = m.elfPlantOptions.slice(0, 2).map(option => option.value)
  const notice = m.getElfPlantSelectionNotice(ids)
  assert.equal(notice.type, 'info')
  assert.match(notice.text, /(?:首|第一)/)
  assert.ok(notice.text.includes(ids[0]))
  assert.deepEqual(selected(load(ids)), ids)
})

await test('真实页面分享适配器保留空数组、失效旧 ID、未知 ID 及混合顺序', () => {
  for (const ids of [[], ['210111'], ['999999'], ['210111', '999999'], ['210111', '210311', '210001'], ['200311']]) {
    const config = load(ids)
    const shared = page.adapter.exportConfig(config)
    assert.deepEqual(shared.config.plant.elves.selectedElvesIds, ids)
    const receiver = load(['210001'])
    const imported = page.adapter.preview(receiver, shared).config
    assert.deepEqual(selected(imported), ids)
    const reloaded = clone(imported)
    m.normalizeGameConfigSelects(reloaded)
    assert.deepEqual(selected(reloaded), ids)
    assert.deepEqual(selected(receiver), ['210001'], '分享预览不可修改接收方原表单')
  }
})

await test('旧分享码缺少指定果灵时保留当前选择，包括空数组及无效旧 ID', () => {
  for (const ids of [[], ['210111'], ['999999'], ['210111', '210311']]) {
    const current = load(ids)
    const imported = page.adapter.preview(current, payload({ plant: { elves: { enabled: true } } })).config
    assert.deepEqual(selected(imported), ids)
    assert.equal(imported.plant.elves.enabled, true)
  }
})

const pageSource = await readFile(resolve(root, 'src/pages/GameConfigPage.vue'), 'utf8')
const pageDescriptor = parse(pageSource).descriptor
const walk = node => [node, ...(node.children ?? []).flatMap(walk)]
const elements = walk(pageDescriptor.template.ast)
const attribute = (node, name) => node.props?.find(prop => prop.type === 6 && prop.name === name)
const directive = (node, name, argument) => node.props?.find(prop => prop.type === 7 && prop.name === name && prop.arg?.content === argument)
const boundValue = node => directive(node, 'model', 'value')?.exp?.content
const hasTrueProp = (node, name) => !!attribute(node, name) || directive(node, 'bind', name)?.exp?.content === 'true'
const plantSelect = elements.find(node => node.tag === 'CustomSelect' && boundValue(node) === 'config.plant.elves.selectedElvesIds')

await test('实际页面指定果灵控件使用独立动态选项，允许清空并展开长标签', () => {
  assert.ok(plantSelect)
  assert.equal(attribute(plantSelect, 'mode')?.value?.content, 'multiple')
  assert.ok(hasTrueProp(plantSelect, 'allowEmpty') || hasTrueProp(plantSelect, 'allow-empty'))
  assert.ok(hasTrueProp(plantSelect, 'allowClear') || hasTrueProp(plantSelect, 'allow-clear'))
  assert.ok(hasTrueProp(plantSelect, 'wide'))
  const optionsBinding = directive(plantSelect, 'bind', 'options')?.exp?.content
  assert.ok(optionsBinding && optionsBinding !== 'elfOptions')
  assert.match(pageDescriptor.scriptSetup.content, /getElfPlantOptions\(/)
  assert.match(pageDescriptor.scriptSetup.content, /getElfPlantSelectionNotice\(/)
  const form = elements.find(node => node.tag === 'CustomFormItem' && attribute(node, 'name')?.value?.content === 'plant.elves.selectedElvesIds')
  assert.ok(form)
  const extra = directive(form, 'bind', 'extra') || walk(form).find(node => directive(node, 'slot', 'extra'))
  assert.ok(extra, '指定项需要常驻 extra 提示，不能只放 tooltip')
})

await test('实际页面好友控件继续绑定完整 elfOptions，派遣模式保持独立', () => {
  const friend = elements.find(node => node.tag === 'CustomSelect' && boundValue(node) === 'config.plant.friendSteal.specifiedElvesIds')
  assert.ok(friend)
  assert.equal(directive(friend, 'bind', 'options')?.exp?.content, 'elfOptions')
  const dispatch = elements.find(node => node.tag === 'Radio.Group' && boundValue(node) === 'config.plant.elves.dispatchMode')
  assert.ok(dispatch)
  assert.deepEqual(walk(dispatch).filter(node => node.tag === 'Radio').map(node => attribute(node, 'value')?.value?.content), ['doubleFirst', 'doubleOnly'])
})

await test('实际页面失效标签可主动移除，最后一项移除后保持空数组', async () => {
  const renderName = directive(plantSelect, 'bind', 'tag-render')?.exp?.content
  assert.ok(renderName, '已禁用旧项必须仍有主动移除入口')
  const source = ts.createSourceFile('GameConfigPage.ts', pageDescriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declarations = new Map(source.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => ts.isIdentifier(declaration.name))
    .map(declaration => [declaration.name.text, `const ${declaration.getText(source)};`]))
  const needed = [directive(plantSelect, 'bind', 'options').exp.content, renderName]
  for (const name of needed) assert.ok(declarations.has(name), `页面缺少 ${name}`)
  const tagBundle = await build({
    stdin: {
      contents: `
        import { computed, h, ref } from 'vue';
        import { getElfPlantOptions } from './src/pages/game-config/elfPlantRules';
        const Tag = 'tag-host';
        export function createTagModel(initial) {
          const config = ref(initial);
          ${needed.map(name => declarations.get(name)).join('\n')}
          return { config, render: ${renderName} };
        }
      `,
      resolveDir: root, loader: 'ts',
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  })
  const tagModule = { exports: {} }
  new Function('require', 'module', 'exports', tagBundle.outputFiles[0].text)(require, tagModule, tagModule.exports)
  const model = tagModule.exports.createTagModel(load(['210111', '999999', '210311']))
  let prevented = 0, stopped = 0
  const event = { preventDefault() { prevented++ }, stopPropagation() { stopped++ } }
  for (const id of ['210111', '999999', '210311']) {
    const vnode = model.render({ label: id, value: id })
    assert.equal(vnode.props.closable, true)
    if (id !== '210311') assert.equal(vnode.props.color, 'orange')
    vnode.props.onClose(event)
    assert.equal(selected(model.config.value).includes(id), false)
  }
  assert.equal(prevented, 3)
  assert.equal(stopped, 3)
  assert.deepEqual(selected(model.config.value), [])
  m.normalizeGameConfigSelects(model.config.value)
  assert.deepEqual(selected(model.config.value), [])
})

// 编译真实 CustomSelect，保留 Vue 的 watch/computed/emits，只替换 Ant 的绘制宿主。
const selectFile = resolve(root, 'src/components/CustomSelect.vue')
const selectDescriptor = parse(await readFile(selectFile, 'utf8')).descriptor
const compiled = compileScript(selectDescriptor, { id: 'elf-plant-select-test', inlineTemplate: true })
const uiBundle = await build({
  stdin: { contents: compiled.content, resolveDir: dirname(selectFile), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
})
const uiModule = { exports: {} }
new Function('require', 'module', 'exports', uiBundle.outputFiles[0].text)(require, uiModule, uiModule.exports)
const { createRenderer, defineComponent, h, ref, nextTick } = require('vue')
const hostNode = (type, text = '') => ({ type, text, props: {}, children: [], parent: null })
const renderer = createRenderer({
  createElement: type => hostNode(type), createText: text => hostNode('text', text), createComment: text => hostNode('comment', text),
  setText: (item, text) => { item.text = text }, setElementText: (item, text) => { item.text = text; item.children = [] },
  patchProp: (item, key, _before, after) => { item.props[key] = after },
  insert(item, parent, anchor = null) {
    if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1)
    item.parent = parent
    const at = anchor ? parent.children.indexOf(anchor) : -1
    if (at < 0) parent.children.push(item); else parent.children.splice(at, 0, item)
  },
  remove(item) { if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1) },
  parentNode: item => item.parent,
  nextSibling: item => item.parent?.children[item.parent.children.indexOf(item) + 1] || null,
})
const antSelect = defineComponent({ setup: (_props, { attrs }) => () => h('select-host', attrs) })
async function withSelect(ids, check) {
  const value = ref([...ids]), emitted = [], host = hostNode('root')
  const app = renderer.createApp({ setup: () => () => h(uiModule.exports.default, {
    value: value.value, options: m.getElfPlantOptions(value.value), mode: 'multiple',
    allowEmpty: true, allowClear: true, wide: true,
    'onUpdate:value': next => { emitted.push(clone(next)); value.value = next },
  }) })
  app.component('a-select', antSelect)
  app.mount(host)
  try {
    await nextTick()
    await check({ value, emitted, select: () => walk(host).find(item => item.type === 'select-host') })
  } finally { app.unmount() }
}

await test('真实 CustomSelect 空数组挂载与选项刷新不自动补第一个果灵', async () => {
  await withSelect([], async ({ value, emitted, select }) => {
    assert.deepEqual(value.value, [])
    assert.deepEqual(emitted, [])
    assert.deepEqual(select().props.value, [])
    assert.equal(select().props.options.length, 36)
    value.value = []
    await nextTick()
    assert.deepEqual(value.value, [])
    assert.deepEqual(emitted, [])
  })
})

await test('真实 CustomSelect 已选无效旧 ID 继续显示，清空可恢复双倍空选', async () => {
  await withSelect(['210111', '999999'], async ({ value, emitted, select }) => {
    assert.deepEqual(value.value, ['210111', '999999'])
    assert.deepEqual(emitted, [])
    const option = select().props.options.find(item => item.value === '210111')
    assert.equal(option.disabled, true)
    assert.match(option.label, /未收录有效种植组合/)
    select().props['onUpdate:value']([])
    await nextTick()
    assert.deepEqual(value.value, [])
    assert.deepEqual(emitted, [[]])
    assert.equal(select().props.options.length, 36)
  })
})

await test('真实 CustomSelect 混合选择删除旧值后顺序保留，再清空不自动回填', async () => {
  await withSelect(['210111', '210311', '210001'], async ({ value, select }) => {
    select().props['onUpdate:value'](['210311', '210001'])
    await nextTick()
    assert.deepEqual(value.value, ['210311', '210001'])
    select().props['onUpdate:value']([])
    await nextTick()
    assert.deepEqual(value.value, [])
  })
})

await test('全程 HTTP/TCP/TLS/UDP/DNS/fetch/WebSocket 网络调用为 0', () => {
  assert.deepEqual(networkAttempts, [])
})
console.log(`果灵指定种植 ${count} 组离线回归通过，网络调用 0`)
