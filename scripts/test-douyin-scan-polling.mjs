import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const modal = await readFile(new URL('../src/components/AddAccountModal.vue', import.meta.url), 'utf8')
const ast = ts.createSourceFile('modal.ts', parse(modal).descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const names = new Set(['douyinPollTimer', 'douyinBindingInProgress', 'stopDouyinPoll', 'startDouyinPoll', 'handleDouyinAfterScan'])
const declarations = ast.statements.filter(statement => ts.isVariableStatement(statement) &&
  statement.declarationList.declarations.some(declaration => names.has(declaration.name.getText())))
  .map(statement => statement.getText()).join('\n')
assert.equal(names.size, 5)
for (const name of names) assert.ok(declarations.includes(name))
const axiosSource = await readFile(new URL('../src/utils/axios.ts', import.meta.url), 'utf8')

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function createPage() {
  const errors = [], warnings = [], successes = [], calls = [], binds = [], requests = []
  const intervals = new Map()
  let nextTimer = 1, responseError
  const fakeInstance = {
    interceptors: {
      request: { use() {} },
      response: { use(_success, onError) { responseError = onError } },
    },
  }
  let logoutCount = 0
  const axiosContext = vm.createContext({
    exports: {},
    require(name) {
      if (name === 'axios') return { default: { create: () => fakeInstance } }
      if (name === 'ant-design-vue') return { message: { error: text => errors.push(text) } }
      if (name === '../router') return { default: { push() { logoutCount++ } } }
      if (name === './wxReauth') return { isWxReauthRequired: () => false }
      if (['./hmac', './fingerprint', './enc', './accountPasswordLogin'].includes(name)) return {}
      throw new Error(`Unexpected dependency: ${name}`)
    },
    console: { error() {} }, setTimeout() {},
    localStorage: { removeItem() {} },
    window: { location: { pathname: '/accounts' }, dispatchEvent() {} },
    CustomEvent: class {},
  })
  vm.runInContext(transpile(axiosSource), axiosContext)

  const refs = Object.fromEntries([
    ['douyinSid', 'test-scan'], ['isDouyinPolling', false], ['douyinQrB64', ''],
    ['isDouyinQrLoading', false], ['douyinScanStatus', 'waiting'], ['douyinSmsMsg', ''],
    ['loading', false], ['douyinDyToken', ''], ['douyinServers', []], ['douyinUid', ''],
    ['douyinLoginDone', false], ['serverList', []], ['currentStep', 'login'],
  ].map(([name, value]) => [name, { value }]))
  const page = vm.createContext({
    ...refs,
    console: { error() {} },
    message: { error: text => errors.push(text), warning: text => warnings.push(text), success: text => successes.push(text) },
    setInterval(callback) { const id = nextTimer++; intervals.set(id, callback); return id },
    clearInterval(id) { intervals.delete(id) },
    setTimeout(callback) { callback() },
    finishDouyinQrLoading(qr) { refs.douyinQrB64.value = qr },
    resetDouyinQrLoading() { refs.isDouyinQrLoading.value = false },
    axios: {
      get(url, config) {
        calls.push({ url, config })
        const request = deferred()
        requests.push(request)
        return request.promise.catch(error => responseError({ ...error, config: { ...config, url } }))
      },
      async post(url, body) {
        binds.push({ url, body })
        return { data: { ok: true, dyToken: 'offline-only', servers: [{ grpId: '7' }] } }
      },
    },
  })
  vm.runInContext(transpile(`${declarations}\nglobalThis.api = { startDouyinPoll, stopDouyinPoll };`), page)
  return {
    page, refs, errors, warnings, successes, calls, binds, requests, intervals,
    start() { page.api.startDouyinPoll(); return [...intervals.values()].at(-1) },
    get logoutCount() { return logoutCount },
    responseError,
  }
}

const confirmed = { scan_status: 'confirmed', game_ok: true, dy_code: 'offline-code', dy_anonymous_code: 'offline-anonymous', sessionid: 'offline-session' }
const httpError = (status = 502) => ({ response: { status, data: { ok: false, err: '扫码服务连接失败' } }, message: 'offline request failed' })
async function respond(page, tick, data) {
  const result = tick()
  page.requests.at(-1).resolve({ data })
  await result
}
async function fail(page, tick, error = httpError()) {
  const result = tick()
  page.requests.at(-1).reject(error)
  await result
}

// Reproduce the original toast path through the actual global Axios interceptor.
{
  const p = createPage()
  await assert.rejects(p.responseError({ ...httpError(), config: {} }))
  assert.deepEqual(p.errors, ['扫码服务连接失败'])
  console.log('PASS: reproduced the global toast from a failed polling response')
}
{
  const p = createPage(), tick = p.start()
  const first = tick()
  const second = tick(), third = tick()
  assert.equal(p.calls.length, 1, 'slow poll must not overlap subsequent ticks')
  await Promise.all([second, third])
  p.requests[0].resolve({ data: confirmed })
  await first
  await tick()
  assert.equal(p.binds.length, 1)
  assert.equal(p.binds[0].url, '/api/douyin/scan/bind')
  assert.equal(p.binds[0].body.dy_code, confirmed.dy_code)
  assert.equal(p.refs.currentStep.value, 'server')
  assert.equal(p.refs.isDouyinPolling.value, false)
  assert.equal(p.errors.length, 0)
  console.log('PASS: serialized slow polling and exactly one bind with the legacy game_ok gate')
}
{
  const p = createPage(), tick = p.start()
  await fail(p, tick)
  assert.equal(p.refs.isDouyinPolling.value, true)
  assert.equal(p.errors.length, 0)
  await respond(p, tick, confirmed)
  assert.equal(p.binds.length, 1)
  assert.equal(p.errors.length, 0)
  console.log('PASS: transient 502 followed by success produces no false failure toast')
}
{
  const p = createPage(), tick = p.start()
  await fail(p, tick)
  await fail(p, tick)
  await respond(p, tick, { scan_status: 'waiting' })
  await fail(p, tick)
  await fail(p, tick)
  assert.equal(p.errors.length, 0, 'successful response resets consecutive failures')
  await fail(p, tick)
  assert.equal(p.errors.length, 1)
  assert.equal(p.refs.douyinScanStatus.value, 'error')
  assert.equal(p.intervals.size, 0)
  console.log('PASS: persistent failure is shown once and stops polling')
}
for (const oldResult of ['success', 'error']) {
  const p = createPage(), oldTick = p.start()
  const oldPoll = oldTick()
  p.page.api.stopDouyinPoll()
  p.refs.douyinSid.value = 'test-new-scan'
  const newTick = p.start(), newPoll = newTick()
  if (oldResult === 'success') p.requests[0].resolve({ data: confirmed })
  else p.requests[0].reject(httpError())
  await oldPoll
  assert.equal(p.binds.length, 0)
  assert.equal(p.errors.length, 0)
  const duplicate = newTick()
  assert.equal(p.calls.length, 2, 'old finally must not release the new in-flight guard')
  await duplicate
  p.requests[1].resolve({ data: confirmed })
  await newPoll
  assert.equal(p.binds.length, 1)
}
console.log('PASS: old responses and failures cannot affect a restarted scan')
{
  const p = createPage(), tick = p.start(), poll = tick()
  p.page.api.stopDouyinPoll()
  p.requests[0].resolve({ data: confirmed })
  await poll
  assert.equal(p.binds.length, 0)
  assert.equal(p.errors.length, 0)
}
for (const status of [400, 403, 404]) {
  const p = createPage(), tick = p.start()
  await fail(p, tick, httpError(status))
  assert.equal(p.errors.length, 1)
  assert.equal(p.intervals.size, 0)
}
{
  const p = createPage(), tick = p.start()
  await fail(p, tick, { response: { status: 401, data: {} } })
  assert.equal(p.logoutCount, 1, 'website authentication must still use the global logout path')
  assert.equal(p.errors.length, 1)
  assert.equal(p.intervals.size, 0)
}
{
  const p = createPage(), tick = p.start()
  await respond(p, tick, { scan_status: 'verify_sms', msg: 'test SMS', qr_png_b64: 'test-qr' })
  assert.equal(p.refs.douyinSmsMsg.value, 'test SMS')
  assert.equal(p.refs.douyinQrB64.value, 'test-qr')
  await respond(p, tick, { scan_status: 'confirmed', game_ok: false })
  assert.equal(p.binds.length, 0)
  await respond(p, tick, { scan_status: 'error', scan_err: 'test authorization failure' })
  assert.deepEqual(p.warnings, ['test authorization failure'])
  assert.equal(p.intervals.size, 0)
}
console.log('PASS: stopped scans, terminal errors, global authentication, SMS and actual game failure')
console.log('All Douyin polling tests passed; HTTP, timers and storage were simulated.')
