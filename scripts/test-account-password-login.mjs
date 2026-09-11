import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const copy = value => JSON.parse(JSON.stringify(value))
const utility = vm.createContext({ exports: {} })
vm.runInContext(compile(await read('src/utils/accountPasswordLogin.ts')), utility)
const { isAccountPasswordPlatform, normalizeAccountPasswordLogin, getSafeAccountPasswordError } = utility.exports
for (const value of [0, '0']) assert.equal(isAccountPasswordPlatform(value), true)
for (const value of [undefined, null, false, '', ' ', 1, 2, 3, '3']) assert.equal(isAccountPasswordPlatform(value), false)

const successData = {
  platform: 0, username: 'offline-account', bindTicket: 'offline-bind-ticket',
  server_list: { servers: [{ serverId: 1, serverName: '一区', roleName: '离线角色' }] },
}
for (const platform of [0, '0']) {
  assert.deepEqual(copy(normalizeAccountPasswordLogin({ ...successData, platform })), {
    bindTicket: 'offline-bind-ticket', servers: [{ serverId: '1', serverName: '一区', roleName: '离线角色' }],
  })
}
for (const changed of [
  { platform: 3 }, { platform: null }, { bindTicket: '' }, { bindTicket: {} },
  { server_list: { servers: [] } }, { server_list: { servers: [{ serverId: 0 }] } },
]) assert.equal(normalizeAccountPasswordLogin({ ...successData, ...changed }), null)
assert.equal(normalizeAccountPasswordLogin({ ...successData, server_list: { servers: [
  null, { serverId: '../bad' }, { server_id: '2' }, { serverId: '2' },
] } }).servers.length, 1)
for (const message of [
  'password=offline-secret', 'token:offline-secret', 'bindTicket="offline-ticket"',
  'https://example.invalid/?password=offline-secret', '{"password":"offline-secret"}',
  'Bearer offline-token', 'eyJ0ZXN0.eyJ0ZXN0.offline', 'opId=offline-user',
]) assert.equal(getSafeAccountPasswordError({ message }, '安全提示'), '安全提示')
assert.equal(getSafeAccountPasswordError({ message: '请先在官方客户端完成实名认证' }), '请先在官方客户端完成实名认证')

const filename = 'src/components/AddAccountModal.vue'
const source = await read(filename)
assert.equal((source.match(/timeout: 190_000/g) || []).length, 2, '登录/绑定超时均须大于后端 180 秒')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const compiledScript = compileScript(parsed.descriptor, { id: 'account-password-test' })
assert.deepEqual(compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'account-password-test',
  compilerOptions: { bindingMetadata: compiledScript.bindings },
}).errors, [])
const names = new Set([
  'clearAccountPasswordState', 'handleLogin', 'handleAccountPasswordBind', 'handleBind',
  'handleNextStep', 'resetForm', 'handleClose', 'handlePreviousStep',
  'clearLoginProgressTimer', 'resetLoginProgress', 'startLoginProgress',
  'finishLoginProgressSuccess', 'finishLoginProgressError',
  'accountLoginGeneration', 'loginProgressTimer',
])
const ast = ts.createSourceFile('modal.ts', parsed.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const declarations = ast.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration => names.has(declaration.name.getText())))
  .map(statement => statement.getText()).join('\n')
const defer = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

function createPage(queue = {}) {
  const calls = [], messages = [], events = [], logs = []
  const refs = Object.fromEntries([
    'accountBindTicket', 'loginProgressMessage', 'douyinSid', 'douyinQrB64', 'douyinScanStatus',
    'douyinSmsCode', 'douyinSmsMsg', 'douyinDyToken', 'douyinUid', 'qrcodeUrl', 'qrcodeImage',
    'wxFlowId',
  ].map(name => [name, { value: '' }]))
  for (const name of ['loading', 'loginProgressVisible', 'isPolling', 'isWxQrLoading', 'isDouyinPolling', 'douyinLoginDone']) refs[name] = { value: false }
  for (const name of ['serverList', 'douyinServers']) refs[name] = { value: [] }
  for (const name of ['selectedServer', 'selectedScriptServer', 'alipayLoginData', 'wxLoginData']) refs[name] = { value: null }
  const context = vm.createContext({
    ...refs, Promise, Set, String, Number,
    isAccountPasswordPlatform, normalizeAccountPasswordLogin, getSafeAccountPasswordError,
    props: { isOpen: true }, currentStep: { value: 'login' }, selectedChannel: { value: 0 },
    loginForm: { value: { username: 'offline-account', password: 'offline-password' } },
    loginFormRef: { value: { validateFields: async () => {}, resetFields: () => {} } },
    serverFormRef: { value: { validateFields: async () => {}, resetFields: () => {} } },
    serverForm: { value: { server: undefined } },
    loginProgressPercent: { value: 0 }, loginProgressStatus: { value: 'active' },
    console: Object.fromEntries(['log', 'error', 'warn'].map(type => [type, (...values) => logs.push(values)])),
    message: Object.fromEntries(['error', 'success', 'warning'].map(type => [type, value => messages.push({ type, value })])),
    emit: event => events.push(event),
    setTimeout: fn => { queueMicrotask(fn); return 1 }, clearTimeout: () => {},
    setInterval: () => 1, clearInterval: () => {}, window: {},
    cancelWxFlow: async () => {}, clearWxState: () => {}, stopDouyinPoll: () => {},
    resetAlipayQrLoading: () => {}, resetDouyinQrLoading: () => {},
    handleAlipayLogin: async () => {}, handleDouyinLogin: async () => {}, handleWxLogin: async () => {},
    axios: { post: async (url, payload) => {
      calls.push({ url, payload: copy(payload) })
      const result = await (url.endsWith('/login') ? queue.login : queue.bind)
      if (result?.response || result instanceof Error) throw result
      return { data: result || (url.endsWith('/login') ? { success: true, data: successData } : { success: true }) }
    } },
  })
  vm.runInContext(`
    const username = { get value() { return loginForm.value.username }, set value(v) { loginForm.value.username = v } };
    const password = { get value() { return loginForm.value.password }, set value(v) { loginForm.value.password = v } };
  `, context)
  vm.runInContext(compile(`${declarations}\nglobalThis.api = { ${[...names].filter(name => !['accountLoginGeneration', 'loginProgressTimer'].includes(name)).join(',')} };`), context)
  return { page: context, api: context.api, calls, messages, events, logs }
}

// 普通账号/手机号保持输入原名，服务端负责 trim；不依赖 PW_ 前缀或 SDK 身份。
for (const { platform, inputUsername } of [0, '0'].flatMap(platform =>
  ['offline-account', '19900000000', '  offline-account  ', '  19900000000  ']
    .map(inputUsername => ({ platform, inputUsername })))) {
  const { page, api, calls, logs, events } = createPage({ login: {
    success: true, data: { ...successData, username: inputUsername.trim() },
  } })
  page.selectedChannel.value = platform
  page.loginForm.value.username = inputUsername
  await api.handleLogin()
  assert.equal(page.currentStep.value, 'server')
  assert.equal(page.loginForm.value.username, inputUsername, '登录响应不改写输入账号')
  assert.equal(page.loginForm.value.password, '')
  assert.deepEqual(calls[0], { url: '/api/game-accounts/login', payload: {
    username: inputUsername, password: 'offline-password', platform: 0,
  } })
  page.selectedServer.value = page.serverList.value[0]
  await api.handleNextStep()
  assert.deepEqual(calls[1], { url: '/api/game-accounts/bind', payload: {
    username: inputUsername, server_id: '1', platform: 0, bindTicket: 'offline-bind-ticket',
  } })
  assert.equal(calls[1].payload.username.startsWith('PW_'), false, '绑定不生成身份前缀')
  for (const field of ['uid', 'opId', 'token', 'password', 'parent_id']) {
    assert.equal(Object.hasOwn(calls[1].payload, field), false, `绑定不提交 ${field}`)
  }
  assert.equal(page.accountBindTicket.value, '')
  assert.equal(page.loading.value, false)
  assert.equal(logs.length, 0, '账号密码流程不记录凭据或完整异常')
  assert.deepEqual(events, ['success', 'close'])
}

// 重复点击登录只发一次；关闭后返回的旧响应不能复活票据或打开区服页。
{
  const delayed = defer()
  const { page, api, calls, events } = createPage({ login: delayed.promise })
  const first = api.handleLogin()
  await api.handleLogin()
  assert.equal(calls.length, 1)
  api.handleClose()
  delayed.resolve({ success: true, data: successData })
  await first
  assert.equal(page.currentStep.value, 'channel')
  assert.equal(page.accountBindTicket.value, '')
  assert.equal(page.loginForm.value.password, '')
  assert.equal(page.loading.value, false)
  assert.deepEqual(events, ['close'])
}

// 登录数据缺角色/票据或平台不匹配不能绑定，错误提示不会暴露响应内容。
for (const data of [{ ...successData, platform: 3 }, { ...successData, bindTicket: '' }, { ...successData, server_list: { servers: [] } }]) {
  const { page, api, calls } = createPage({ login: { success: true, data } })
  await api.handleLogin()
  assert.equal(page.currentStep.value, 'login')
  assert.equal(page.accountBindTicket.value, '')
  assert.equal(page.loginForm.value.password, '')
  await api.handleAccountPasswordBind()
  assert.equal(calls.length, 1)
}
for (const login of [
  { success: false, message: 'password=offline-secret' },
  { response: { data: { message: 'token=offline-secret' } } },
]) {
  const { page, api, messages, logs } = createPage({ login })
  await api.handleLogin()
  assert.equal(page.loginForm.value.password, '')
  assert.equal(page.loading.value, false)
  assert.equal(JSON.stringify(messages).includes('offline-secret'), false)
  assert.equal(logs.length, 0)
}

// 票据过期返回登录，不保留密码，也不留 loading 死锁；网络失败可用同票据重试。
for (const asHttpError of [false, true]) {
  const body = { success: false, code: 'ACCOUNT_PASSWORD_BIND_EXPIRED', message: '登录凭据已过期，请重新输入账号密码' }
  const { page, api } = createPage({ bind: asHttpError ? { response: { data: body } } : body })
  await api.handleLogin()
  page.selectedServer.value = page.serverList.value[0]
  await api.handleAccountPasswordBind()
  assert.equal(page.currentStep.value, 'login')
  assert.equal(page.accountBindTicket.value, '')
  assert.equal(page.loading.value, false)
}
{
  const { page, api } = createPage({ bind: { response: { data: { message: '稍后再试' } } } })
  await api.handleLogin()
  page.selectedServer.value = page.serverList.value[0]
  await api.handleAccountPasswordBind()
  assert.equal(page.accountBindTicket.value, 'offline-bind-ticket')
  assert.equal(page.loading.value, false)
  api.handlePreviousStep()
  assert.equal(page.accountBindTicket.value, '')
  assert.equal(page.currentStep.value, 'login')
}

// Axios 不能把游戏密码/绑定业务失败当成网站过期；网站访问令牌失效仍登出。
const axiosSource = await read('src/utils/axios.ts')
const axiosAst = ts.createSourceFile('axios.ts', axiosSource, ts.ScriptTarget.Latest, true)
const classifier = axiosAst.statements.find(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(decl => decl.name.getText() === 'isTokenInvalidError'))
const responseHook = axiosAst.statements.find(statement => ts.isExpressionStatement(statement) &&
  statement.expression.expression?.getText() === 'axiosInstance.interceptors.response.use')
let onResponse, onRejected, logoutCount = 0
const displayed = []
const axiosContext = vm.createContext({
  Promise, getSafeAccountPasswordError, isWxReauthRequired: () => false,
  getSafeWxReauthError: () => '微信提示',
  axiosInstance: { interceptors: { response: { use: (success, failed) => { onResponse = success; onRejected = failed } } } },
  handleLogout: () => logoutCount++, throttledErrorMessage: text => displayed.push(text),
})
vm.runInContext(compile(`${classifier.getText()}\n${responseHook.getText()}`), axiosContext)
for (const status of [200, 400, 401, 500]) {
  const response = { status, data: { success: false, code: 'ACCOUNT_PASSWORD_LOGIN_FAILED', message: '游戏 token过期，请重新登录' } }
  if (status === 200) assert.equal(onResponse(response), response)
  else await assert.rejects(onRejected({ config: { url: '/api/game-accounts/login' }, response }))
}
assert.equal(logoutCount, 0)
await assert.rejects(onRejected({ config: { url: '/api/game-accounts/bind' }, response: { status: 400, data: { message: 'password=offline-secret' } } }))
assert.equal(JSON.stringify(displayed).includes('offline-secret'), false)
await assert.rejects(onResponse({ data: { success: false, message: '访问令牌无效或已过期' } }))
assert.equal(logoutCount, 1)
assert.doesNotMatch(source, /(?:localStorage|sessionStorage)\.(?:setItem|getItem)/)
console.log('账号密码前端专项测试通过：platform=0/字符串0、普通账号/手机号原名、POST登录、无前缀票据绑定、密码清理、关闭并发隔离、过期重试、安全错误、网站认证与Vue编译（零真实网络）。')
