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
const prefix = 'src'
const project = 'garden-webserver'
const record = (id = 7, isStarted = false) => ({ id: String(id), isStarted, record: null, status: 'offline' })
const result = (...records) => ({ code: 200, data: { results: records } })
const account = () => ({ id: 7, nickname: 'test', platform: 2, status: 'active', username: 'test', expire_time: '2099-01-01T00:00:00Z', record: record() })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

function harness(initial = {}) {
  const requests = [], messages = [], confirms = [], events = [], intervals = new Map(), timeouts = new Map()
  const plans = { owner: 'synthetic-quota-test', balance: 25, packages: [{days:30,points:10,label:'月套餐'},{days:90,points:25,label:'季套餐'}], records: [], posts: [], list: [], expired: { data: { success: true, data: { isExpired: false } } }, ...initial }
  let timerId = 0, timerNow = 0
  const timers = {
    setTimeout(fn, ms) { const id = ++timerId; if (ms <= 1000) queueMicrotask(fn); else timeouts.set(id, { fn, at: timerNow + ms }); return id },
    clearTimeout(id) { timeouts.delete(id) },
    setInterval(fn) { intervals.set(++timerId, fn); return timerId },
    clearInterval(id) { intervals.delete(id) },
  }
  const window = Object.assign(new EventTarget(), timers, { matchMedia: () => ({ matches: false }), location: { hostname: 'localhost', pathname: '/' } })
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible', querySelector: () => null })
  const storage = { getItem: key => key === 'token' ? plans.owner : key === 'previousRoute' ? initial.previousRoute || null : null, removeItem() {}, setItem() {} }
  async function reply(value) { if (value instanceof Error) throw value; return await value }
  const http = {
    async get(url, config) {
      requests.push({ method: 'get', url, config })
      if (url.startsWith('/api/game-accounts/player_records')) return { data: await reply(plans.records.length ? plans.records.shift() : result(record())) }
      if (url.endsWith('/expired')) return reply(plans.expired)
      if (url === '/api/game-accounts/list') return { data: { success: true, data: await reply(plans.list) } }
      if (url === '/api/quota-settings/active') return { data: { success: true, data: plans.packages } }; if(url === '/api/points/balance') return {data: {points: await reply(plans.balance)}}
      throw new Error('Unexpected GET: ' + url)
    },
    async post(url, _body, config) {
      requests.push({ method: 'post', url, body: _body, config })
      assert.match(url, /^\/api\/game-accounts\/\d+\/(start|stop|extend-quota)$/)
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
      if (id === 'ant-design-vue') return { message: msg, Modal: Object.assign(stub, { confirm(options) { confirms.push(options); return {destroy(){}} } }), FloatButton: Object.assign(stub, {Group:stub}), Button:stub, Alert:stub, InputNumber:stub }
      if (id === '@ant-design/icons-vue') return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : stub })
      if (id.endsWith('playerRecordRetry')) return load('src/utils/playerRecordRetry.ts')
      if (id.endsWith('accountBatch')) return load('src/utils/accountBatch.ts')
      if (id.endsWith('userUtils')) return { updateUserBalance: async () => true }
      if (id.endsWith('/axios')) return http
      if (id.endsWith('.vue')) return stub
      if (id === 'axios') return { create: () => ({ interceptors: { request: { use() {} }, response: { use(_ok, fail) { responseError = fail } } } }) }
      if (id.endsWith('/router')) return { push() {} }
      if (id === './hmac') return { signRequest() {} }
      if (id === './fingerprint') return { generateBrowserFingerprint() {} }
      if (id === './enc') return { d3: {} }
      if (id.startsWith('../utils/') || id.startsWith('./')) return load('src/utils/' + path.basename(id).replace(/\.ts$/, '') + '.ts')
      throw new Error('Unexpected import: ' + id)
    }
    const js = ts.transpileModule(code.replace(/import\.meta\.env/g, '({ DEV: true })'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { exports, require: requireMock, window, document, localStorage: storage, sessionStorage: storage, CustomEvent: class extends Event {},
      console: { log() {}, warn() {}, error() {} }, ...timers }, { filename: file })
    return exports
  }
  function load(file) {
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
  const app = renderer.createApp(load('src/components/BatchAccountActions.vue').default, { accounts:[1,2,3].map(id=>({id,nickname:'角色'+id})), disabled:false, ownerKey:'owner-1', getStarted:async id=>plans.started?.[id] ?? false, onBusy:value=>events.push(['busy',value]), onBalance:value=>events.push(['balance',value]), onStarted:(id,value)=>events.push(['started',id,value]), onFinished:()=>events.push(['finished']) })
  app.config.warnHandler = () => {}
  const tree = node('root'); app.mount(tree)
  const text = n => n.text + n.children.map(text).join('')
  function button(label, n = tree) { if (['a-button', 'button'].includes(n.type) && text(n).trim() === label) return n; for (const child of n.children) { const found = button(label, child); if (found) return found } }
  function statusDot(n = tree) { if (String(n.props.class).split(' ').includes('status-indicator')) return n; for (const child of n.children) { const found = statusDot(child); if (found) return found } }
  function byClass(name, n = tree) { if (String(n.props.class).split(' ').includes(name)) return n; for (const child of n.children) { const found = byClass(name, child); if (found) return found } }
  return { app, events, byClass, state: app._instance.setupState, requests, messages, confirms, plans, button, statusDot, window, document,
    advanceTimers(ms) { timerNow += ms; for (const [id, timer] of [...timeouts]) if (timer.at <= timerNow) { timeouts.delete(id); timer.fn() } },
    tickIntervals() { for (const callback of [...intervals.values()]) callback() },
    utils: load('src/utils/playerRecordRetry.ts'),
    async settle() { for (let i = 0; i < 50; i++) await Promise.resolve(); await vue.nextTick() },
    errorInterceptor() { load('src/utils/axios.ts'); return responseError },
  }
}

const posts = h => h.requests.filter(r => r.method === 'post');
async function quota(t) { const h=harness(); t.after(()=>h.app.unmount()); await h.state.openQuota(); return h; }
async function finish(h) { await h.settle(); h.advanceTimers(3500); await h.settle(); h.advanceTimers(3500); await h.settle(); }
test('实际批量弹框：实时总额、余额不足仍按快照分配，成功与失败名字全保留',async t=>{
 const h=await quota(t);assert.equal(h.state.quote.total,30);assert.equal(h.state.quote.affordable,2);h.state.extra=2;assert.equal(h.state.quote.total,36);
 h.state.confirmQuota();h.state.selectedPlan=1;h.state.extra=100;h.app._instance.props.accounts=[];
 h.plans.posts.push({data:{success:true,data:{newBalance:13}}},{data:{success:true,data:{newBalance:1}}},{data:{success:false,message:'余额不足'}});
 h.confirms[0].onOk();await finish(h);assert.equal(posts(h).length,3);assert.deepEqual(JSON.parse(JSON.stringify(posts(h).map(p=>p.body))),Array(3).fill({days:30,additionalPoints:2}));
 assert.equal(h.state.summary,'成功 2，失败 1，取消 0');assert.equal(h.state.visibleResults.length,3);assert.deepEqual(Array.from(h.state.results,r=>r.label),['角色1','角色2','角色3']);
 assert.equal(h.state.progressOpen,true);h.advanceTimers(3000);await h.settle();assert.equal(h.state.progressOpen,true);h.state.progressOpen=false;h.state.progressOpen=true;assert.equal(posts(h).length,3);h.state.dismissed=true;await h.settle();assert.equal(h.byClass('batch-result'),undefined);assert.ok(h.events.some(e=>e[0]==='finished'));
});
test('第一个立即执行，3499ms不请求第二个，3500ms才继续；取消不多扣',async t=>{
 const h=await quota(t);h.state.confirmQuota();h.confirms[0].onOk();await h.settle();assert.equal(posts(h).length,1);
 h.advanceTimers(3499);await h.settle();assert.equal(posts(h).length,1);h.advanceTimers(1);await h.settle();assert.equal(posts(h).length,2);
 h.state.cancelled=true;h.advanceTimers(3500);await h.settle();assert.equal(posts(h).length,2);assert.equal(h.state.results[2].status,'cancelled');
});
test('重复确认不能重复扣款；未确认结果停止后续且不重试',async t=>{
 const h=await quota(t);h.plans.posts.push(new Error('network lost'));h.state.confirmQuota();h.state.confirmQuota();assert.equal(h.confirms.length,1);h.confirms[0].onOk();h.confirms[0].onOk();await finish(h);
 assert.equal(posts(h).length,1);assert.deepEqual(Array.from(h.state.results,r=>r.status),['unknown','cancelled','cancelled']);
});
test('切号和卸载取消等待中的配额，旧响应不写回新账号',async t=>{
 for(const type of ['token','ownerKey','unmount']){
  const h=await quota(t);h.state.confirmQuota();h.confirms[0].onOk();await h.settle();
  if(type==='token')h.plans.owner='different-owner';else if(type==='ownerKey')h.app._instance.props.ownerKey='different';else h.app.unmount();
  await finish(h);assert.equal(posts(h).length,1);assert.equal(h.events.filter(e=>e[0]==='finished').length,0);
 }
});
test('关闭后迟到的套餐不重开弹窗，读取失败禁止扣款',async t=>{
 const h=harness({balance:Promise.resolve(null)});t.after(()=>h.app.unmount());await h.state.openQuota();assert.equal(h.state.quote,null);h.state.confirmQuota();assert.equal(posts(h).length,0);h.state.closeQuota();assert.equal(h.state.busy,false);
 const wait=deferred(),late=harness({balance:wait.promise});t.after(()=>late.app.unmount());const pending=late.state.openQuota();late.state.closeQuota();wait.resolve(99);await pending;assert.equal(late.state.quotaOpen,false);assert.equal(late.state.plans.length,0);
});
test('批量启停跳过已启动/过期账号，认证错误逐号保留，不弹渠道二维码',async t=>{
 const h=harness({started:{1:true},posts:[{data:{success:false,code:'WX_REAUTH_REQUIRED'}},{data:{success:true}}]});t.after(()=>h.app.unmount());h.state.confirmAction('start');h.confirms[0].onOk();await h.settle();
 assert.deepEqual(Array.from(h.state.results,r=>r.status),['skipped','failed','success']);assert.equal(h.state.results[1].reason,'需要重新扫码认证，请在该账号单独操作');assert.equal(posts(h).length,2);
 h.state.confirmAction('stop');h.confirms[1].onCancel();assert.equal(h.state.busy,false);assert.equal(posts(h).length,2);
});
test('启停预检期间取消以及外部单号忙碌时不发送写请求',async t=>{
 const h=harness();t.after(()=>h.app.unmount());h.app._instance.props.disabled=true;await h.state.openQuota();h.state.confirmAction('start');assert.equal(h.requests.length,0);
 h.app._instance.props.disabled=false;const pending=deferred();h.app._instance.props.getStarted=()=>pending.promise;h.state.confirmAction('start');h.confirms[0].onOk();h.state.cancelled=true;pending.resolve(false);await h.settle();assert.equal(posts(h).length,0);assert.equal(h.state.results.length,3);
});

test('进度窗口显示实际角色，提交和3.5秒等待分开；完成解除刷新警告',async t=>{
 const h=await quota(t),wait=deferred();h.plans.posts.push(wait.promise);h.state.confirmQuota();h.confirms[0].onOk();await h.settle();
 assert.equal(h.state.progressOpen,true);assert.equal(h.state.requestPending,true);assert.equal(h.state.currentLabel,'角色1');
 let event=new Event('beforeunload',{cancelable:true});h.window.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
 wait.resolve({data:{success:true}});await h.settle();assert.equal(h.state.requestPending,false);assert.equal(h.state.currentLabel,'角色2');assert.equal(h.state.completed,1);
 h.state.cancelled=true;h.advanceTimers(3500);await h.settle();assert.equal(h.state.completed,3);assert.equal(posts(h).length,1);
 event=new Event('beforeunload',{cancelable:true});h.window.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
});
test('启停进度区分预检和提交；卸载清理刷新监听',async t=>{
 const h=harness(),check=deferred(),submit=deferred();h.app._instance.props.getStarted=()=>check.promise;h.plans.posts.push(submit.promise);
 h.state.confirmAction('start');h.confirms[0].onOk();await h.settle();assert.equal(h.state.requestPending,false);assert.equal(h.state.currentLabel,'角色1');
 check.resolve(false);await h.settle();assert.equal(h.state.requestPending,true);h.state.cancelled=true;submit.resolve({data:{success:true}});await h.settle();
 assert.deepEqual(Array.from(h.state.results,r=>r.status),['success','cancelled','cancelled']);assert.equal(h.state.progressOpen,true);
 h.app.unmount();const event=new Event('beforeunload',{cancelable:true});h.window.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
});
