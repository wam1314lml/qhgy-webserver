// Mount the real dashboard -> quota -> recharge chain with an in-memory Vue renderer.
// All HTTP calls and timers are mocked; these tests never create a real payment.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(process.env.RECHARGE_TEST_ROOT || path.join(__dirname, '..'))
const projectRequire = require('node:module').createRequire(path.join(root, 'package.json'))
const vue = projectRequire('vue')
const ts = projectRequire('typescript')
const sfc = projectRequire('@vue/compiler-sfc')
const sourcePrefix = fs.existsSync(path.join(root, 'src/reference/components/Dashboard.vue')) ? 'src/reference' : 'src'

function createHarness() {
  const storage = new Map()
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  }
  localStorage.setItem('user', JSON.stringify({ id: 7, username: 'test-user', points: 300 }))
  localStorage.setItem('token', 'test-only')
  const window = new EventTarget()
  const document = new EventTarget()
  document.visibilityState = 'visible'
  window.matchMedia = () => ({ matches: false })
  window.location = { hostname: 'localhost' }
  const intervals = new Map()
  const intervalDelays = new Map()
  const timeouts = new Map()
  let timerId = 0
  const timers = {
    setInterval: (fn, delay) => { intervals.set(++timerId, fn); intervalDelays.set(timerId, delay); return timerId },
    clearInterval: (id) => intervals.delete(id),
    setTimeout: (fn) => { timeouts.set(++timerId, fn); return timerId },
    clearTimeout: (id) => timeouts.delete(id),
  }
  Object.assign(window, timers)
  class CustomEvent extends Event {
    constructor(type, init) { super(type); this.detail = init?.detail }
  }
  const balanceResponses = []
  let points = 300
  let status = 'pending'
  const axios = {
    async get(url) {
      if (url === '/api/points/balance') {
        if (balanceResponses.length) return await balanceResponses.shift()()
        return { data: { points } }
      }
      if (url.startsWith('/api/payment/check-status/')) return { data: { status } }
      if (url === '/api/payment/recharge-config') return { data: { config: { min_quantity: 1, max_quantity: 9999, unit_price: 1, bonus_rate: 0 } } }
      if (url === '/api/payment/recharge-packages') return { data: { packages: [{ id: 1, points: 30, price: 30, enabled: 1 }] } }
      if (url === '/api/payment/payment-methods') return { data: { success: true, data: [{ payment_method: 'wechat' }] } }
      if (url === '/api/game-accounts/list') return { data: { success: true, data: [] } }
      if (url === '/api/quota-settings/active') return { data: { success: true, data: [] } }
      if (url === '/api/domain-redirect/status') return { data: { success: true, data: { enabled: false } } }
      throw new Error('Unexpected HTTP request: ' + url)
    },
    async post(url) {
      assert.match(url, /^\/api\/payment\/manual-check-alipay\//)
      return { data: { success: status === 'success' } }
    },
  }
  const stub = vue.defineComponent({ render: () => null })
  const modules = new Map()
  const realComponents = new Set(['Dashboard.vue', 'ScriptConfig.vue', 'RechargeModal.vue', 'TopNavBar.vue'])
  function evaluate(code, filename) {
    const exports = {}
    const requireMock = (id) => {
      if (id === 'vue') return vue
      if (id === 'vue-router') return { useRouter: () => ({ push() {}, replace() {} }) }
      if (id === 'ant-design-vue') return { message: { success() {}, error() {}, info() {}, warning() {} }, Modal: { confirm() {} }, Tour: stub }
      if (id === '@ant-design/icons-vue') return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : stub })
      if (id.endsWith('axios')) return axios
      if (id.endsWith('userUtils')) return load(sourcePrefix + '/utils/userUtils.ts')
      if (id.endsWith('playerRecordRetry')) return load(sourcePrefix + '/utils/playerRecordRetry.ts')
      if (id.endsWith('.vue')) return realComponents.has(path.basename(id)) ? load(sourcePrefix + '/components/' + path.basename(id)).default : stub
      if (/\.(jpg|png|svg)$/.test(id)) return 'test-image'
      if (id.startsWith('.')) {
        const relative = path.posix.normalize(path.posix.join(path.posix.dirname(filename), id))
        for (const suffix of ['', '.ts', '.js', '.json']) {
          const target = relative + suffix
          if (fs.existsSync(path.join(root, target)) && fs.statSync(path.join(root, target)).isFile()) {
            if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(path.join(root, target), 'utf8'))
            return load(target)
          }
        }
      }
      throw new Error('Unexpected import: ' + id)
    }
    const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, {
      exports, require: requireMock, localStorage, sessionStorage: { getItem: () => null, removeItem() {} },
      window, document, CustomEvent, navigator: { userAgent: 'test' },
      console: { log() {}, error() {}, warn() {} }, ...timers,
    }, { filename })
    return exports
  }
  function load(file) {
    if (modules.has(file)) return modules.get(file)
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    let result
    if (file.endsWith('.vue')) {
      const { descriptor, errors } = sfc.parse(source, { filename: file })
      assert.deepEqual(errors, [])
      const script = sfc.compileScript(descriptor, { id: file })
      result = evaluate(script.content, file)
      const template = sfc.compileTemplate({ id: file, filename: file, source: descriptor.template.content, compilerOptions: { bindingMetadata: script.bindings } })
      assert.deepEqual(template.errors, [])
      result.default.render = evaluate(template.code, file + ':template').render
      result.default.__file = file
    } else result = evaluate(source, file)
    modules.set(file, result)
    return result
  }
  const element = (type, text = '') => ({ type, text, children: [], props: {}, parent: null })
  const renderer = vue.createRenderer({
    createElement: (tag) => element(tag), createText: (text) => element('#text', text), createComment: (text) => element('#comment', text),
    setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text; node.children = [] },
    patchProp: (node, key, _old, value) => { node.props[key] = value },
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      const index = parent.children.indexOf(anchor)
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
      node.parent = parent
    },
    remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) },
    parentNode: (node) => node.parent, nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
  })
  const app = renderer.createApp(load(sourcePrefix + '/components/Dashboard.vue').default)
  app.config.warnHandler = () => {}
  app.component('a-modal', { props: ['open'], setup: (props, { slots }) => () => props.open ? vue.h('modal', slots.default?.()) : null })
  const node = element('root')
  app.mount(node)
  function instance(name, from = app._instance) {
    function visit(vnode) {
      if (!vnode) return null
      if (vnode.component) {
        if (vnode.component.type.__file?.endsWith('/' + name)) return vnode.component
        return visit(vnode.component.subTree)
      }
      if (Array.isArray(vnode.children)) for (const child of vnode.children) { const found = visit(child); if (found) return found }
      return null
    }
    return visit(from.subTree)
  }
  function find(node, cls) {
    if (String(node.props.class || '').split(' ').includes(cls)) return node
    for (const child of node.children) { const found = find(child, cls); if (found) return found }
    return null
  }
  const text = (node) => node ? node.text + node.children.map(text).join('') : ''
  const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); await vue.nextTick() }
  return {
    app, instance, settle, localStorage, window,
    setPayment: (balance, paymentStatus = 'success') => { points = balance; status = paymentStatus },
    queueBalance: (...responses) => balanceResponses.push(...responses),
    async poll() { const polls = [...intervals].filter(([id]) => intervalDelays.get(id) === 2000); assert.equal(polls.length, 1); await polls[0][1](); await settle() },
    navText: () => text(find(node, 'balance-amount')),
    successText: () => text(find(node, 'success-info')),
    utils: load(sourcePrefix + '/utils/userUtils.ts'),
  }
}

test('consecutive recharges refresh the rendered quota-entry success balance, header and quota state', async (t) => {
  const h = createHarness()
  t.after(() => h.app.unmount())
  await h.settle()
  const quota = h.instance('ScriptConfig.vue')
  assert.ok(quota)
  const recharge = h.instance('RechargeModal.vue', quota)
  for (const balance of [330, '360']) {
    quota.setupState.handleOpenRecharge()
    await h.settle()
    recharge.setupState.orderId = 'test-order-' + balance
    recharge.setupState.startPaymentPolling(recharge.setupState.orderId)
    h.setPayment(balance, 'pending')
    await h.poll()
    assert.equal(recharge.setupState.currentStep, 0)
    h.setPayment(balance)
    await h.poll()
    assert.equal(h.navText(), String(balance))
    assert.match(h.successText(), new RegExp('当前余额: ' + balance + ' 点'))
    assert.equal(quota.setupState.userPoints, Number(balance))
    if (recharge.setupState.handleSuccessClose) recharge.setupState.handleSuccessClose()
    else await recharge.setupState.handleClose()
    await h.settle()
  }
  quota.setupState.handleOpenRecharge()
  await h.settle()
  recharge.setupState.orderId = 'test-manual'
  h.setPayment('390')
  await recharge.setupState.handleManualCheckAlipay()
  await h.settle()
  assert.match(h.successText(), /当前余额: 390 点/)
  h.setPayment(0)
  await h.utils.updateUserBalance()
  await h.settle()
  assert.match(h.successText(), /当前余额: 0 点/)
  assert.equal(quota.setupState.userPoints, 0)
})

test('header-entry recharge and cross-tab user updates also reach the quota modal', async (t) => {
  const h = createHarness()
  t.after(() => h.app.unmount())
  await h.settle()
  const nav = h.instance('TopNavBar.vue')
  const quota = h.instance('ScriptConfig.vue')
  nav.setupState.openRechargeModal()
  await h.settle()
  const recharge = h.instance('RechargeModal.vue', nav)
  h.setPayment(330)
  recharge.setupState.orderId = 'test-header-order'
  recharge.setupState.startPaymentPolling(recharge.setupState.orderId)
  await h.poll()
  assert.equal(h.navText(), '330')
  assert.equal(quota.setupState.currentUser.points, 330)
  assert.equal(quota.setupState.userPoints, 330)
  const saved = JSON.parse(h.localStorage.getItem('user'))
  h.localStorage.setItem('user', JSON.stringify({ ...saved, points: 360 }))
  const event = new Event('storage')
  event.key = 'user'
  h.window.dispatchEvent(event)
  await h.settle()
  assert.equal(quota.setupState.currentUser.points, 360)
  assert.equal(quota.setupState.userPoints, 360)
})


test('balance refresh accepts decimal strings and zero, rejects bad values, and cannot overwrite newer requests or another account', async (t) => {
  const h = createHarness()
  t.after(() => h.app.unmount())
  await h.settle()
  h.setPayment('330.50')
  assert.equal(await h.utils.updateUserBalance(), true)
  await h.settle()
  assert.equal(h.utils.getCurrentUser().points, 330.5)
  for (const invalid of [null, '', '  ', false, 'bad', Infinity]) {
    h.setPayment(invalid)
    assert.equal(await h.utils.updateUserBalance(), false)
    assert.equal(h.utils.getCurrentUser().points, 330.5)
  }
  let resolveOld, resolveNew
  h.queueBalance(
    () => new Promise(resolve => { resolveOld = resolve }),
    () => new Promise(resolve => { resolveNew = resolve }),
  )
  const old = h.utils.updateUserBalance()
  const latest = h.utils.updateUserBalance()
  resolveNew({data:{points:360}})
  assert.equal(await latest, true)
  resolveOld({data:{points:300}})
  assert.equal(await old, false)
  await h.settle()
  assert.equal(h.utils.getCurrentUser().points, 360)
  assert.equal(h.instance('ScriptConfig.vue').setupState.userPoints, 360)
  let resolveOther
  h.queueBalance(() => new Promise(resolve => { resolveOther = resolve }))
  const switching = h.utils.updateUserBalance()
  h.localStorage.setItem('user', JSON.stringify({id:8,username:'other-test-user',points:90}))
  resolveOther({data:{points:390}})
  assert.equal(await switching, false)
  assert.equal(h.utils.getCurrentUser().points, 90)
})
