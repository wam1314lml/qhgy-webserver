// 只运行本地合成数据与专用无头 Edge，不加载主应用、配置、登录凭据或真实账号。
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileStyle } from '@vue/compiler-sfc'

const root = fileURLToPath(new URL('../', import.meta.url))
const candidates = [process.env.EVT_TEST_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean)
let executable
for (const candidate of candidates) { try { if ((await stat(candidate)).isFile()) { executable = candidate; break } } catch {} }
if (!executable) throw new Error('没有现成 Chromium/Edge；本脚本不会安装浏览器。')
if (typeof WebSocket === 'undefined') throw new Error('需要带内置 WebSocket 的 Node（本机 Node 22）。')

let componentCss = ''
const bundle = await build({
  stdin: { resolveDir: root, loader: 'js', contents: `
    import { createApp, h, ref, shallowRef, nextTick } from 'vue';
    import EventCardView from './src/components/EventCardView.vue';
    import { EvtHistoryStore } from './src/utils/evtHistoryStorage.ts';
    import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
    const now = Date.now();
    const store = new EvtHistoryStore();
    const event = (i, module, prefix) => ({id: prefix+i, ts:now-i*1000, module,title:prefix+String(i).padStart(5,'0'),status:'success',desc:'共收获1块，获得经验×12 粉郁金香×3',
      gains:i%3===0?[{name:'经验',count:12},{name:'粉郁金香',count:3}]:undefined,kv:i%2?[{label:'数量',value:i}]:undefined});
    store.ingest(Array.from({length:10000},(_,i)=>event(i,'订单系统','A')),now);
    store.ingest(Array.from({length:50},(_,i)=>event(i,'土地系统','B')),now);
    const modules = shallowRef(store.snapshot());
    const filter = ref('订单系统');
    const pages = {订单系统:{loaded:true,count:10000},土地系统:{loaded:true,count:50}};
    window.evtTest = {
      async filter(module) { filter.value=module; await nextTick(); },
      async append() { store.ingest([{...event(-1,'订单系统','A'),title:'NEW_EVENT'}],now); modules.value=store.snapshot(); await nextTick(); },
      async flush() { await nextTick(); },
    };
    createApp({setup:()=>()=>h(EventCardView,{modules:modules.value,pages,filterCategory:filter.value,historyNotice:'本地合成数据测试'})}).mount('#app');
    window.evtTestReady=true;
  ` },
  bundle: true, write: false, outfile: 'evt-browser.js', format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' },
  plugins: [{ name: 'evt-local-vue', setup(builder) {
    // 仅替代与日志滚动无关的剪贴板提示，Vue和虚拟列表均用真实安装版本。
    builder.onResolve({ filter: /^ant-design-vue$/ }, () => ({ path: 'message', namespace: 'evt-message' }))
    builder.onLoad({ filter: /.*/, namespace: 'evt-message' }, () => ({ contents: 'export const message={success(){},error(){}};' }))
    builder.onLoad({ filter: /\.vue$/ }, async args => {
      const source = await readFile(args.path, 'utf8')
      const { descriptor, errors } = parse(source, { filename: args.path })
      assert.deepEqual(errors, [])
      const id = `data-v-test-${path.basename(args.path).replace(/\W/g, '')}`
      const script = compileScript(descriptor, { id, inlineTemplate: true, genDefaultAs: '__sfc__' })
      for (const style of descriptor.styles) {
        const result = compileStyle({ source: style.content, filename: args.path, id, scoped: style.scoped })
        assert.deepEqual(result.errors, [])
        componentCss += result.code
      }
      return { contents: `${script.content}\n__sfc__.__scopeId=${JSON.stringify(id)};export default __sfc__;`, loader: 'ts', resolveDir: path.dirname(args.path) }
    })
  } }],
})
const javascript = bundle.outputFiles.find(file => file.path.endsWith('.js')).text
const css = componentCss + '\n' + (bundle.outputFiles.find(file => file.path.endsWith('.css'))?.text ?? '')
const server = createServer((request, response) => {
  if (request.url === '/app.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(javascript) }
  else if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css) }
  else if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{margin:0;font-family:Arial}#app{height:850px;width:100%;}</style></head><body><div id="app"></div><script src="/app.js"></script></body></html>')
  } else { response.statusCode = 404; response.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const tempRoot = await realpath(tmpdir())
const profile = await mkdtemp(path.join(tempRoot, 'evt-browser-'))
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
const inspect = () => evaluate(`(() => {
  const el=document.querySelector('.evt-history-scroller');
  const visible=el?[...el.querySelectorAll('article')].filter(row=>{const r=row.getBoundingClientRect(),v=el.getBoundingClientRect();return r.bottom>v.top&&r.top<v.bottom;}):[];
  return {nodes:document.querySelectorAll('article').length,height:el?.clientHeight,top:el?.scrollTop,totalHeight:el?.scrollHeight,visible:visible.map(row=>row.querySelector('strong')?.textContent),pending:document.querySelector('.evt-history-panel>.evt-history-more')?.textContent};
})()`)
const toggle = () => evaluate(`[...document.querySelectorAll('.evt-section-toggle')].find(el=>el.textContent.includes('事件记录')).click()`)

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
  for (let i = 0; i < 100 && !await evaluate('!!window.evtTestReady'); i++) await sleep(50)
  assert.equal(await evaluate('!!window.evtTestReady'), true)
  assert.equal((await inspect()).nodes, 0, '折叠不创建事件DOM')
  await toggle(); await sleep(450)
  const initial = await inspect()
  assert.ok(initial.height >= 160 && initial.height <= 500)
  assert.ok(initial.nodes > 0 && initial.nodes < 100, JSON.stringify(initial))
  assert.ok(initial.visible.includes('A00000'), JSON.stringify(initial))
  console.log('展开10000条：', JSON.stringify(initial))

  const compact = await evaluate(`(() => {
    const row=document.querySelector('.evt-history-row'),dot=row.querySelector('.evt-tl-dot'),time=row.querySelector('time'),title=row.querySelector('strong'),desc=row.querySelector('.evt-tl-desc'),gain=row.querySelector('.evt-tl-gain');
    return {dotWidth:getComputedStyle(dot).width,dotRadius:getComputedStyle(dot).borderRadius,dotColor:getComputedStyle(dot).backgroundColor,
      borderLeft:getComputedStyle(row).borderLeftWidth,borderBottom:getComputedStyle(row).borderBottomWidth,
      time:time.textContent,fullTime:time.title,sameLine:Math.abs(title.getBoundingClientRect().top-desc.getBoundingClientRect().top)<4,
      pillColor:getComputedStyle(gain).backgroundColor,pillRadius:getComputedStyle(gain).borderRadius,rowHeight:row.getBoundingClientRect().height};
  })()`)
  assert.equal(compact.dotWidth, '10px'); assert.equal(compact.dotRadius, '50%'); assert.equal(compact.dotColor, 'rgb(16, 185, 129)')
  assert.equal(compact.borderLeft, '0px'); assert.equal(compact.borderBottom, '0px')
  assert.match(compact.time, /^\d{2}:\d{2}:\d{2}$/); assert.ok(compact.fullTime.length > compact.time.length)
  assert.equal(compact.sameLine, true); assert.equal(compact.pillColor, 'rgb(224, 242, 254)'); assert.equal(compact.pillRadius, '10px')
  assert.ok(compact.rowHeight < 65, JSON.stringify(compact))
  console.log('原紧凑版式：圆点、同行摘要、时间及奖励标签通过。', JSON.stringify(compact))
  const screenshotArg = process.argv.indexOf('--screenshot')
  if (screenshotArg !== -1) {
    assert.ok(process.argv[screenshotArg + 1], '--screenshot requires a filename')
    const clip = await evaluate(`(()=>{const r=document.querySelector('.evt-history-panel').getBoundingClientRect();return {x:r.left,y:r.top,width:Math.min(r.width,900),height:Math.min(r.height,240),scale:1}})()`)
    const capture = await command('Page.captureScreenshot', { format: 'png', clip })
    await writeFile(path.resolve(process.argv[screenshotArg + 1]), Buffer.from(capture.data, 'base64'))
  }

  for (let i = 0; i < 4; i++) { await evaluate(`(()=>{const el=document.querySelector('.evt-history-scroller');el.scrollTop=el.scrollHeight})()`); await sleep(150) }
  const bottom = await inspect()
  assert.ok(bottom.nodes < 100 && bottom.visible.includes('A09999'), JSON.stringify(bottom))
  console.log('滚动到底部：', JSON.stringify(bottom))
  await evaluate('window.evtTest.append()'); await sleep(250)
  const held = await inspect()
  assert.match(held.pending, /1 条新记录/)
  assert.ok(held.visible.includes('A09999'), JSON.stringify(held))
  await evaluate(`document.querySelector('.evt-history-panel>.evt-history-more').click()`); await sleep(300)
  const latest = await inspect()
  assert.equal(latest.top, 0)
  assert.ok(latest.visible.includes('NEW_EVENT'), JSON.stringify(latest))
  console.log('阅读时保留位置，点击新记录回顶部：', JSON.stringify(latest))

  await toggle(); await sleep(100)
  assert.equal((await inspect()).nodes, 0)
  await toggle(); await sleep(250)
  assert.ok((await inspect()).nodes < 100)
  await evaluate(`window.evtTest.filter('土地系统')`); await sleep(100)
  assert.equal((await inspect()).nodes, 0)
  await toggle(); await sleep(250)
  const other = await inspect()
  assert.ok(other.visible.includes('B00000') && !other.visible.some(value => value.startsWith('A')), JSON.stringify(other))
  await evaluate(`window.evtTest.filter('订单系统')`); await sleep(300)
  const returned = await inspect()
  assert.ok(returned.visible.includes('NEW_EVENT') && returned.nodes < 100, JSON.stringify(returned))
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(300)
  const narrow = await evaluate(`(()=>{const el=document.querySelector('.evt-history-scroller');return {width:el.clientWidth,scrollWidth:el.scrollWidth,nodes:el.querySelectorAll('article').length}})()`)
  assert.ok(narrow.width <= 390 && narrow.scrollWidth <= narrow.width + 1 && narrow.nodes < 100, JSON.stringify(narrow))
  console.log('窄屏换行无横向溢出：', JSON.stringify(narrow))
  assert.deepEqual(exceptions, [])
  console.log('折叠/再次展开/切模块/切回全部通过；浏览器异常0。')
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
  assert.ok(path.basename(resolved).startsWith('evt-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 })
}
