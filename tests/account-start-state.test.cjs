// Real Vue component/HTTP-boundary regression; no requests reach a live game server.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const vue = require('vue')
const ts = require('typescript')
const sfc = require('@vue/compiler-sfc')
const root = path.resolve(__dirname, '..')
const prefix = fs.existsSync(path.join(root, 'src/reference/components/ScriptConfig.vue')) ? 'src/reference' : 'src'
const project = path.basename(root)
const record = (id = 7, isStarted = false) => ({ id: String(id), isStarted, record: null, status: 'offline' })
const result = (...records) => ({ code: 200, data: { results: records } })
const account = () => ({ id: 7, nickname: 'test', platform: 2, status: 'active', username: 'test', expire_time: '2099-01-01T00:00:00Z', record: record() })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

function harness(initial = {}) {
  const requests = [], messages = [], intervals = new Map(), timeouts = new Map()
  const plans = { records: [], posts: [], list: [], expired: { data: { success: true, data: { isExpired: false } } }, ...initial }
  let timerId = 0
  const timers = {
    setTimeout(fn, ms) { const id = ++timerId; if (ms <= 2000) queueMicrotask(fn); else timeouts.set(id, fn); return id },
    clearTimeout(id) { timeouts.delete(id) },
    setInterval(fn) { intervals.set(++timerId, fn); return timerId },
    clearInterval(id) { intervals.delete(id) },
  }
  const window = Object.assign(new EventTarget(), timers, { matchMedia: () => ({ matches: false }), location: { hostname: 'localhost', pathname: '/' } })
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const storage = { getItem: key => key === 'previousRoute' ? initial.previousRoute || null : null, removeItem() {}, setItem() {} }
  async function reply(value) { if (value instanceof Error) throw value; return await value }
  const http = {
    async get(url, config) {
      requests.push({ method: 'get', url, config })
      if (url.startsWith('/api/game-accounts/player_records')) return { data: await reply(plans.records.length ? plans.records.shift() : result(record())) }
      if (url.endsWith('/expired')) return reply(plans.expired)
      if (url === '/api/game-accounts/list') return { data: { success: true, data: await reply(plans.list) } }
      if (url === '/api/quota-settings/active') return { data: { success: true, data: [] } }
      throw new Error('Unexpected GET: ' + url)
    },
    async post(url, _body, config) {
      requests.push({ method: 'post', url, config })
      assert.match(url, /^\/api\/game-accounts\/7\/(start|stop)$/)
      return reply(plans.posts.length ? plans.posts.shift() : { data: { success: true } })
    },
  }
  const stub = vue.defineComponent({ render: () => null })
  const msg = Object.fromEntries(['info', 'success', 'warning', 'error'].map(type => [type, text => messages.push({ type, text })]))
  const modules = new Map()
  let responseError
  function evaluate(code, file) {
    const exports = {}
    const requireMock = id => {
      if (id === 'vue') return vue
      if (id === 'vue-router') return { useRouter: () => ({ push() {}, replace() {} }) }
      if (id === 'ant-design-vue') return { message: msg, Modal: { confirm() {} }, Tour: stub }
      if (id === '@ant-design/icons-vue') return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : stub })
      if (id.endsWith('playerRecordRetry')) return load('src/utils/playerRecordRetry.ts')
      if (id.endsWith('userUtils')) return { updateUserBalance: async () => true }
      if (id.endsWith('/axios')) return http
      if (id.endsWith('.vue')) return stub
      if (id === 'axios') return { create: () => ({ interceptors: { request: { use() {} }, response: { use(_ok, fail) { responseError = fail } } } }) }
      if (id.endsWith('/router')) return { push() {} }
      if (id === './hmac') return { signRequest() {} }
      if (id === './fingerprint') return { generateBrowserFingerprint() {} }
      if (id === './enc') return { d3: {} }
      if (id.startsWith('../utils/') || id.startsWith('./')) return load(prefix + '/utils/' + path.basename(id).replace(/\.ts$/, '') + '.ts')
      throw new Error('Unexpected import: ' + id)
    }
    const js = ts.transpileModule(code.replace(/import\.meta\.env/g, '({ DEV: true })'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { exports, require: requireMock, window, document, localStorage: storage, sessionStorage: storage, CustomEvent: class extends Event {},
      console: { log() {}, warn() {}, error() {} }, ...timers }, { filename: file })
    return exports
  }
  function load(file) {
    if (prefix !== 'src' && file.startsWith('src/') && !file.startsWith(prefix + '/')) file = prefix + file.slice(3)
    if (modules.has(file)) return modules.get(file)
    const baseline = process.env.START_BASELINE_DIR && path.join(process.env.START_BASELINE_DIR, file)
    const source = fs.readFileSync(baseline && fs.existsSync(baseline) ? baseline : path.join(root, file), 'utf8')
    let mod
    if (file.endsWith('.vue')) {
      const { descriptor, errors } = sfc.parse(source, { filename: file }); assert.deepEqual(errors, [])
      const script = sfc.compileScript(descriptor, { id: file })
      mod = evaluate(script.content, file)
      const template = sfc.compileTemplate({ id: file, filename: file, source: descriptor.template.content, compilerOptions: { bindingMetadata: script.bindings } })
      assert.deepEqual(template.errors, [])
      mod.default.render = evaluate(template.code, file + ':template').render
    } else mod = evaluate(source, file)
    modules.set(file, mod); return mod
  }
  const node = (type, text = '') => ({ type, text, props: {}, children: [], parent: null })
  const renderer = vue.createRenderer({
    createElement: tag => node(tag), createText: text => node('#text', text), createComment: text => node('#comment', text),
    setText: (n, text) => { n.text = text }, setElementText: (n, text) => { n.text = text; n.children = [] },
    patchProp: (n, key, _old, value) => { n.props[key] = value },
    insert(n, parent, anchor = null) { if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1); const i = parent.children.indexOf(anchor); parent.children.splice(i < 0 ? parent.children.length : i, 0, n); n.parent = parent },
    remove(n) { if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1) }, parentNode: n => n.parent, nextSibling: n => n.parent?.children[n.parent.children.indexOf(n) + 1] || null,
  })
  const app = renderer.createApp(load('src/components/ScriptConfig.vue').default, { user: { id: 1, points: 300 }, token: '' })
  app.config.warnHandler = () => {}
  const tree = node('root'); app.mount(tree)
  const text = n => n.text + n.children.map(text).join('')
  function button(label, n = tree) { if (n.type === 'a-button' && text(n).trim() === label) return n; for (const child of n.children) { const found = button(label, child); if (found) return found } }
  function statusDot(n = tree) { if (String(n.props.class).split(' ').includes('status-indicator')) return n; for (const child of n.children) { const found = statusDot(child); if (found) return found } }
  return { app, state: app._instance.setupState, requests, messages, plans, button, statusDot, window, document,
    tickIntervals() { for (const callback of [...intervals.values()]) callback() },
    utils: load('src/utils/playerRecordRetry.ts'),
    async settle() { for (let i = 0; i < 50; i++) await Promise.resolve(); await vue.nextTick() },
    errorInterceptor() { load('src/utils/axios.ts'); return responseError },
  }
}
async function ready(t) { const h = harness(); t.after(() => h.app.unmount()); await h.settle(); h.state.accounts = [account()]; h.requests.length = 0; h.messages.length = 0; return h }
const posts = h => h.requests.filter(r => r.method === 'post')
const error = (status, data) => Object.assign(new Error('test response'), { response: { status, data } })

test('preflight already running refreshes the buttons without sending start', async t => {
  const h = await ready(t); h.plans.records.push(result(record(7, true)))
  await h.state.handleToggleAccount(7, 'inactive'); await h.settle()
  assert.equal(posts(h).length, 0); assert.equal(h.button('启动').props.disabled, true); assert.equal(h.button('停止').props.disabled, false)
  assert.equal(h.messages.filter(m => m.type === 'error').length, 0)
})

test('already-running response in screenshot synchronizes state for both HTTP success and error responses', async t => {
  for (const payload of [{ data: { success: false, message: '操作失败: 账号已在运行中: 操作失败' } }, error(409, { message: '操作失败: 账号已在运行中: 操作失败' })]) {
    const h = await ready(t); h.plans.records.push(result(record()), result(record(7, true))); h.plans.posts.push(payload)
    await h.state.handleToggleAccount(7, 'inactive'); await h.settle()
    assert.equal(posts(h).length, 1); assert.equal(h.state.accounts[0].record.isStarted, true)
    assert.equal(h.messages.filter(m => m.type === 'error').length, 0)
    assert.ok(h.messages.some(m => m.type === 'info' && m.text.includes('无需重复启动')))
    assert.equal(posts(h)[0].config.handleErrorLocally, true)
  }
})

test('missing or invalid state retries up to three reads then prevents an unverified start', async t => {
  const h = await ready(t); h.plans.records.push(result(), result({ id: '7', status: 'error', isStarted: false }), result({ id: '7' }))
  await h.state.handleToggleAccount(7, 'inactive')
  assert.equal(h.requests.filter(r => r.url.includes('player_records')).length, 3)
  assert.equal(posts(h).length, 0); assert.equal(h.state.operatingAccounts.has(7), false)
  assert.ok(h.messages.some(m => m.type === 'warning' && m.text.includes('暂未获取到')))
})

test('state becomes available on retry, and stale post-start state is retried without undoing running state', async t => {
  const h = await ready(t); h.plans.records.push(result(), result(record()), result(record()), result(record()), result(record(7, true)))
  await h.state.handleToggleAccount(7, 'inactive')
  assert.equal(posts(h).length, 1); assert.equal(h.state.accounts[0].record.isStarted, true)
  assert.equal(h.requests.filter(r => r.url.includes('player_records')).length, 5)
})

test('rapid double click is locked before asynchronous state or quota checks', async t => {
  const h = await ready(t); const pending = deferred(); h.plans.expired = pending.promise
  h.plans.records.push(result(record()), result(record(7, true)))
  const first = h.state.handleToggleAccount(7, 'inactive'); const second = h.state.handleToggleAccount(7, 'inactive')
  await h.settle(); assert.equal(h.state.operatingAccounts.has(7), true)
  pending.resolve({ data: { success: true, data: { isExpired: false } } }); await Promise.all([first, second])
  assert.equal(posts(h).length, 1); assert.equal(h.state.operatingAccounts.has(7), false)
})

test('expired quota and normal start failures are not retried or reported as success; stop still works', async t => {
  const h = await ready(t); h.plans.expired = { data: { success: true, data: { isExpired: true } } }
  await h.state.handleToggleAccount(7, 'inactive'); assert.equal(posts(h).length, 0)
  h.plans.expired.data.data.isExpired = false; h.plans.posts.push({ data: { success: false, message: '游戏登录失败' } })
  await h.state.handleToggleAccount(7, 'inactive'); assert.equal(posts(h).length, 1)
  assert.ok(h.messages.some(m => m.type === 'error' && m.text === '游戏登录失败'))
  h.state.accounts[0].record.isStarted = true; h.plans.records.push(result(record()))
  await h.state.handleToggleAccount(7, 'active'); assert.equal(posts(h).at(-1).url, '/api/game-accounts/7/stop'); assert.equal(h.state.accounts[0].record.isStarted, false)
})

test('partial batch retries only missing IDs and accepts stopped accounts with record:null', async t => {
  const h = await ready(t); const calls = [], delays = []; const replies = [result(record(7)), result({ id: '8', isStarted: false, status: 'failed' }), result(record(8, true))]
  const data = await h.utils.fetchPlayerRecordsWithRetry([7, 8], async ids => { calls.push([...ids]); return replies.shift() }, { wait: async ms => { delays.push(ms) } })
  assert.deepEqual(calls, [[7, 8], [8], [8]]); assert.deepEqual(delays, [500, 1000]); assert.equal(data.successCount, 2)
  assert.equal(data.records[0].record, null); assert.equal(data.records[0].isStarted, false)
})

test('read exceptions are retried, but authorization failures are not', async t => {
  const h = await ready(t)
  for (const status of [401, 403, 500]) {
    let calls = 0
    const data = await h.utils.fetchPlayerRecordsWithRetry([7], async () => { calls++; if (calls === 1) throw error(status, {}); return result(record()) }, { wait: async () => {} })
    assert.equal(calls, status === 500 ? 2 : 1); assert.equal(data.success, status === 500)
  }
})

test('late state response cannot overwrite a newer request and unmount cannot launch an account', async t => {
  const h = await ready(t); const old = deferred(); h.plans.records.push(old.promise, result(record(7, true)))
  const first = h.state.fetchAndUpdateSingleAccountRecord(7)
  await h.state.fetchAndUpdateSingleAccountRecord(7); old.resolve(result(record()))
  assert.equal(await first, false); assert.equal(h.state.accounts[0].record.isStarted, true)
  const pending = deferred(); h.plans.records.push(pending.promise)
  const start = h.state.handleToggleAccount(7, 'inactive'); h.app.unmount(); pending.resolve(result(record())); await start
  assert.equal(posts(h).length, 0)
})

test('locally handled errors do not show generic red toast, while unrelated errors still do', async t => {
  const h = await ready(t); const handler = h.errorInterceptor()
  const handled = error(409, { message: '账号已在运行中' }); handled.config = { handleErrorLocally: true }
  await assert.rejects(handler(handled)); assert.equal(h.messages.length, 0)
  await assert.rejects(handler(error(500, { message: '普通接口失败' })))
  assert.ok(h.messages.some(m => m.type === 'error' && m.text === '普通接口失败'))
})

test('late list refresh cannot undo a confirmed startup state', async t => {
  const h = await ready(t); const pending = deferred(); h.plans.list = [account()]
  h.plans.records.push(pending.promise)
  const listRefresh = h.state.fetchGameAccounts(); await h.settle()
  h.plans.records.push(result(record()), result(record(7, true)))
  await h.state.handleToggleAccount(7, 'inactive'); pending.resolve(result(record())); await listRefresh
  assert.equal(h.state.accounts[0].record.isStarted, true)
})

test('exhausted post-start reads preserve confirmed running state and never resend start', async t => {
  const h = await ready(t); h.plans.records.push(result(record()), result(), result(record()), result())
  await h.state.handleToggleAccount(7, 'inactive'); await h.settle()
  assert.equal(posts(h).length, 1); assert.equal(h.button('启动').props.disabled, true)
  assert.ok(h.messages.some(m => m.type === 'warning' && m.text.includes('暂未同步')))
})

test('invalid-token responses stop retries even after the interceptor converts them to an Error', async t => {
  const h = await ready(t); let calls = 0
  await h.utils.fetchPlayerRecordsWithRetry([7], async () => { calls++; throw new Error('Token invalid') }, { wait: async () => {} })
  assert.equal(calls, 1)
})


test('late periodic refresh cannot undo a completed stop', async t => {
  const h = await ready(t); h.state.accounts[0].record.isStarted = true
  const pending = deferred(); h.plans.records.push(pending.promise)
  const refresh = h.state.refreshAllAccountsData(); await h.settle()
  h.plans.records.push(result(record()))
  await h.state.handleToggleAccount(7, 'active'); pending.resolve(result(record(7, true))); await refresh
  assert.equal(h.state.accounts[0].record.isStarted, false)
})

if (prefix === 'src/reference') test('ZMSL keeps active-only polling and prevents overlapping refreshes', async t => {
  const h = await ready(t); const pending = deferred()
  h.state.accounts = [{ ...account(), record: record(7, true) }, { ...account(), id: 8, record: record(8, false) }]
  h.plans.records.push(pending.promise)
  const first = h.state.refreshAllAccountsData(); const second = h.state.refreshAllAccountsData()
  await h.settle()
  const reads = h.requests.filter(r => r.url.includes('player_records'))
  assert.equal(reads.length, 1); assert.equal(reads[0].url, '/api/game-accounts/player_records?ids=7')
  pending.resolve(result(record(7, true))); await Promise.all([first, second])
})

if (project === 'winter-webserver') test('winter keeps complete ordered ID-less response compatibility without guessing partial batches', async t => {
  const h = await ready(t)
  h.plans.records.push(result({ isStarted: true, record: null, status: 'online' }))
  assert.equal(await h.state.fetchAndUpdateSingleAccountRecord(7), true)
  assert.equal(h.state.accounts[0].record.isStarted, true)
  h.plans.records.push(result({ isStarted: false, record: null }, { isStarted: true, record: null }))
  const full = await h.state.fetchPlayerRecords([7, 8])
  assert.deepEqual(Array.from(full.records, r => r.id), ['7', '8'])
  h.plans.records.push(result({ isStarted: true }), result(record(7, false), record(8, true)))
  const partial = await h.state.fetchPlayerRecords([7, 8])
  assert.equal(partial.records[0].isStarted, false)
})


test('login with temporarily missing state stays unknown then synchronizes without a page reload', async t => {
  const h = harness({ previousRoute: 'Login', list: [account()], records: [result(), result(), result(), result(record(7, true))] })
  t.after(() => h.app.unmount()); await h.settle()
  assert.equal(h.state.accounts.length, 1)
  assert.match(h.statusDot().props.class, /unknown/)
  assert.equal(h.statusDot().props['aria-label'], '状态待同步')
  assert.equal(h.button('启动').props.disabled, true)
  assert.equal(h.button('停止').props.disabled, true)
  h.tickIntervals(); await h.settle()
  assert.equal(h.state.accounts[0].record.isStarted, true)
  assert.match(h.statusDot().props.class, /online/)
  assert.equal(h.button('启动').props.disabled, true)
  assert.equal(h.button('停止').props.disabled, false)
  assert.equal(posts(h).length, 0)
  assert.equal(h.requests.filter(r => r.url === '/api/game-accounts/list').length, 1)
})

test('login stale stopped snapshot is reconciled by the next background read', async t => {
  const h = harness({ previousRoute: 'Login', list: [account()], records: [result(record()), result(record(7, true))] })
  t.after(() => h.app.unmount()); await h.settle()
  assert.equal(h.state.accounts[0].record.isStarted, false)
  h.tickIntervals(); await h.settle()
  assert.equal(h.state.accounts[0].record.isStarted, true)
  assert.equal(posts(h).length, 0)
})

test('transient list state failure preserves an already confirmed running record', async t => {
  const h = await ready(t)
  h.state.accounts[0].record.isStarted = true
  h.plans.list = [account()]; h.plans.records.push(result(), result(), result())
  await h.state.fetchGameAccounts(); await h.settle()
  assert.equal(h.state.accounts[0].record?.isStarted, true)
  assert.equal(h.button('停止').props.disabled, false)
})

test('fresh mount keeps explicit stopped state distinct from unknown and retries only missing records', async t => {
  const h = harness({ list: [account(), { ...account(), id: 8 }, { ...account(), id: 9 }], records: [result(record(7, true), record(8, false)), result(), result(), result(record(7, true), record(8, false), record(9, true))] })
  t.after(() => h.app.unmount()); await h.settle()
  assert.deepEqual(h.requests.filter(r => r.url.includes('player_records')).map(r => r.url.split('ids=')[1]), ['7,8,9', '9', '9'])
  assert.equal(h.state.getAccountStatusLabel(h.state.accounts[0]), '已启用')
  assert.equal(h.state.getAccountStatusLabel(h.state.accounts[1]), '未启用')
  assert.equal(h.state.getAccountStatusLabel(h.state.accounts[2]), '状态待同步')
  h.tickIntervals(); await h.settle()
  assert.equal(h.state.accounts[1].record.isStarted, false)
  assert.equal(h.state.accounts[2].record.isStarted, true)
  assert.equal(posts(h).length, 0)
})

test('visible polling is single-flight and resumes immediately when the page becomes visible', async t => {
  const h = await ready(t); h.state.accounts[0].record.isStarted = true; await h.settle()
  const pending = deferred(); h.plans.records.push(pending.promise)
  h.tickIntervals(); h.tickIntervals(); h.window.dispatchEvent(new Event('pageshow')); await h.settle()
  assert.equal(h.requests.filter(r => r.url.includes('player_records')).length, 1)
  pending.resolve(result(record(7, true))); await h.settle()
  h.document.visibilityState = 'hidden'
  h.tickIntervals(); h.document.dispatchEvent(new Event('visibilitychange')); await h.settle()
  assert.equal(h.requests.filter(r => r.url.includes('player_records')).length, 1)
  h.plans.records.push(result(record(7, false)))
  h.document.visibilityState = 'visible'; h.document.dispatchEvent(new Event('visibilitychange')); await h.settle()
  assert.equal(h.state.accounts[0].record.isStarted, false)
  assert.equal(posts(h).length, 0)
})

test('unmount cancels pending polling and removes interval and visibility listeners', async () => {
  const h = harness({ list: [account()], records: [result(record(7, true))] }); await h.settle()
  const pending = deferred(); h.plans.records.push(pending.promise)
  h.tickIntervals(); await h.settle(); const reads = h.requests.length
  h.app.unmount(); pending.resolve(result()); await h.settle()
  h.tickIntervals(); h.document.dispatchEvent(new Event('visibilitychange')); h.window.dispatchEvent(new Event('pageshow')); await h.settle()
  assert.equal(h.requests.length, reads)
  assert.equal(h.state.accounts[0].record.isStarted, true)
})

test('newer list load wins even when an older list response arrives last', async t => {
  const h = await ready(t); const pending = deferred()
  h.plans.list = pending.promise
  const old = h.state.fetchGameAccounts(); await h.settle()
  h.plans.list = [{ ...account(), nickname: 'new list' }]; h.plans.records.push(result(record(7, true)))
  await h.state.fetchGameAccounts(); pending.resolve([account()]); await old; await h.settle()
  assert.equal(h.state.accounts[0].nickname, 'new list')
  assert.equal(h.state.accounts[0].record.isStarted, true)
  assert.equal(h.requests.filter(r => r.url.includes('player_records')).length, 1)
  assert.equal(h.state.isLoading, false)
})

test('starting a list reload invalidates in-flight polling and removed accounts stay removed', async t => {
  const h = await ready(t); h.state.accounts[0].record.isStarted = true; const pending = deferred()
  h.plans.records.push(pending.promise)
  const old = h.state.refreshAllAccountsData(); await h.settle()
  h.plans.list = [account()]; h.plans.records.push(result(record(7, true)))
  await h.state.fetchGameAccounts(); pending.resolve(result(record(7, false))); await old
  assert.equal(h.state.accounts[0].record.isStarted, true)
  const removal = deferred(); h.plans.records.push(removal.promise)
  const oldAgain = h.state.refreshAllAccountsData(); await h.settle()
  h.plans.list = []; await h.state.fetchGameAccounts()
  removal.resolve(result(record(7, true))); await oldAgain; await h.settle()
  assert.equal(h.state.accounts.length, 0)
  const requests = h.requests.length; h.tickIntervals(); await h.settle()
  assert.equal(h.requests.length, requests)
})
