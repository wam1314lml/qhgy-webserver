// 执行实际 Vue 处理函数及 Axios 错误拦截器；仅使用合成数据，不访问真实认证服务。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const component = await readFile(new URL('../src/components/ScriptConfig.vue', import.meta.url), 'utf8')
const modal = await readFile(new URL('../src/components/DouyinReauthModal.vue', import.meta.url), 'utf8')
const axiosSource = await readFile(new URL('../src/utils/axios.ts', import.meta.url), 'utf8')
function extract(source, names) {
  const ast = ts.createSourceFile('component.ts', parse(source).descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
  return names.map(name => {
    const statement = ast.statements.find(node => ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(declaration => declaration.name.getText() === name))
    assert.ok(statement, `实际组件缺少 ${name}`)
    return statement.getText()
  }).join('\n')
}
const declarations = extract(component, ['handleDouyinReauthSubmitSms', 'handleDouyinReauthCancel'])
const childDeclaration = extract(modal, ['handleSubmitSms'])
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function createPage() {
  const errors = [], successes = [], calls = [], requests = []
  let responseError, logoutCount = 0, stopCount = 0
  const fakeInstance = { interceptors: {
    request: { use() {} }, response: { use(_success, error) { responseError = error } },
  } }
  vm.runInNewContext(transpile(axiosSource), {
    exports: {},
    require(name) {
      if (name === 'axios') return { default: { create: () => fakeInstance } }
      if (name === 'ant-design-vue') return { message: { error: text => errors.push(text) } }
      if (name === '../router') return { default: { push() { logoutCount++ } } }
      if (name === './wxReauth') return { isWxReauthRequired: () => false }
      if (['./hmac', './fingerprint', './enc', './accountPasswordLogin'].includes(name)) return {}
      throw Error(`Unexpected dependency: ${name}`)
    },
    console: { error() {} }, setTimeout() {}, localStorage: { removeItem() {} },
    window: { location: { pathname: '/accounts' }, dispatchEvent() {} }, CustomEvent: class {},
  })
  const refs = Object.fromEntries([
    ['douyinReauthVisible', true], ['douyinReauthHandled', false], ['douyinReauthAccountId', 1],
    ['douyinReauthSid', 'synthetic-sid'], ['douyinReauthScanStatus', 'verify_sms'], ['douyinReauthQrB64', ''],
  ].map(([name, value]) => [name, { value }]))
  const context = vm.createContext({
    ...refs,
    message: { error: text => errors.push(text), success: text => successes.push(text), info() {} },
    stopDouyinReauthPolling() { stopCount++ },
    axios: { post(url, body, config) {
      calls.push({ url, body, config })
      const request = deferred(); requests.push(request)
      return request.promise.catch(error => responseError({ ...error, config: { ...config, url } }))
    } },
  })
  vm.runInContext(transpile(`${declarations}\nglobalThis.api = { handleDouyinReauthSubmitSms, handleDouyinReauthCancel };`), context)
  return { refs, errors, successes, calls, requests,
    submit(sid = 'synthetic-sid') { return context.api.handleDouyinReauthSubmitSms(sid, '000000') },
    cancel: context.api.handleDouyinReauthCancel,
    get logoutCount() { return logoutCount }, get stopCount() { return stopCount },
  }
}
const failure = (status, data = { err: '合成会话校验失败' }) => ({ response: { status, data } })
let count = 0
async function test(name, run) { await run(); count++; console.log(`PASS ${name}`) }

await test('提交当前账号与会话，成功只提示一次', async () => {
  const page = createPage(), pending = page.submit()
  assert.equal(page.calls[0].url, '/api/douyin/scan/verify')
  assert.deepEqual(JSON.parse(JSON.stringify(page.calls[0].body)), { sid: 'synthetic-sid', code: '000000', accountId: 1 })
  assert.equal(page.calls[0].config.handleErrorLocally, true)
  page.requests[0].resolve({ data: { ok: true } })
  assert.equal((await pending).ok, true)
  assert.equal(page.successes.length, 1); assert.equal(page.errors.length, 0)
})
await test('403、410、502 通过真实全局拦截器后均只提示一次', async () => {
  for (const status of [403, 410, 502]) {
    const page = createPage(), pending = page.submit()
    page.requests[0].reject(failure(status))
    assert.equal((await pending).ok, false)
    assert.deepEqual(page.errors, ['合成会话校验失败'])
  }
})
await test('保留业务失败原因并兼容 msg；网络异常只提示一次', async () => {
  for (const data of [{ ok: false, err: '合成短信失败' }, { ok: false, msg: '合成短信失败' }]) {
    const page = createPage(), pending = page.submit()
    page.requests[0].resolve({ data })
    assert.equal((await pending).msg, '合成短信失败')
    assert.deepEqual(page.errors, ['合成短信失败'])
  }
  const page = createPage(), pending = page.submit()
  page.requests[0].reject({ request: {}, message: 'synthetic network failure' })
  assert.equal((await pending).ok, false)
  assert.deepEqual(page.errors, ['提交验证码失败'])
})
await test('401 保留统一退出且不再追加局部错误提示', async () => {
  const page = createPage(), pending = page.submit()
  page.requests[0].reject(failure(401, {}))
  assert.equal((await pending).ok, false)
  assert.equal(page.logoutCount, 1); assert.equal(page.errors.length, 1)
})
await test('取消、换码、换账号及已完成后忽略晚到短信结果', async () => {
  for (const change of [page => page.cancel(), page => { page.refs.douyinReauthSid.value = 'new-sid' },
    page => { page.refs.douyinReauthAccountId.value = 2 }, page => { page.refs.douyinReauthHandled.value = true }]) {
    for (const reject of [true, false]) {
      const page = createPage(), pending = page.submit()
      change(page)
      if (reject) page.requests[0].reject(failure(403))
      else page.requests[0].resolve({ data: { ok: true } })
      assert.equal((await pending).ok, false)
      assert.equal(page.successes.length, 0); assert.equal(page.errors.length, 0)
    }
  }
})
await test('旧会话不能发起请求，取消清理会话并停止轮询', async () => {
  const page = createPage()
  assert.equal((await page.submit('old-sid')).ok, false)
  page.cancel()
  assert.equal(page.refs.douyinReauthSid.value, '')
  assert.equal(page.refs.douyinReauthAccountId.value, 0)
  assert.equal(page.stopCount, 1)
  assert.equal((await page.submit()).ok, false)
  assert.equal(page.calls.length, 0)
  assert.match(component, /<DouyinReauthModal\s+:key="douyinReauthSid"/)
})
function createModal() {
  const smsCode = { value: ' 000000 ' }, submitting = { value: false }, requests = []
  const props = { sid: 'synthetic-sid', onSubmitSms(sid, code) {
    assert.equal(sid, 'synthetic-sid'); assert.equal(code, '000000')
    const request = deferred(); requests.push(request); return request.promise
  } }
  const context = vm.createContext({ props, smsCode, submitting })
  vm.runInContext(transpile(`${childDeclaration}\nglobalThis.submit = handleSubmitSms;`), context)
  return { props, smsCode, submitting, requests, submit: context.submit }
}
await test('重复回车只提交一次；失败保留输入，成功清空输入', async () => {
  for (const ok of [false, true]) {
    const modal = createModal(), pending = modal.submit()
    await modal.submit()
    assert.equal(modal.requests.length, 1); assert.equal(modal.submitting.value, true)
    modal.requests[0].resolve({ ok }); await pending
    assert.equal(modal.smsCode.value, ok ? '' : ' 000000 ')
    assert.equal(modal.submitting.value, false)
  }
})
await test('短信返回后不清除新输入或另一二维码的输入', async () => {
  for (const change of [modal => { modal.smsCode.value = '111111' }, modal => { modal.props.sid = 'new-sid' }]) {
    const modal = createModal(), pending = modal.submit()
    change(modal); const value = modal.smsCode.value
    modal.requests[0].resolve({ ok: true }); await pending
    assert.equal(modal.smsCode.value, value); assert.equal(modal.submitting.value, false)
  }
})
console.log(`抖音重认证短信：${count} 组离线回归通过。`)
