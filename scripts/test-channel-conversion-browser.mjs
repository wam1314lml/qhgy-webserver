// 实际Vue/Ant Design组件；接口和用户均为合成数据，只监听本机。
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, realpath, rm, stat, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileStyle } from '@vue/compiler-sfc'

const root = fileURLToPath(new URL('../', import.meta.url))
let executable
for (const candidate of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe']) {
  try { if ((await stat(candidate)).isFile()) { executable = candidate; break } } catch {}
}
if (!executable) throw Error('需要本机已有的 Edge/Chrome；不会自动安装浏览器')

let css = await readFile(path.join(root,'node_modules/ant-design-vue/dist/reset.css'),'utf8')
const mock = `
const f=window.channelFixture={requests:[],wxStatus:'PENDING',wxQrCount:0,failWxQr:false};
async function call(method,url,body){f.requests.push({method,url,body});
 if(url==='/api/game-accounts/script-servers')return {success:true,data:[{id:1,name:'合成服务器'}]};
 if(url==='/api/game-accounts/alipay_get_qrcode2')return {success:true,data:{qrcodeUrl:'https://example.invalid/offline-qr'}};
 if(url==='/api/game-accounts/wx/qrcode'){
   await new Promise(resolve=>setTimeout(resolve,350));
   if(f.failWxQr)return {success:false,message:'模拟二维码获取失败'};
   return {success:true,data:{flow_id:'offline-wx-'+(++f.wxQrCount),image_base64:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEt8AAAAASUVORK5CYII='}};
 }
 if(url==='/api/game-accounts/wx/poll')return {success:true,data:{status:f.wxStatus,...(f.wxStatus==='COMPLETED'?{servers:[{serverId:'7',roleName:'离线角色'}]}:{})}};
 if(url==='/api/game-accounts/wx/cancel'||url==='/api/game-accounts/bind_wx')return {success:true};
 throw Error('Unexpected endpoint '+url)
}
export default {get:async(u,c)=>({data:await call('GET',u,c?.params)}),post:async(u,b)=>({data:await call('POST',u,b)})};
`
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:root,contents:`
import {createApp,h,ref} from 'vue';import Antd from 'ant-design-vue';import AddAccountModal from './src/components/AddAccountModal.vue';
const open=ref(false);window.openFixture=()=>open.value=true;
createApp({setup:()=>()=>h(AddAccountModal,{isOpen:open.value,token:'synthetic',onClose:()=>open.value=false})}).use(Antd).mount('#app');window.fixtureReady=true;
`},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},
plugins:[{name:'offline-real-components',setup(builder){
 builder.onResolve({filter:/(?:utils\/|\.\/)axios$/},()=>({path:'mock',namespace:'offline'}));
 builder.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:mock,loader:'js'}));
 builder.onResolve({filter:/^(vue-router)$|(?:UserAvatar|TopNavBar|PointTransactionHistory|ForgotPasswordModal|InviteRewardRules)\.vue$/},args=>({path:args.path,namespace:'unrelated'}));
 builder.onLoad({filter:/.*/,namespace:'unrelated'},args=>({contents:args.path==='vue-router'?'export const useRouter=()=>({push(){},replace(){}})':'export default {render:()=>null}',loader:'js'}));
 builder.onLoad({filter:/\.vue$/},async args=>{
 const {descriptor}=parse(await readFile(args.path,'utf8')),id='gift-'+path.basename(args.path).replace(/[^a-z]/gi,'-');
 const compiled=compileScript(descriptor,{id,inlineTemplate:true});
 for(const style of descriptor.styles){let source=style.content;for(const match of [...source.matchAll(/@import ['"]([^'"]+)['"];?/g)])source=source.replace(match[0],await readFile(path.resolve(path.dirname(args.path),match[1]),'utf8'));
 const result=compileStyle({source,filename:args.path,id:'data-v-'+id,scoped:style.scoped});assert.deepEqual(result.errors,[]);css+=result.code}
 return {contents:compiled.content.replace('export default ','const __component = ')+`\n__component.__scopeId='data-v-${id}';export default __component;`,loader:'ts',resolveDir:path.dirname(args.path)}
 })
}}]})
const script = bundle.outputFiles[0].text
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><style>${css}
body{margin:0;background:#f3f5f7;font-family:Arial,'Microsoft YaHei',sans-serif}#app{max-width:1120px;margin:24px auto;padding:0 16px}@media(max-width:480px){#app{margin:12px auto;padding:0 8px}}</style></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>`
const server = createServer(async (req, res) => {
  const js = req.url === '/fixture.js'; res.setHeader('Content-Type', js ? 'application/javascript' : 'text/html; charset=utf-8'); if(req.url.startsWith('/icons/')){res.setHeader('Content-Type','image/svg+xml');res.end(await readFile(path.join(root,'public/icons',path.basename(req.url))))}else res.end(js ? script : html)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const tempRoot = await realpath(tmpdir()), profile = await mkdtemp(path.join(tempRoot, 'recharge-invite-browser-'))
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let child, socket, sequence = 0
const pending = new Map(), exceptions = []
function command(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(Error(`Timeout: ${method}`)) }, 10000)
    pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
const text = () => evaluate('document.body.innerText')
async function waitForText(value) {
  for (let i=0;i<60;i++) { if ((await text()).includes(value)) return; await sleep(100) }
  assert.fail('未出现预期文案：'+value)
}
async function click(label) {
  await evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.replace(/\\s/g,'')===${JSON.stringify(label)});if(!e)throw Error('Missing button');e.click()})()`)
  await sleep(150)
}
async function input(index, value) {
  await evaluate(`(()=>{const e=document.querySelectorAll('.ant-input-number-input')[${index}];e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur()})()`)
  await sleep(80)
}
async function capture(name) {
  const at = process.argv.indexOf('--screenshots')
  if (at < 0) return
  const dir = path.resolve(process.argv[at + 1]); await mkdir(dir, { recursive: true })
  await sleep(600)
  const result = await command('Page.captureScreenshot', { format: 'png' })
  await writeFile(path.join(dir, `${name}.png`), Buffer.from(result.data, 'base64'))
}
try {
  let stderr = ''
  child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,900', base],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-20000) })
  let debugPort
  for (let i = 0; i < 100; i++) {
    debugPort = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)?.[1]
    if (debugPort) break
    if (child.exitCode !== null) throw Error(`Browser exited: ${stderr}`)
    await sleep(100)
  }
  assert.ok(debugPort, '未找到隔离浏览器调试端口')
  let target
  for (let i = 0; i < 100; i++) {
    target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(t => t.type === 'page' && t.url.startsWith(base))
    if (target) break
    await sleep(100)
  }
  assert.ok(target)
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails)
    const item = pending.get(message.id); if (!item) return
    clearTimeout(item.timeout); pending.delete(message.id)
    if (message.error) item.reject(Error(JSON.stringify(message.error))); else item.resolve(message.result)
  })
  await command('Runtime.enable')
  for(let i=0;i<100&&!await evaluate('!!window.fixtureReady');i++)await sleep(50);
  await evaluate('window.openFixture()');await sleep(250);
  const choose=async value=>{await evaluate(`document.querySelector('input[type=radio][value="${value}"]').click()`);await sleep(80)};
  for(const width of [1280,390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});await sleep(100);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('input[type=radio]')].map(e=>Number(e.value))"),[0,1,2,3]);
    assert.equal(await evaluate("document.querySelector('input[type=radio]:checked').value"),'0');
    assert.ok(await evaluate("[...document.querySelectorAll('.ant-steps-item-title')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})"));
    await capture('channel-order-'+width);
    await click('下一步');assert.ok((await text()).includes('游戏密码'));await click('上一步');
    for(const channel of [2]){
      await choose(channel);await click('下一步');
      const body=await text();assert.ok(body.includes('抖音小程序因扫码登陆不稳定已取消'));
      assert.ok(!body.includes('获取二维码'));assert.ok(!body.includes('下一步'));
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.modal-actions button')].map(e=>e.textContent.replace(/\\s/g,''))"),['上一步']);
      assert.equal(await evaluate("document.querySelector('.channel-conversion-notice a').href"),'https://www.kdocs.cn/l/cglzU54HkUHa');
      assert.ok(await evaluate("(()=>{const e=document.querySelector('.channel-conversion-notice'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()"));
      await capture('conversion-'+channel+'-'+width);await click('上一步');
    }
    await choose(3);await click('下一步');
    assert.equal(await evaluate("document.querySelector('.channel-conversion-notice')"),null);
    assert.ok((await text()).includes('开始微信扫码登录'));
    await click('获取二维码');
    assert.ok((await text()).includes('正在获取微信二维码'));
    await waitForText('等待微信扫码');
    assert.ok(await evaluate("(()=>{const e=document.querySelector('img[alt=微信登录二维码]'),r=e.getBoundingClientRect();return e.complete&&e.naturalWidth>0&&r.left>=0&&r.right<=innerWidth+1})()"));
    assert.ok(await evaluate("[...document.querySelectorAll('.modal-actions button')].find(e=>e.textContent.includes('等待扫码')).disabled"));
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await capture('wechat-scan-'+width);await click('上一步');
    await choose(0);
  }
  assert.equal((await evaluate('window.channelFixture.requests')).filter(x=>x.url.includes('douyin')).length,0);
  assert.equal((await evaluate('window.channelFixture.requests')).filter(x=>x.url.endsWith('/wx/cancel')).length,3);
  // 实际按钮覆盖失败重取、过期重扫、扫码完成选服和绑定。
  await choose(3);await click('下一步');
  await evaluate('window.channelFixture.failWxQr=true');await click('获取二维码');await waitForText('模拟二维码获取失败');
  assert.equal(await evaluate("[...document.querySelectorAll('.modal-actions button')].find(e=>e.textContent.includes('获取二维码')).disabled"),false);
  await evaluate('window.channelFixture.failWxQr=false');await click('获取二维码');await waitForText('等待微信扫码');
  await evaluate("window.channelFixture.wxStatus='EXPIRED'");await waitForText('二维码已过期');
  await evaluate("window.channelFixture.wxStatus='SCANNED'");await click('重新扫码');await waitForText('正在获取角色信息');
  await evaluate("window.channelFixture.wxStatus='COMPLETED'");await waitForText('确认绑定');
  const expectedFlow=await evaluate("'offline-wx-'+window.channelFixture.wxQrCount");
  await evaluate("document.querySelector('.server-form .ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");await sleep(200);
  await evaluate("document.querySelector('.ant-select-item-option').click()");await sleep(100);
  await capture('wechat-server-320');await click('确认绑定');await waitForText('微信账号绑定成功');
  assert.deepEqual((await evaluate('window.channelFixture.requests')).filter(x=>x.url.endsWith('/bind_wx')).map(x=>x.body),[{flow_id:expectedFlow,server_id:'7'}]);
  await evaluate('window.openFixture()');await sleep(200);
  assert.equal(await evaluate("document.querySelector('input[type=radio]:checked').value"),'0');
  await choose(1);await click('下一步');await click('获取二维码');await sleep(1600);
  assert.equal((await evaluate('window.channelFixture.requests')).filter(x=>x.url.endsWith('/alipay_get_qrcode2')).length,1);
  assert.ok((await text()).includes('支付宝扫描二维码'));
  await capture('alipay-retained-320');
  assert.deepEqual(exceptions,[]);
  console.log('PASS 果园真实Vue微信二维码/失败重试/过期重扫/选服绑定/返回取消、默认账号密码、抖音仅教程、支付宝扫码及1280/390/320布局');
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await command('Browser.close') } catch {}; socket.close() }
  if (child && child.exitCode === null) { await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(3000)]); if (child.exitCode === null) child.kill() }
  for (const item of pending.values()) clearTimeout(item.timeout)
  await new Promise(resolve => server.close(resolve))
  const resolved = await realpath(profile)
  assert.equal(path.dirname(resolved).toLowerCase(), tempRoot.toLowerCase())
  assert.ok(path.basename(resolved).startsWith('recharge-invite-browser-'))
  await rm(resolved, { recursive: true, force: true, maxRetries: 6, retryDelay: 300 })
}
