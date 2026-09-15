// Actual admin and recharge components with in-memory HTTP/storage; never creates a payment.
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const vue = require('vue'), ts = require('typescript'), sfc = require('@vue/compiler-sfc')
const root = path.resolve(__dirname, '..')
const clone = value => JSON.parse(JSON.stringify(value))
function harness() {
  let db = []
  const writes = [], notices = []
  const wrapper = vue.defineComponent({ setup(_p, { attrs, slots }) { return () => vue.h('control', attrs, slots.default?.()) } })
  const axios = { async get(url) {
    if (url.endsWith('/recharge-packages')) return { data: { packages: clone(db) } }
    if (url.endsWith('/recharge-config')) return { data: { config: { min_quantity: 1, unit_price: 1, bonus_rate: 0 } } }
    if (url.endsWith('/payment-methods')) return { data: { success: true, data: [] } }
    throw new Error('Unexpected GET: ' + url)
  }, post: async () => { throw new Error('No payment requests allowed') } }
  const mockFetch = async (url, options = {}) => {
    assert.ok(url.startsWith('/api/admin/recharge-packages'))
    if (options.method === 'POST' || options.method === 'PUT') {
      const body = JSON.parse(options.body); writes.push({ url, method: options.method, body })
      const id = options.method === 'PUT' ? Number(url.split('/').at(-1)) : db.length + 1
      const item = { ...body, id, can_purchase: true, user_purchased_count: 0 }
      db = [...db.filter(p => p.id !== id), item]
    }
    return { ok: true, json: async () => ({ packages: clone(db) }) }
  }
  const cache = new Map()
  function evaluate(source, filename) {
    const exports = {}
    const requireMock = id => {
      if (id === 'vue') return vue
      if (id === 'ant-design-vue') return { Button: wrapper, Space: wrapper, Popconfirm: wrapper, Modal: {}, message: Object.fromEntries(['error','success','warning','info'].map(k => [k, text => notices.push({ type: k, text })])) }
      if (id === '@ant-design/icons-vue') return new Proxy({}, { get: (_t,k) => k === '__esModule' ? true : wrapper })
      if (id.endsWith('/axios')) return axios
      if (id.endsWith('/userUtils')) return { updateUserBalance: async () => true }
      if (id.endsWith('.vue')) return wrapper
      if (id.endsWith('rechargePackageLabel')) return load('src/utils/rechargePackageLabel.ts')
      throw new Error('Unexpected import ' + id)
    }
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { exports, require: requireMock, fetch: mockFetch, window: {}, document: {}, navigator: {}, localStorage: { getItem: () => null }, console, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {} }, { filename })
    return exports
  }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    let result
    if (file.endsWith('.vue')) {
      const parsed = sfc.parse(source, { filename: file }); assert.deepEqual(parsed.errors, [])
      const script = sfc.compileScript(parsed.descriptor, { id: file })
      result = evaluate(script.content, file)
      const template = sfc.compileTemplate({ id: file, filename: file, source: parsed.descriptor.template.content, compilerOptions: { bindingMetadata: script.bindings } })
      assert.deepEqual(template.errors, [])
      result.default.render = evaluate(template.code, file).render
    } else result = evaluate(source, file)
    cache.set(file, result); return result
  }
  const node = (type, text = '') => ({ type, text, props: {}, children: [], parent: null })
  const renderer = vue.createRenderer({
    createElement: type => node(type), createText: text => node('text', text), createComment: () => node('comment'),
    setText: (n,t) => { n.text = t }, setElementText: (n,t) => { n.text=t; n.children=[] }, patchProp: (n,k,_o,v) => { n.props[k]=v },
    insert(n,p,a=null) { if(n.parent) n.parent.children.splice(n.parent.children.indexOf(n),1); n.parent=p; const i=a?p.children.indexOf(a):-1; p.children.splice(i<0?p.children.length:i,0,n) },
    remove(n) { if(n.parent) n.parent.children.splice(n.parent.children.indexOf(n),1) }, parentNode:n=>n.parent, nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]||null,
  })
  const apps = []
  function mount(file, props) {
    const host = node('root'), app = renderer.createApp(load(file).default, props)
    app.config.warnHandler = () => {}
    for(const tag of ['a-card','a-button','a-form','a-form-item','a-input','a-input-number','a-switch','a-steps','a-step','a-alert','a-spin','a-tag']) app.component(tag, wrapper)
    app.component('a-modal', vue.defineComponent({ props:['open'], setup(p,{slots}){return()=>p.open?vue.h('modal',slots.default?.()):null} }))
    app.mount(host); apps.push(app)
    return { state: app._instance.setupState, host }
  }
  return { mount, writes, notices, load, setPackages: value => { db=clone(value) }, cleanup: () => apps.forEach(app=>app.unmount()) }
}
const settle = async () => { for(let i=0;i<5;i++) { await Promise.resolve(); await vue.nextTick() } }
const all = n => [n,...n.children.flatMap(all)]
const textOf = n => n.text+n.children.map(textOf).join('')
const consumerFile = 'src/components/RechargeModal.vue'
async function showConsumer(h) {
  const result = h.mount(consumerFile, { visible:true, user:{points:300} })
  await result.state.fetchRechargeData(); result.state.configLoadSuccess=true; await settle(); return result
}

test('actual admin create/edit/save/clear round-trip uses a separate label and preserves unlimited purchase count', async () => {
  const h = harness()
  try {
    const {state} = h.mount('src/components/admin/RechargePackageManagement.vue',{token:'offline-fixture'})
    await settle(); state.handleCreatePackage()
    assert.equal(state.packageForm.activity_display_text,'')
    Object.assign(state.packageForm,{name:'测试套餐',price:30,points:30,max_purchase_count:0,activity_display_text:'  限时活动  '})
    await state.handleSavePackage(); await settle()
    assert.equal(h.writes[0].body.max_purchase_count,null)
    assert.equal(h.writes[0].body.activity_display_text,'限时活动')
    assert.equal(h.writes[0].body.price,30)
    state.handleEditPackage(state.rechargePackages[0]); assert.equal(state.packageForm.activity_display_text,'限时活动')
    const consumer = await showConsumer(h)
    assert.ok(textOf(consumer.host).includes('限时活动'))
    state.packageForm.activity_display_text=''; await state.handleSavePackage(); await settle()
    assert.equal(h.writes[1].method,'PUT'); assert.equal(h.writes[1].body.activity_display_text,'')
    await consumer.state.fetchRechargePackages(); await settle()
    assert.ok(textOf(consumer.host).includes('无限制')); assert.ok(!textOf(consumer.host).includes('限时活动'))
  } finally { h.cleanup() }
})
test('normal and gift-card cards both display custom text without changing can_purchase or prices', async () => {
  const h=harness()
  try {
    h.setPackages([0,1].map((gift_card_enabled,i)=>({id:i+1,name:'测试',enabled:1,price:30,points:30,max_purchase_count:0,activity_display_text:'限时活动',gift_card_enabled,can_purchase:true})))
    const {state,host}=await showConsumer(h)
    assert.equal(textOf(host).split('限时活动').length-1,2)
    assert.ok(state.packages.every(p=>p.max_purchase_count===0&&p.can_purchase===true&&p.price===30))
  } finally {h.cleanup()}
})
test('limited and exhausted packages retain real limit/count/disabled presentation even when a custom label exists', async () => {
  const h=harness()
  try {
    h.setPackages([true,false].map((can_purchase,i)=>({id:i+1,enabled:1,price:30,points:30,max_purchase_count:2,user_purchased_count:i?2:1,activity_display_text:'限时活动',can_purchase})))
    const {state,host}=await showConsumer(h)
    const text=textOf(host); assert.ok(text.includes('限购2次，已购买1次')); assert.ok(text.includes('已达购买上限')); assert.ok(!text.includes('限时活动'))
    assert.equal(state.packages[1].can_purchase,false)
  } finally {h.cleanup()}
})
test('old/missing/blank labels fall back to unlimited; numeric/string zero treated equally', async () => {
  const h=harness()
  try {
    h.setPackages([0,'0',null,undefined].map((max_purchase_count,i)=>({id:i+1,enabled:1,price:30,points:30,max_purchase_count,activity_display_text:i===1?'  ':undefined,can_purchase:true})))
    const {host}=await showConsumer(h); assert.equal(textOf(host).split('无限制').length-1,4)
  } finally {h.cleanup()}
})
test('label trimming/type/length constraints and literal text rendering', async () => {
  const h=harness()
  try {
    const util=h.load('src/utils/rechargePackageLabel.ts')
    assert.equal(util.normalizePurchaseLimitLabel(null),'')
    assert.equal(util.normalizePurchaseLimitLabel(123),'')
    assert.equal(util.normalizePurchaseLimitLabel('🌸'.repeat(21)),'🌸'.repeat(20))
    h.setPackages([{id:1,enabled:1,price:30,points:30,max_purchase_count:0,activity_display_text:'<b>限时活动</b>',can_purchase:true}])
    const {host}=await showConsumer(h); assert.ok(textOf(host).includes('<b>限时活动</b>')); assert.ok(!all(host).some(n=>n.type==='b'))
  } finally {h.cleanup()}
})
