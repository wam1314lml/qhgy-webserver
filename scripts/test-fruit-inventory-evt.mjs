import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { transform } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const filename = 'src/components/EventCardView.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'fruit-inventory-evt-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'fruit-inventory-evt-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
assert.match(source, /v-if="isInventoryModule\(card\.module\)"/)
assert.match(source, /:title="`复制全部\$\{card\.module\}`"/)
assert.match(source, /@click="copyFlowerInventory\(card\)"/)

// 只抽取真实 Vue 脚本中的库存展示/复制函数，在内存里执行；无浏览器、接口或真实剪贴板。
const needed = new Set([
  'isInventoryModule', 'activeRankTabs', 'rankTabsFor', 'activeRankTab',
  'setActiveRankTab', 'copyFlowerInventory',
])
const ast = ts.createSourceFile(filename, parsed.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const parts = []
for (const node of ast.statements) {
  const names = ts.isVariableStatement(node)
    ? node.declarationList.declarations.map(declaration => declaration.name.getText(ast))
    : ts.isFunctionDeclaration(node) && node.name ? [node.name.text] : []
  if (names.some(name => needed.has(name))) {
    parts.push(node.getText(ast))
    for (const name of names) needed.delete(name)
  }
}
assert.deepEqual([...needed], [])
const transformed = await transform(parts.join('\n'), { loader: 'ts', target: 'es2022' })
const messages = []
const copied = []
let clipboardFails = false
const context = {
  ref: value => ({ value }),
  message: Object.fromEntries(['success', 'warning', 'error'].map(level => [level, text => messages.push({ level, text })])),
  async writeClipboardText(text) {
    if (clipboardFails) throw new Error('offline clipboard unavailable')
    copied.push(text)
  },
}
const helpers = vm.runInNewContext(`(() => { ${transformed.code}; return {
  isInventoryModule, rankTabsFor, activeRankTab, setActiveRankTab, copyFlowerInventory,
}; })()`, context, { filename })
const items = Object.freeze([
  { itemId: 50001, name: '零库存水果', value: 0, quality: 1, badge: '绿色', badgeColor: 'green' },
  { itemId: 50002, name: '边界下水果', value: 499, quality: 3, badge: '紫色', badgeColor: 'purple' },
  { itemId: 50003, name: '边界水果', value: '500', quality: 5, badge: '红色', badgeColor: 'red' },
  { itemId: 50004, name: '边界上水果', value: 501, quality: 3, badge: '紫色', badgeColor: 'purple' },
  { itemId: 50005, name: '低库存水果', value: 1, quality: 2, badge: '蓝色', badgeColor: 'blue' },
].map(Object.freeze))
const ids = rows => Array.from(rows, item => item.itemId)

for (const module of ['水果库存', '花卉库存']) {
  assert.equal(helpers.isInventoryModule(module), true)
  const card = {
    module,
    layout: {
      headerStats: [{ label: '总库存', value: 1501 }, { label: '种类', value: 5 }],
      rankTabs: [{ key: 'count', label: '按数量', items }],
      rankTabDefault: 'count', rankListLabel: module === '水果库存' ? '水果明细' : '花卉明细',
    },
  }
  const views = helpers.rankTabsFor(card)
  assert.deepEqual(Array.from(views, view => view.key), ['count', 'quality', 'stockHigh', 'stockLow'])
  assert.deepEqual(ids(views[0].items), [50004, 50003, 50002, 50005, 50001], '数量降序')
  assert.deepEqual(ids(views[1].items), [50003, 50004, 50002, 50005, 50001], '品质降序，同品质数量降序')
  assert.deepEqual(ids(views[2].items), [50004, 50003], '500 本身必须在高库存视图')
  assert.deepEqual(ids(views[3].items), [50001, 50005, 50002], '低库存严格小于 500 且升序，保留零库存')
  assert.deepEqual(ids(items), [50001, 50002, 50003, 50004, 50005], '派生视图不能修改源数组')
  assert.equal(card.layout.rankTabs.length, 1, '脚本只需要发送一份原始库存')
  assert.equal(helpers.activeRankTab(card).key, 'count')
  helpers.setActiveRankTab(module, 'stockLow')
  assert.equal(helpers.activeRankTab(card).items.length, 3)
  await helpers.copyFlowerInventory(card)
  const text = copied.at(-1)
  assert.equal(text.split('\n')[0], module)
  assert.match(text, /总库存 1501，种类 5/)
  assert.equal(text.split('\n').length, 7, '复制全部不能只复制当前筛选出的三项')
  for (const item of items) assert.ok(text.includes(`${item.name} | ${item.badge} | ${item.value}`))
  assert.deepEqual(messages.at(-1), { level: 'success', text: '已复制5条库存' })
  assert.equal(helpers.rankTabsFor({ module, layout: { rankTabs: [] } }).length, 0)
}

const otherTabs = [{ key: 'guild', label: '公会', items }]
assert.equal(helpers.isInventoryModule('公会竞赛'), false)
assert.equal(helpers.rankTabsFor({ module: '公会竞赛', layout: { rankTabs: otherTabs } }), otherTabs, '其他模块不能套库存筛选')
assert.equal(helpers.rankTabsFor({ module: '普通卡片' }).length, 0)

// 旧版多列表数据仍取最长原始列表；当前选项以及列表先后不影响复制全部。
await helpers.copyFlowerInventory({ module: '花卉库存', layout: { rankTabs: [
  { key: 'short', items: items.slice(0, 1) }, { key: 'all', items },
] } })
assert.equal(copied.at(-1).split('\n').length, 6)
await helpers.copyFlowerInventory({ module: '水果库存', layout: { rankTabs: [{ key: 'count', items: [] }] } })
assert.deepEqual(messages.at(-1), { level: 'warning', text: '暂无库存数据' })
clipboardFails = true
await helpers.copyFlowerInventory({ module: '水果库存', layout: { rankTabs: [{ key: 'count', items }] } })
assert.deepEqual(messages.at(-1), { level: 'error', text: '复制失败，请重试' })

console.log('水果库存 EVT 前端测试通过：双模块兼容、单份数据四视图、500边界、零库存、复制全部、其他模块隔离、Vue 编译（全离线）。')
