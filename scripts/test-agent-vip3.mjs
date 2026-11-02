// 执行真实路由守卫、菜单计算和组件处理函数；仅使用合成角色，无网络访问。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref, computed } from 'vue'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const roles = {}
vm.runInNewContext(transpile(read('utils/agentRoles.ts')), { exports: roles })
const components = new Map()
for (const name of ['TopNavBar', 'AgentManagement', 'PerformanceManagement', 'AdminPanel', 'UserManagement']) {
  const { descriptor, errors } = parse(read(`components/${name}.vue`))
  assert.deepEqual(errors, [])
  const script = compileScript(descriptor, { id: 'agent-vip3' })
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: name + '.vue', id: 'agent-vip3',
    compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
  components.set(name, ts.createSourceFile(name + '.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true))
}
function declarations(component, names, env = {}) {
  const ast = components.get(component)
  const selected = ast.statements.filter(st => ts.isFunctionDeclaration(st) && names.includes(st.name?.text)
    || ts.isVariableStatement(st) && st.declarationList.declarations.some(d => names.includes(d.name.getText(ast))))
  assert.equal(selected.length, names.length)
  const context = { ...roles, ref, computed, ...env }
  vm.runInNewContext(transpile(selected.map(st => st.getText(ast)).join('\n')
    + '\nglobalThis.result = {' + names.join(',') + '}'), context)
  return context.result
}
const allowed = ['vip1', 'vip2', 'vip3']
const denied = ['user', 'agent3', 'vip', 'custom', 'admin', 'subadmin', 'VIP3', '', null, undefined]
let checks = 0
function test(name, run) { run(); checks++; console.log('PASS', name) }
test('角色能力表与非法值边界', () => {
  for (const role of allowed) assert.equal(roles.isSecondLevelAgentRole(role), true)
  for (const role of denied) assert.equal(roles.isSecondLevelAgentRole(role), false)
})
test('真实导航菜单让VIP3进入代理后台，不额外赋予管理面板', () => {
  const user = ref(null)
  const { managementItems } = declarations('TopNavBar', ['managementItems'], { user })
  for (const role of [...allowed, ...denied]) {
    user.value = { role, permissions: {} }
    const keys = managementItems.value.map(item => item.key)
    assert.equal(keys.includes('agent'), allowed.includes(role))
    if (role === 'vip3') assert.equal(keys.includes('admin'), false)
  }
})
test('真实代理页面守卫放行VIP3，降权/普通用户与坏缓存仍拦截', () => {
  const source = read('router/index.ts')
  const ast = ts.createSourceFile('router.ts', source, ts.ScriptTarget.Latest, true)
  const statement = ast.statements.find(st => ts.isExpressionStatement(st) && ts.isCallExpression(st.expression)
    && st.expression.expression.getText(ast) === 'router.beforeEach')
  let guard, stored = '{}'
  vm.runInNewContext(transpile(statement.getText(ast)), { ...roles, router: { beforeEach(fn) { guard = fn } },
    localStorage: { getItem() { return stored } }, sessionStorage: { setItem() {} }, updateUserBalance() {} })
  for (const role of [...allowed, ...denied]) {
    stored = JSON.stringify({ role })
    const calls = []
    guard({ meta: { requiresSubadmin: true } }, {}, target => calls.push(target))
    assert.equal(calls.length, 1)
    assert.equal(calls[0]?.name, allowed.includes(role) ? undefined : 'Dashboard')
  }
  stored = 'invalid-json'
  guard({ meta: { requiresSubadmin: true } }, {}, target => assert.equal(target.name, 'Login'))
})
test('VIP3标签/保护与其他二级代理一致，普通候选仍可选', () => {
  const agent = declarations('AgentManagement', ['getRoleClass', 'getRoleLabel', 'isSecondLevel', 'isUserDisabled'])
  const performance = declarations('PerformanceManagement', ['getRoleDisplayName'])
  for (const role of allowed) {
    assert.equal(agent.getRoleClass(role), 'role-subadmin')
    assert.equal(agent.getRoleLabel(role), '二级代理')
    assert.equal(agent.isUserDisabled({ role }), true)
    assert.equal(performance.getRoleDisplayName(role), '二级代理')
  }
  assert.equal(agent.isUserDisabled({ role: 'user' }), false)
})
test('管理员VIP3结算弹窗和操作列识别旗下金额及报表入口', () => {
  const selectedUser = ref({ role: 'vip3' })
  const { selectedUserIsSecondLevel } = declarations('AdminPanel', ['selectedUserIsSecondLevel'], { selectedUser })
  const { inviteColumns } = declarations('AdminPanel', ['inviteColumns'], {
    h: (tag, props, children) => ({ tag, props, children }), Button: 'button', handleWithdraw() {}, exportReport() {},
  })
  const render = inviteColumns.value.find(column => column.key === 'action').customRender
  for (const role of [...allowed, 'agent3', 'user']) {
    selectedUser.value = { role }
    assert.equal(selectedUserIsSecondLevel.value, allowed.includes(role))
    const buttons = render({ record: { role, available_commission: 0, sub_agents_available: 10 } }).children
    assert.equal(buttons[0].props.disabled, !allowed.includes(role))
    assert.equal(buttons.some(button => button.children === '报表'), allowed.includes(role))
  }
})
console.log(`VIP3代理前端 ${checks} 组通过；5个真实SFC编译通过，网络调用0`)
