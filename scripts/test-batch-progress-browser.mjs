// 真实ScriptConfig/Ant弹窗与主题；仅替换HTTP，使用合成角色，不执行真实扣费。
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileStyle, compileTemplate } from '@vue/compiler-sfc'
import { compile as compileSass } from 'sass'
const root = fileURLToPath(new URL('../', import.meta.url))
let componentCss = ''
const mock = `
  export const state = window.quotaMock = {calls:[],pending:[],accounts:Array.from({length:6},(_,i)=>({id:i+1,nickname:['山茶小院','云朵花房','花艺师','薄荷花园','晚风与花','很长的角色名称用于验证窄屏能够完整换行展示'][i],username:'synthetic-'+i,platform:0,server_id:String(800+i),status:'active',expire_time:'2099-10-01T00:00:00Z'}))};
  const record=id=>({id:String(id),isStarted:state.started||false,status:'offline',record:{level:60,diamond:1888,gold:120000}});
  export default {async get(url){
    if(url==='/api/game-accounts/list')return {data:{success:true,data:state.accounts}};
    if(url.startsWith('/api/game-accounts/player_records'))return {data:{code:200,data:{results:state.accounts.map(a=>record(a.id))}}};
    if(url.endsWith('/expired'))return {data:{success:true,data:{isExpired:false}}};
    if(url==='/api/points/balance')return {data:{points:500}};
    if(url==='/api/quota-settings/active')return {data:{success:true,data:[{days:30,points:10,label:'月套餐'}]}};
    if(url==='/api/auth/group-chat-image')return {data:{success:true,data:{}}};
    throw Error('Unexpected GET: '+url);
  },post(url,body){
    if(!/^\\/api\\/game-accounts\\/\\d+\\/(extend-quota|start|stop)$/.test(url))throw Error('Unexpected POST: '+url);
    state.calls.push({url,body});return new Promise((resolve,reject)=>state.pending.push({resolve,reject}));
  }};
`
const bundle = await build({
  stdin:{resolveDir:root,loader:'ts',contents:`
    import {createApp,nextTick} from 'vue';import {createRouter,createMemoryHistory} from 'vue-router';
    import Antd from 'ant-design-vue';import 'ant-design-vue/dist/reset.css';import './src/App.css';
    import ScriptConfig from './src/components/ScriptConfig.vue';
    localStorage.setItem('token','synthetic-preview');localStorage.setItem('user',JSON.stringify({id:1,points:500}));

    const app=createApp(ScriptConfig,{user:{id:1,points:500},token:'synthetic-preview'});
    app.use(createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{render:()=>null}}]})).use(Antd).mount('#app');
    const vm=app._instance.setupState;
    function find(v){if(!v)return null;if(v.component?.type?.__name==='BatchAccountActions')return v.component.setupState;return find(v.component?.subTree)||(Array.isArray(v.children)?v.children.map(find).find(Boolean):null)}
    const controller=()=>find(app._instance.subTree);
    const garden=typeof vm.quotaProgressVisible==='boolean', embedded=typeof vm.executeAccountBatch==='function';
    window.quotaTest={vm,controller,garden,embedded,async start(count=6){
      vm.accounts=window.quotaMock.accounts.slice(0,count);await nextTick();
      if(garden){await vm.handleBatchQuota();vm.confirmExtendQuota();window.quotaRun=vm.executeExtendQuota()}
      else{const c=controller();await c.openQuota();window.quotaRun=c.executeQuota({accounts:c.snapshot,plan:{days:30,points:10,additionalPoints:0},balance:500})}
      await nextTick();
    },async action(kind){vm.accounts=window.quotaMock.accounts.slice(0,3);await nextTick();if(embedded){vm.batchBusy=true;window.quotaRun=vm.executeAccountBatch(vm.accounts.map(a=>({id:a.id,label:a.nickname})),kind)}else{const c=controller();c.acquire();window.quotaRun=c.executeAction(kind)}await nextTick()},
    get running(){return garden||embedded&&vm.batchRunning?vm.batchRunning:controller().running},
    reply(success=true){window.quotaMock.pending.shift().resolve({data:{success,message:success?'操作成功':'模拟失败',data:{newBalance:480}}})},
    menu(){if(embedded)vm.batchFloatOpen=true;else controller().menuOpen=true},
    closeMenu(){if(embedded)vm.batchFloatOpen=false;else controller().menuOpen=false}};
  `},bundle:true,write:false,outfile:'quota-preview.js',format:'iife',platform:'browser',
  define:{'process.env.NODE_ENV':'"development"','import.meta.env.DEV':'true',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},
  plugins:[{name:'quota-preview',setup(builder){
    builder.onResolve({filter:/(utils\/axios|\.\/axios)$/},()=>({path:'axios',namespace:'quota-mock'}))
    builder.onLoad({filter:/.*/,namespace:'quota-mock'},()=>({contents:mock}))
    builder.onLoad({filter:/\.vue$/},async args=>{
      if(!['ScriptConfig.vue','BatchProgress.vue','BatchAccountActions.vue'].includes(path.basename(args.path)))return {contents:'export default {render:()=>null}',loader:'js'}
      const {descriptor,errors}=parse(await readFile(args.path,'utf8'),{filename:args.path});assert.deepEqual(errors,[])
      const id='data-v-'+path.basename(args.path).replace(/\W/g,'').toLowerCase(),script=compileScript(descriptor,{id,genDefaultAs:'__sfc__'})
      const template=compileTemplate({id,filename:args.path,source:descriptor.template.content,compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(template.errors,[])
      for(const style of descriptor.styles){
        let source=style.content
        for(const match of [...source.matchAll(/@import\s+['"]([^'"]+)['"];?/g)])source=source.replace(match[0],await readFile(path.resolve(path.dirname(args.path),match[1]),'utf8'))
        const result=compileStyle({source,filename:args.path,id,scoped:style.scoped,preprocessLang:style.lang,preprocessOptions:{quietDeps:true,silenceDeprecations:['legacy-js-api','import']}});assert.deepEqual(result.errors,[]);componentCss+=result.code
      }
      return {contents:script.content+'\n'+template.code.replace('export function render','function render')+'\n__sfc__.render=render;__sfc__.__scopeId='+JSON.stringify(id)+';export default __sfc__',loader:'ts',resolveDir:path.dirname(args.path)}
    })
  }}],
})
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text
const css=(bundle.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'')+'\n'+compileSass(path.join(root,'src/index.scss'),{quietDeps:true}).css+'\n'+componentCss
const server=createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js)}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css)}
  else if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{background:var(--theme-page-bg);min-height:100vh}#app{padding-top:24px}</style></head><body><div id="app"></div><script src="/app.js"></script></body></html>')}
  else{res.statusCode=404;res.end()}
})
const candidates=[process.env.QUOTA_TEST_BROWSER,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean)
let executable
for(const candidate of candidates){try{if((await stat(candidate)).isFile()){executable=candidate;break}}catch{}}
assert.ok(executable,'需要已安装的Edge；不下载浏览器')
const tempRoot=await realpath(tmpdir()),profile=await mkdtemp(path.join(tempRoot,'quota-progress-browser-'))
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`
let child,socket,nextId=0
const pending=new Map(),exceptions=[]
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method))},15000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}))})
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function waitFor(expression){for(let i=0;i<160;i++){if(await evaluate(expression))return;await sleep(50)}throw Error('未满足浏览器断言: '+expression)}
async function click(text){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text)}&&!b.disabled);if(!b)throw Error('未找到按钮');b.click()})()`);await sleep(100)}
async function capture(name){const i=process.argv.indexOf('--screenshots');if(i<0)return;await sleep(250);const r=await command('Page.captureScreenshot',{format:'jpeg',quality:85});await writeFile(path.join(process.argv[i+1],name+'.jpg'),Buffer.from(r.data,'base64'))}
async function layout(width){await command('Emulation.setDeviceMetricsOverride',{width,height:width<500?844:900,deviceScaleFactor:1,mobile:false});await sleep(200);assert.ok(await evaluate("(()=>{const e=document.querySelector('.quota-progress-modal .ant-modal-content'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1})()"),'弹窗必须完整显示且无横向溢出')}
try{
  let stderr='';child=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1280,900','about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});child.stderr.on('data',c=>stderr=(stderr+c.toString()).slice(-20000))
  let port;for(let i=0;i<100;i++){port=stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)?.[1];if(port)break;if(child.exitCode!==null)throw Error(stderr);await sleep(100)}assert.ok(port)
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
  await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})})
  socket.addEventListener('message',({data})=>{const r=JSON.parse(data);if(r.method==='Runtime.exceptionThrown')exceptions.push(r.params.exceptionDetails);const p=pending.get(r.id);if(!p)return;clearTimeout(p.timeout);pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result)})
  await command('Runtime.enable');await command('Page.navigate',{url:base});await waitFor('!!window.quotaTest && !window.quotaTest.vm.isLoading && window.quotaTest.vm.accounts.length===6')

  await evaluate('window.quotaTest.menu()');await sleep(300)
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.account-batch-action')].map(b=>b.innerText.trim())"),['启动全部','停止全部','全部配额'])
  const fab=await evaluate("(()=>{const r=document.querySelector('.account-batch-fab>.ant-float-btn').getBoundingClientRect();return {x:r.x,w:r.width,h:r.height}})()")
  assert.equal(fab.x,24);assert.equal(fab.w,48);assert.equal(fab.h,48);await capture('batch-menu');await evaluate('window.quotaTest.closeMenu()')
  await evaluate('window.quotaTest.start()');await waitFor("!!document.querySelector('.quota-progress-modal .ant-modal-content')");await sleep(350)
  assert.equal(await evaluate("document.querySelectorAll('.quota-progress-modal .ant-modal-close').length"),0)
  assert.match(await evaluate("document.querySelector('.quota-progress-current').innerText"),/正在为「山茶小院」分配配额/)
  await evaluate('window.quotaTest.reply()');await waitFor("document.querySelector('.quota-progress-current').innerText.includes('即将为「云朵花房」')")
  assert.equal(await evaluate('window.quotaMock.calls.length'),1)
  await waitFor('window.quotaMock.calls.length===2');
  for(const width of [1280,390,320]){await layout(width);await capture('quota-running-'+width)}
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});assert.ok(await evaluate("!!document.querySelector('.quota-progress-modal')"))
  assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented})()"),true)
  await click('取消剩余');assert.match(await evaluate("document.querySelector('.quota-progress-current').innerText"),/等待「云朵花房」/);await evaluate('window.quotaTest.reply(false);window.quotaRun');await sleep(100)
  assert.equal(await evaluate('window.quotaMock.calls.length'),2);assert.equal(await evaluate("document.querySelectorAll('.quota-progress-results li').length"),6)
  await layout(390);await capture('quota-results-mobile')
  assert.equal(await evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented})()"),false)
  await click('完成');await waitFor("!document.querySelector('.quota-progress-modal')");await click('查看结果');await waitFor("!!document.querySelector('.quota-progress-modal')");assert.equal(await evaluate('window.quotaMock.calls.length'),2)
  await click('完成');await evaluate('window.quotaTest.start(3)');await waitFor('window.quotaMock.pending.length===1');await evaluate("window.quotaMock.pending.shift().reject(Error('synthetic offline'));window.quotaRun");await sleep(100)
  assert.match(await evaluate("document.querySelector('.quota-progress-unknown').innerText"),/核对/);await capture('quota-unknown');await click('完成')
  for(const kind of ['start','stop']){
    await evaluate(`window.quotaMock.started=${kind==='stop'};window.quotaTest.action('${kind}')`);await waitFor('window.quotaMock.pending.length===1');await sleep(200)
    assert.match(await evaluate("document.querySelector('.quota-progress-current').innerText"),new RegExp('正在'+(kind==='start'?'启动':'停止')+'「山茶小院」'))
    await layout(320);await capture(kind+'-running');await click('取消剩余');await evaluate('window.quotaTest.reply();window.quotaRun');await sleep(100)
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.quota-progress-result-status')].map(e=>e.innerText)"),['成功','已取消','已取消'])
    await capture(kind+'-cancelled');await click('完成')
  }
  assert.deepEqual(exceptions,[])
  console.log('PASS real browser: all three buttons, 48px FAB, 1280/390/320px modal/results, quota pacing, guarded close, current role, cancellation, unknown, read-only review, start/stop; no live writes')

}finally{
  if(socket?.readyState===WebSocket.OPEN){try{await command('Browser.close')}catch{}socket.close()}
  if(child&&child.exitCode===null){await Promise.race([new Promise(r=>child.once('exit',r)),sleep(3000)]);if(child.exitCode===null)child.kill()}
  for(const p of pending.values())clearTimeout(p.timeout)
  server.closeAllConnections();await new Promise(r=>server.close(r))
  const resolved=await realpath(profile);assert.equal(path.dirname(resolved).toLowerCase(),tempRoot.toLowerCase());assert.ok(path.basename(resolved).startsWith('quota-progress-browser-'))
  await rm(resolved,{recursive:true,force:true,maxRetries:6,retryDelay:300})
}
