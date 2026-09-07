import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const utilContext = vm.createContext({ exports: {} })
vm.runInContext(compile(await read('src/utils/wxReauth.ts')), utilContext)
const { isWxReauthRequired, getSafeWxReauthError } = utilContext.exports

assert.equal(isWxReauthRequired({ code: 'WX_REAUTH_REQUIRED' }), true)
assert.equal(isWxReauthRequired({ code: 'DOUYIN_REAUTH_REQUIRED' }), false)
assert.equal(isWxReauthRequired(null), false)
assert.equal(getSafeWxReauthError({ message: '请扫描原账号微信二维码' }, '失败'), '请扫描原账号微信二维码')
for (const message of [
  'token=test-only-credential', 'wx_openId: test-only-openid', 'code="test-only-code"',
  'https://example.invalid/callback?code=test-only-code', '{"token":"test-only"}',
  'Bearer test-only-credential', 'eyJ0ZXN0.eyJ0ZXN0.test-only',
]) {
  assert.equal(getSafeWxReauthError({ message }, '请重新扫码'), '请重新扫码')
  assert.equal(getSafeWxReauthError({}, message), '微信认证失败，请重新获取二维码后重试')
}
assert.equal(getSafeWxReauthError({ error: { token: 'test-only' } }, '请重新扫码'), '请重新扫码')

const axiosSource = await read('src/utils/axios.ts')
const parsedAxios = ts.createSourceFile('axios.ts', axiosSource, ts.ScriptTarget.Latest, true)
const tokenClassifier = parsedAxios.statements.find(statement =>
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(decl => decl.name.getText() === 'isTokenInvalidError'))
const responseRegistration = parsedAxios.statements.find(statement =>
  ts.isExpressionStatement(statement) && statement.expression.expression?.getText() === 'axiosInstance.interceptors.response.use')
assert.ok(tokenClassifier && responseRegistration)
let onResponse, onRejected
let logoutCount = 0
const displayed = []
const axiosContext = vm.createContext({
  isWxReauthRequired, getSafeWxReauthError, Promise, console,
  axiosInstance: { interceptors: { response: { use: (success, failure) => { onResponse = success; onRejected = failure } } } },
  handleLogout: () => { logoutCount += 1 },
  throttledErrorMessage: text => displayed.push(text),
})
vm.runInContext(compile(`${tokenClassifier.getText()}\n${responseRegistration.getText()}`), axiosContext)
for (const status of [200, 400, 401]) {
  const response = { status, data: { success: false, code: 'WX_REAUTH_REQUIRED', message: '微信 token过期，请重新登录' } }
  if (status === 200) assert.equal(onResponse(response), response)
  else {
    const error = { response }
    await assert.rejects(onRejected(error), rejected => rejected === error)
  }
}
assert.equal(logoutCount, 0, '游戏凭据失效不能清除网站登录')
assert.equal(displayed.length, 0, '业务弹窗负责反馈，不再弹全局错误')
const upstreamError = {
  config: { url: '/api/game-accounts/wx/reauth/poll' },
  response: { status: 500, data: { message: 'token=test-only-credential' } },
}
await assert.rejects(onRejected(upstreamError), error => error === upstreamError)
assert.equal(displayed[0], '微信认证失败，请重新获取二维码后重试')
await assert.rejects(onResponse({ data: { message: '访问令牌无效或已过期', success: false } }))
assert.equal(logoutCount, 1, '网站自身登录过期仍须退出')

let configScript
for (const filename of ['src/components/ScriptConfig.vue', 'src/components/WxReauthModal.vue']) {
  const source = await read(filename)
  const parsed = parse(source, { filename })
  assert.deepEqual(parsed.errors, [])
  const script = compileScript(parsed.descriptor, { id: 'wx-reauth-test' })
  const template = compileTemplate({
    source: parsed.descriptor.template.content, filename, id: 'wx-reauth-test',
    compilerOptions: { bindingMetadata: script.bindings },
  })
  assert.deepEqual(template.errors, [])
  if (filename.endsWith('/ScriptConfig.vue')) configScript = parsed.descriptor.scriptSetup.content
}

// 提取并执行实际页面函数，HTTP、时钟和 Vue ref 用离线替身，不触发真实认证。
const names = new Set([
  'handleToggleAccount', 'isAccountAlreadyRunningError', 'completeReauthAfterScan',
  'getWxReauthData', 'getWxReauthStatus', 'getWxReauthError', 'getWxReauthQrImage',
  'cancelWxReauthRemote', 'resumeWxReauthRecovery', 'stopWxReauthPolling', 'resetWxReauthView',
  'openWxReauthPrompt', 'failWxReauth', 'completeWxReauth', 'pollWxReauth',
  'startWxReauthPolling', 'handleWxReauthStart', 'handleWxReauthCancel',
])
const parsedConfig = ts.createSourceFile('ScriptConfig.ts', configScript, ts.ScriptTarget.Latest, true)
const declarations = parsedConfig.statements.filter(statement =>
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => {
    const name = declaration.name.getText()
    return names.has(name) || name.startsWith('wxReauth') || name.startsWith('WX_REAUTH_')
  })).map(statement => statement.getText()).join('\n')
const flush = () => new Promise(resolve => setImmediate(resolve))
const copy = value => JSON.parse(JSON.stringify(value))
const required = { success: false, code: 'WX_REAUTH_REQUIRED', message: '微信登录凭据已失效' }
const scanning = flow => ({ success: true, data: { status: 'SCAN_REQUIRED', flow_id: flow, image_base64: 'data:image/png;base64,dGVzdA==' } })
const done = { success: true, data: { status: 'REAUTH_DONE' } }

function createPage(options = {}) {
  let now = 100000
  let timerId = 0
  const timers = new Map()
  const calls = [], messages = []
  const queue = { start: [required], reauth: [done], poll: [{ success: true, data: { status: 'WAITING' } }], cancel: [{ success: true, data: { status: 'CANCELLED' } }], ...options }
  const request = async (method, url, payload) => {
    calls.push({ method, url, payload: copy(payload || {}) })
    if (url.endsWith('/expired')) return { data: { success: true, data: { isExpired: false } } }
    const action = url.endsWith('/reauth/start') ? 'reauth' : url.endsWith('/poll') ? 'poll' : url.endsWith('/cancel') ? 'cancel' : 'start'
    const result = queue[action].length > 1 ? queue[action].shift() : queue[action][0]
    if (result instanceof Error || result?.response) throw result
    return { data: result }
  }
  const context = vm.createContext({
    isWxReauthRequired, getSafeWxReauthError, Promise, Set, AbortController,
    console: { error: (...args) => messages.push(args.join(' ')), warn: (...args) => messages.push(args.join(' ')) },
    Date: class extends Date { static now() { return now } },
    setInterval: fn => { timers.set(++timerId, fn); return timerId },
    clearInterval: id => timers.delete(id),
    ref: value => ({ value }),
    accounts: { value: [{ id: 7, platform: 3, record: { isStarted: false } }] },
    operatingAccounts: { value: new Set() },
    getAccountStartedStatus: account => account.record?.isStarted === true,
    fetchAndUpdateSingleAccountRecord: async id => calls.push({ method: 'record', id }),
    wait: async () => {},
    message: Object.fromEntries(['success', 'info', 'error', 'warning'].map(type => [type, text => messages.push(text)])),
    axios: { post: (url, payload) => request('POST', url, payload), get: (url, options) => request('GET', url, options?.params) },
  })
  vm.runInContext(compile(`${declarations}\nglobalThis.api = {
    handleToggleAccount, handleWxReauthStart, handleWxReauthCancel, pollWxReauth,
    wxReauthVisible, wxReauthPhase, wxReauthFlowId, wxReauthAccountId, wxReauthErrorMessage,
    wxReauthQrImage, accounts, operatingAccounts,
  };`), context)
  return { api: context.api, calls, messages, timers, queue, advance: ms => { now += ms } }
}

// HTTP 成功/失败返回均能弹微信提示；用户确认后可直接刷新成功并重启同一账号。
for (const initial of [required, { response: { status: 400, data: required } }]) {
  const page = createPage({ start: [initial, { success: true }] })
  await page.api.handleToggleAccount(7, 'inactive')
  assert.equal(page.api.wxReauthVisible.value, true)
  assert.equal(page.api.wxReauthPhase.value, 'prompt')
  assert.equal(page.calls.some(call => call.url?.includes('/reauth/')), false, '先由用户确认重新认证')
  await page.api.handleWxReauthStart()
  assert.equal(page.api.wxReauthVisible.value, false)
  assert.deepEqual(page.calls.filter(call => call.url?.endsWith('/reauth/start')).map(call => call.payload), [{ accountId: 7 }])
  assert.equal(page.calls.filter(call => call.url === '/api/game-accounts/7/start').length, 2)
  assert.equal(page.api.accounts.value[0].record.isStarted, true)
  assert.equal(page.api.operatingAccounts.value.size, 0)
}

// 刷新失败走重扫：仍绑定原 accountId，由后端选原 serverId/uin，不创建新账号。
{
  const page = createPage({ start: [required, { success: true }], reauth: [scanning('offline-flow-a')] })
  await page.api.handleToggleAccount(7, 'inactive')
  await page.api.handleWxReauthStart()
  await flush()
  assert.equal(page.api.wxReauthPhase.value, 'scanning')
  assert.match(page.api.wxReauthQrImage.value, /^data:image\//)
  page.queue.poll = [done]
  await page.api.pollWxReauth(7, 'offline-flow-a')
  assert.equal(page.api.wxReauthVisible.value, false)
  assert.equal(page.timers.size, 0)
  assert.ok(page.calls.filter(call => call.url?.endsWith('/poll')).every(call => call.payload.accountId === 7))
  assert.equal(page.calls.some(call => /\/bind|\/qrcode/.test(call.url || '')), false)
}

// 重绑后再次收到过期标志，只重新展示确认入口，不自动无限认证。
{
  const page = createPage({ start: [required] })
  await page.api.handleToggleAccount(7, 'inactive')
  await page.api.handleWxReauthStart()
  assert.equal(page.api.wxReauthVisible.value, true)
  assert.equal(page.api.wxReauthPhase.value, 'prompt')
  assert.equal(page.api.wxReauthAccountId.value, 7)
  assert.equal(page.calls.filter(call => call.url?.endsWith('/reauth/start')).length, 1)
  assert.equal(page.api.operatingAccounts.value.size, 0)
}

// 二维码超时后重新获取，旧会话先取消；取消后不再重启账号。
{
  const page = createPage({ reauth: [scanning('offline-flow-a'), scanning('offline-flow-b')] })
  await page.api.handleToggleAccount(7, 'inactive')
  await page.api.handleWxReauthStart()
  await flush()
  page.advance(301000)
  await page.api.pollWxReauth(7, 'offline-flow-a')
  assert.equal(page.api.wxReauthPhase.value, 'expired')
  await page.api.handleWxReauthStart()
  await flush()
  assert.equal(page.api.wxReauthFlowId.value, 'offline-flow-b')
  assert.equal(page.api.wxReauthPhase.value, 'scanning')
  assert.deepEqual(page.calls.find(call => call.url?.endsWith('/cancel')).payload, { flow_id: 'offline-flow-a', accountId: 7 })
  await page.api.handleWxReauthCancel()
  assert.equal(page.api.wxReauthVisible.value, false)
  assert.equal(page.timers.size, 0)
  assert.equal(page.calls.filter(call => call.url === '/api/game-accounts/7/start').length, 1)
}

// 多实例处理中继续轮询；认证故障隐藏上游认证正文。
{
  const page = createPage({ reauth: [{ success: true, data: { status: 'PROCESSING', flow_id: 'offline-recovery' } }] })
  await page.api.handleToggleAccount(7, 'inactive')
  await page.api.handleWxReauthStart()
  await flush()
  page.queue.poll = [{ success: false, data: { status: 'ERROR' }, message: 'token=test-only-credential' }]
  await page.api.pollWxReauth(7, 'offline-recovery')
  assert.equal(page.api.wxReauthPhase.value, 'error')
  assert.equal(page.api.wxReauthErrorMessage.value.includes('test-only-credential'), false)
  assert.equal(page.timers.size, 0)
}

console.log('微信重认证测试通过：游戏/网站凭据隔离、错误脱敏、Vue 编译、启动弹窗、原账号直接刷新/重扫、成功重启、过期重取、取消和多实例恢复。')
