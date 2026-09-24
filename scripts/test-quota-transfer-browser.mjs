// 真实Vue/Ant Design组件 + 隔离的无头Edge；HTTP及用户数据全部为合成替身。
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileStyle } from '@vue/compiler-sfc'
import vm from 'node:vm'
import ts from 'typescript'
import { AxiosHeaders } from 'axios'

const root = fileURLToPath(new URL('../', import.meta.url))
const candidates = [process.env.QUOTA_TEST_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean)
let executable
for (const candidate of candidates) { try { if ((await stat(candidate)).isFile()) { executable = candidate; break } } catch {} }
if (!executable) throw new Error('没有现成 Chromium/Edge；本脚本不会安装浏览器。')
if (typeof WebSocket === 'undefined') throw new Error('需要带内置 WebSocket 的 Node（本机 Node 22）。')


let componentCss = ''
// 执行实际Axios请求拦截器：同时存在用户和管理员登录时，显式管理员令牌不能被覆盖。
const axiosSource = ts.createSourceFile('axios.ts', await readFile(path.join(root, 'src/utils/axios.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const requestRegistration = axiosSource.statements.find(node => ts.isExpressionStatement(node) && node.getText(axiosSource).startsWith('axiosInstance.interceptors.request.use('))
assert.ok(requestRegistration)
let requestInterceptor
const storedTokens = new Map([['token', 'synthetic-user'], ['adminToken', 'synthetic-admin']])
vm.runInNewContext(ts.transpileModule(requestRegistration.getText(axiosSource), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
  axiosInstance: { interceptors: { request: { use(fn) { requestInterceptor = fn } } } },
  localStorage: { getItem: key => storedTokens.get(key) }, sessionStorage: { getItem: () => 'verified' },
  axios: { get: async () => ({ data: { data: { challenge: 'synthetic' } } }) },
  signRequest: async () => 'synthetic-signature', d3: { d: () => 'x-test-signature' }, URLSearchParams, console,
})
for (const explicit of [undefined, 'synthetic-admin']) {
  const headers = new AxiosHeaders(explicit ? { authorization: `Bearer ${explicit}` } : {})
  const result = await requestInterceptor({ url: '/api/admin/quota-transfers/stats', headers })
  assert.equal(result.headers.get('Authorization'), `Bearer ${explicit || 'synthetic-user'}`)
}
storedTokens.delete('token')
assert.equal((await requestInterceptor({ url: '/api/admin/quota-transfers/stats', headers: new AxiosHeaders() })).headers.get('Authorization'), 'Bearer synthetic-admin')
storedTokens.clear()
assert.equal((await requestInterceptor({ url: '/api/quota-transfers/settings', headers: new AxiosHeaders() })).headers.has('Authorization'), false)
const mock = `
  export const state = window.quotaMock = {enabled:false,feeBasisPoints:1000,balance:100,posts:[],settled:{},loseResponse:false,delay:0};
  const result=data=>({data:{success:true,data}});
  const fail=(status,code,message)=>{throw {response:{status,data:{code,message}},message}};
  const settings=()=>({enabled:state.enabled,feeBasisPoints:state.feeBasisPoints,feePercent:state.feeBasisPoints/100,balance:state.balance});
  const quote=body=>{
    if(!state.enabled)fail(403,'MODULE_DISABLED','配额转移功能已关闭');
    if(body.recipientUsername!=='user2')fail(404,'RECIPIENT_NOT_FOUND','对方网站账号不存在');
    const fee=Math.floor((body.amount*state.feeBasisPoints+9999)/10000),totalDebit=body.amount+fee;
    if(state.balance<totalDebit)fail(400,'INSUFFICIENT_BALANCE','余额不足');
    return {recipientId:2,recipientUsername:'user2',amount:body.amount,received:body.amount,fee,totalDebit,
      balance:state.balance,balanceAfter:state.balance-totalDebit,feeBasisPoints:state.feeBasisPoints,feePercent:state.feeBasisPoints/100};
  };
  const history=(admin,page)=>({user:admin?{username:'user2',points:130}:undefined,
    transactions:[{id:page,transaction_type:admin?'transfer_in':'transfer_out',amount:admin?30:33,
      description:admin?'收到 user1 转移 30 点，到账 30 点':'转移给 user2：转移 30 点，对方到账 30 点，手续费 3 点，实付 33 点',
      balance_after:admin?130:67,created_at:'2026-09-24T01:00:00Z',status:'completed'}, {id:90+page,transaction_type:'consume',amount:'-5.00',description:'旧管理员扣点',balance_after:60,created_at:'2026-09-24T00:00:00Z',status:'completed'}],pagination:{page,limit:20,total:42}});
  export default {
    async get(url,options={}) {
      if(url.includes('/admin/') && options.headers?.Authorization!=='Bearer synthetic-admin')throw Error('wrong admin identity');
      if(url.endsWith('/settings'))return result(settings());
      if(url.endsWith('/stats'))return result({tradingUsers:2,todayAmount:30,monthAmount:30,todayFee:3,monthFee:3,totalAmount:30,totalFee:3});
      if(url.endsWith('/history')||url.endsWith('/user-history'))return result(history(url.includes('/admin/'),options.params?.page||1));
      throw Error('Unexpected GET '+url);
    },
    async put(url,body,options){if(options.headers?.Authorization!=='Bearer synthetic-admin')throw Error('wrong admin identity');state.enabled=body.enabled;state.feeBasisPoints=Math.round(body.feePercent*100);return result(settings());},
    async post(url,body){
      if(url.endsWith('/preview'))return result(quote(body));
      state.posts.push(body);if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
      if(state.settled[body.requestId])return result(state.settled[body.requestId]);
      const q=quote(body);state.balance=q.balanceAfter;state.settled[body.requestId]=q;
      if(state.loseResponse){state.loseResponse=false;fail(503,'TRANSFER_UNAVAILABLE','结果暂未确认，请重试');}
      return result(q);
    }
  };
`
const bundle = await build({
  stdin: { resolveDir: root, loader: 'js', contents: `
    import {createApp,h,ref,nextTick} from 'vue';import Antd from 'ant-design-vue';import 'ant-design-vue/dist/reset.css';
    import QuotaTransfer from './src/components/QuotaTransfer.vue';import QuotaTransferAdmin from './src/components/admin/QuotaTransferAdmin.vue';
    const mode=ref('user'),version=ref(0);
    window.quotaTest={async mode(value){mode.value=value;version.value++;await nextTick();}};
    createApp({setup:()=>()=>h('main',{style:'max-width:1100px;margin:24px auto;padding:0 16px'},[
      mode.value==='user'?h(QuotaTransfer,{key:version.value}):h(QuotaTransferAdmin,{key:version.value,token:'synthetic-admin'})])}).use(Antd).mount('#app');
    window.quotaTestReady=true;
  ` },
  bundle:true,write:false,outfile:'quota-test.js',format:'iife',platform:'browser',
  define:{'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},
  plugins:[{name:'quota-offline',setup(builder){
    builder.onResolve({filter:/utils\/axios$/},()=>({path:'axios',namespace:'quota-mock'}))
    builder.onResolve({filter:/utils\/userUtils$/},()=>({path:'user',namespace:'quota-mock'}))
    builder.onLoad({filter:/.*/,namespace:'quota-mock'},args=>({contents:args.path==='axios'?mock:'export const getCurrentUser=()=>({id:1});export const updateUserBalance=async()=>true;'}))
    builder.onLoad({filter:/\.vue$/},async args=>{
      const {descriptor,errors}=parse(await readFile(args.path,'utf8'),{filename:args.path});assert.deepEqual(errors,[])
      const id='data-v-quota-'+path.basename(args.path).replace(/\W/g,'')
      const script=compileScript(descriptor,{id,inlineTemplate:true,genDefaultAs:'__sfc__'})
      for(const style of descriptor.styles){const result=compileStyle({source:style.content,filename:args.path,id,scoped:style.scoped});assert.deepEqual(result.errors,[]);componentCss+=result.code}
      return {contents:script.content+'\n__sfc__.__scopeId='+JSON.stringify(id)+';export default __sfc__;',loader:'ts',resolveDir:path.dirname(args.path)}
    })
  }}],
})
const javascript=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text
const css=componentCss+'\n'+(bundle.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'')
const server=createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(javascript)}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css)}
  else if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{margin:0;background:#f4f7f6;font-family:Arial}</style></head><body><div id="app"></div><script src="/app.js"></script></body></html>')}
  else{res.statusCode=404;res.end()}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const base=`http://127.0.0.1:${server.address().port}`
const tempRoot = await realpath(tmpdir())
const profile = await mkdtemp(path.join(tempRoot, 'quota-browser-'))
let child, socket
let nextId = 0
const pending = new Map()
const exceptions = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 10000)
  pending.set(id, { resolve, reject, timeout })
  socket.send(JSON.stringify({ id, method, params }))
})
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}

const text=()=>evaluate('document.body.innerText')
async function click(label){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.replace(/\\s/g,'')===${JSON.stringify(label.replace(/\s/g,''))});if(!b)throw Error('button missing: '+${JSON.stringify(label)});b.click()})()`);await sleep(120)}
async function input(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('input missing');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur()})()`);await sleep(100)}
async function capture(name){const dir=process.argv.indexOf('--screenshots');if(dir!==-1){const result=await command('Page.captureScreenshot',{format:'png'});await writeFile(path.join(process.argv[dir+1],name+'.png'),Buffer.from(result.data,'base64'))}}
try {
  let stderr = ''
  child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, '--window-size=1280,900', base], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  child.stderr.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > 20000) stderr = stderr.slice(-10000) })
  let debugPort
  for (let i = 0; i < 100; i++) {
    const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)
    if (match) { debugPort = match[1]; break }
    if (child.exitCode !== null) throw new Error(`Browser exited: ${stderr}`)
    await sleep(100)
  }
  assert.ok(debugPort, `Edge没有打开专用调试端口：${stderr}`)
  let target
  for (let i = 0; i < 100; i++) {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
    target = targets.find(item => item.type === 'page' && item.url.startsWith(base))
    if (target) break
    await sleep(100)
  }
  assert.ok(target, '未找到本地合成数据页面')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', ({ data }) => {
    const result = JSON.parse(data)
    if (result.method === 'Runtime.exceptionThrown') exceptions.push(result.params.exceptionDetails)
    if (!result.id) return
    const waiter = pending.get(result.id)
    if (!waiter) return
    clearTimeout(waiter.timeout); pending.delete(result.id)
    if (result.error) waiter.reject(new Error(JSON.stringify(result.error)))
    else waiter.resolve(result.result)
  })
  await command('Runtime.enable')
  for (let i = 0; i < 100 && !await evaluate('!!window.quotaTestReady'); i++) await sleep(50)
  assert.equal(await evaluate('!!window.quotaTestReady'), true)

  await sleep(300)
  assert.match(await text(),/暂未开放/)
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),true)
  await evaluate('window.quotaMock.enabled=true');await click('刷新')
  await input('input[autocomplete=off]','user2');await input('.ant-input-number-input','30');await click('预览转移');await sleep(350)
  assert.match(await text(),/确认转移配额/)
  const amounts=await evaluate("[...document.querySelectorAll('.quote dd')].map(e=>e.textContent.trim())")
  assert.deepEqual(amounts,['30 点','30 点','3 点','33 点','100 点','67 点'])
  await capture('quota-transfer-confirm-desktop')
  // 服务端已提交，但响应丢失；关页回来，复用同一请求查结果。
  await evaluate('window.quotaMock.loseResponse=true');await click('确认转移')
  assert.match(await text(),/结果暂未确认/)
  assert.equal(await evaluate('window.quotaMock.balance'),67)
  await click('返回');await evaluate("window.quotaTest.mode('user')");await sleep(250)
  assert.match(await text(),/有一笔结果待确认/)
  await click('继续确认本笔转移');await click('确认转移');await sleep(200)
  assert.equal(await evaluate('window.quotaMock.balance'),67)
  assert.equal(await evaluate('new Set(window.quotaMock.posts.map(p=>p.requestId)).size'),1)
  assert.match(await text(),/已转移 30 点至 user2/)
  assert.equal(await evaluate("sessionStorage.getItem('quota-transfer-pending:1')"),null)
  assert.match(await text(),/配额转出（含手续费）/);assert.match(await text(),/− 5.00/);assert.doesNotMatch(await text(),/− -5/)
  await evaluate("document.querySelector('.ant-pagination-item-2').click()");await sleep(150)
  assert.equal(await evaluate("document.querySelector('.ant-pagination-item-active').textContent.trim()"),'2')
  // 余额不足不产生新扣款请求。
  await input('.ant-input-number-input','99');await input('input[autocomplete=off]','user2');await click('预览转移')
  assert.match(await text(),/余额不足/);assert.equal(await evaluate('window.quotaMock.posts.length'),2)
  await evaluate("window.quotaTest.mode('admin')");await sleep(250)
  assert.match(await text(),/交易用户数/);assert.match(await text(),/总手续费/)
  await evaluate("document.querySelector('button[role=switch]').click()");await input('.ant-input-number-input','12.5');await click('保存设置')
  assert.equal(await evaluate('window.quotaMock.enabled'),false);assert.equal(await evaluate('window.quotaMock.feeBasisPoints'),1250)
  await input('input[placeholder="输入完整登录账号"]','user2');await click('查询');await sleep(150)
  assert.match(await text(),/账号：user2/);assert.match(await text(),/配额转入/)
  await capture('quota-transfer-admin-desktop')
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250)
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'管理页窄屏溢出')
  await capture('quota-transfer-admin-mobile')
  await evaluate('window.quotaMock.enabled=true');await evaluate("window.quotaTest.mode('user')");await sleep(200)
  await input('input[autocomplete=off]','user2');await input('.ant-input-number-input','30');await click('预览转移')
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'确认页窄屏溢出')
  await capture('quota-transfer-confirm-mobile')
  assert.deepEqual(exceptions,[])
  for(const [file,expected] of [['src/components/TopNavBar.vue','key="quota-transfer"'],['src/components/Dashboard.vue','<QuotaTransfer />'],['src/components/AdminPanel.vue','tab="玩家交易配额" v-if="isAdminRole"'],['src/pages/ProfilePage.vue','<PointTransactionHistory ref="transactionHistory" />']])assert.ok((await readFile(path.join(root,file),'utf8')).includes(expected))
  console.log('PASS 真实浏览器：默认关停、六项金额确认、提交应答丢失/切页同请求恢复、余额不足、历史分页、管理员费率开关/用户查询/统计、桌面与390px窄屏；0浏览器异常')
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close') } catch {}
    socket.close()
  }
  if (child && child.exitCode === null) {
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(3000)])
    if (child.exitCode === null) child.kill()
  }
  for (const item of pending.values()) clearTimeout(item.timeout)
  await new Promise(resolve => server.close(resolve))
  // 只允许删除本次创建且直接位于系统临时目录中的专用profile。
  const resolved = await realpath(profile)
  assert.equal(path.dirname(resolved).toLowerCase(), tempRoot.toLowerCase())
  assert.ok(path.basename(resolved).startsWith('quota-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 })
}
