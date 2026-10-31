// 真实 Vue/Antd + 本机浏览器，接口全部使用合成数据；不加载环境配置或访问业务服务。
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'
import { readFile, writeFile, mkdtemp, realpath, rm, stat, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
let styles = ''
const mock = `
const now=Date.now(), day=new Date(now+28800000).toISOString().slice(0,10);
const options=[{id:'card',type:'card',value:5},{id:'points',type:'points',value:7},{id:'time',type:'time',value:24}];
const rally={backgroundUrl:'/api/activity-backgrounds/'+'a'.repeat(64)+'.jpg',id:1,type:'guild_rally',title:'秋日公会集结',description:'合成测试活动',startAt:now-86400000,endAt:now+86400000,enabled:true,status:'active',quota:{days:7,points:5,maxPerRole:1},rewards:[{id:'g2',label:'集结二人礼',kind:'guild',threshold:2,options}],guilds:[{accountId:11,nickname:'山间听雨',unionId:'9',unionName:'青山妖盟',participants:1,allocationCount:0,canAllocate:true}],rewardStates:[],signIn:{signedToday:false,totalDays:0,canSignIn:false}};
const signin={backgroundUrl:'/api/activity-backgrounds/'+'a'.repeat(64)+'.jpg',id:2,type:'sign_in',title:'秋日签到',description:'每天来领取签到礼',startAt:now-86400000,endAt:now+86400000,enabled:true,status:'active',quota:null,rewards:[{id:'daily',label:'每日签到礼',kind:'daily',threshold:0,options},{id:'s1',label:'累计一天礼',kind:'cumulative',threshold:1,options}],guilds:[],rewardStates:[{rewardId:'daily',day,eligible:false,claimed:false},{rewardId:'s1',eligible:false,claimed:false}],signIn:{signedToday:false,totalDays:0,canSignIn:true}};
export const state=window.activityFixture={activities:[rally,signin],claims:[],calls:[],summary:true,summaryMode:'legacy',summaryError:0,listError:0,recharge:0,dailyEnabled:false,rechargeEnabled:true,failNext:false,accounts:[{id:11,nickname:'山间听雨',serverName:'测试服',expireTime:new Date(now+86400000).toISOString()}]};
const copy=v=>JSON.parse(JSON.stringify(v));const response=data=>({data:{success:true,data:copy(data)}});
export default {
 async get(url,opts){state.calls.push({method:'GET',url});
 if(url==='/api/activities'){if(state.listError)throw Object.assign(Error('合成列表失败'),{response:{status:state.listError}});const result=response({activities:state.activities,accounts:state.accounts,hasPending:state.summary});if(state.holdNextList){state.holdNextList=false;await new Promise(resolve=>state.releaseList=resolve);delete state.releaseList}return result}
 if(url==='/api/activities/summary'){if(state.summaryError)throw Object.assign(Error('合成摘要失败'),{response:{status:state.summaryError}});return response({hasPending:state.summary,...(state.summaryMode==='legacy'?{}:{activeTypes:state.summaryMode==='invalid'?null:state.activeTypesOverride??[...new Set(state.activities.filter(a=>a.enabled&&a.status==='active').map(a=>a.type))]})})}
 if(url==='/api/activities/claims')return response({records:state.claims,total:state.claims.length});
 if(url.endsWith('/allocate/status')){if(state.holdSync){state.holdSync=false;await new Promise(resolve=>state.releaseSync=resolve);delete state.releaseSync}return response({completed:!!state.allocationCompleted,ready:!!state.guildReady,message:state.guildReady?'已读取公会：新同步妖盟':'等待角色上线并同步最新公会信息',guild:{unionId:'99',unionName:'新同步妖盟'}})}
 if(url.startsWith('/api/game-accounts/')&&url.endsWith('/player_record'))return {data:{success:true,data:{isOnline:!!state.roleOnline}}};
 if(url==='/api/activities/admin/list')return response(state.activities.map(a=>({...a,canDelete:a.endAt<=Date.now(),status:a.endAt<=Date.now()?'ended':a.status})));
 if(url==='/api/points/balance')return {data:{points:95}};
 if(url==='/api/lottery/info')return {data:{dailyEnabled:state.dailyEnabled,rechargeEnabled:state.rechargeEnabled,rechargeLotteryCount:state.recharge}};
 if(url==='/api/lottery/admin/prizes')return {data:{prizes:[]}};
 if(url==='/api/lottery/accounts')return {data:{accounts:[]}};
 if(url==='/api/lottery/records')return {data:{records:[],total:0}};
 throw Error('Unexpected GET '+url);
 },async post(url,body){state.calls.push({method:'POST',url,body:copy(body)});
 if(state.failNext){state.failNext=false;throw Error('合成网络超时')}
 if(url.startsWith('/api/game-accounts/')&&(url.endsWith('/start')||url.endsWith('/stop'))){if(url.endsWith('/start')&&state.startFailure)return {data:{success:false,message:'角色授权已过期，请先重新认证'}};state.roleOnline=url.endsWith('/start');return {data:{success:true}}}
 if(url==='/api/activities/admin/backgrounds'){state.uploaded=body.image;return response({url:'/api/activity-backgrounds/'+'a'.repeat(64)+'.jpg'})}
 if(url==='/api/activities/admin'){state.created=copy(body);return response({id:3})}
 const a=state.activities.find(a=>a.id===Number(url.split('/')[3]));
 if(url.endsWith('/allocate/prepare')){const g=a.guilds[0];g.preparation||={id:a.id*100,accountId:g.accountId,firstDays:1,paidPoints:g.firstPoints,remainingDays:a.quota.days-1,remainingPoints:a.quota.points-g.firstPoints,createdAt:Date.now(),completed:false};g.canAllocate=false;g.requiresGuildSync=true;return response({preparation:g.preparation})}
 if(url.endsWith('/allocate/complete')){if(state.completeFailure)throw Error('点数不足，首日进度保留');state.allocationCompleted=true;const g=a.guilds[0];delete g.preparation;Object.assign(g,{canAllocate:false,canPrepare:false,requiresGuildSync:false,allocationCount:1,participants:1,unionName:'新同步妖盟',reason:'本期分配次数已用完'});return response({participationId:99,allocationCount:1})}
 if(url.endsWith('/allocate')){Object.assign(a.guilds[0],{participationId:21,participants:2,allocationCount:1,canAllocate:false,reason:'本期分配次数已用完'});a.rewardStates=[{rewardId:'g2',participationId:21,accountId:11,eligible:true,claimed:false}];return response({newBalance:95})}
 if(url.endsWith('/sign-in')){Object.assign(a.signIn,{signedToday:true,totalDays:1,canSignIn:false});a.rewardStates.forEach(r=>r.eligible=true);return response({signedToday:true,totalDays:1})}
 if(url.endsWith('/claim')){const reward=a.rewards.find(r=>r.id===body.rewardId), option=reward.options.find(o=>o.id===body.optionId);a.rewardStates.filter(r=>r.rewardId===reward.id&&(!body.day||r.day===body.day)).forEach(r=>r.claimed=true);const record={id:state.claims.length+1,activityId:a.id,title:a.title,rewardLabel:reward.label,type:option.type,value:option.value,createdAt:Date.now(),...(option.type==='card'?{cardCode:'FLKTESTTEST12345'}:{}),...(option.type==='time'?{targetNickname:'山间听雨'}:{})};state.claims.unshift(record);return response(record)}
 throw Error('Unexpected POST '+url);
 },async put(url,body){state.calls.push({method:'PUT',url,body:copy(body)});return response({id:Number(url.split('/').pop())})},
 async delete(url){state.calls.push({method:'DELETE',url});const id=Number(url.split('/').pop()),a=state.activities.find(a=>a.id===id);if(a.endAt>Date.now())throw Error('活动尚未到期');state.activities=state.activities.filter(a=>a.id!==id);return response({id,deleted:true})}
};`
const bundle = await build({absWorkingDir:root,bundle:true,write:false,outfile:'activities.js',format:'iife',platform:'browser',alias:{'@':path.join(root,'src')},
 define:{'process.env.NODE_ENV':'"development"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},
 stdin:{resolveDir:root,loader:'ts',contents:`
 import {createApp,h,ref,nextTick} from 'vue';import Antd,{message} from 'ant-design-vue';import 'ant-design-vue/dist/reset.css';
 import Welfare from './src/features/activities/ActivityWelfare.vue';import Admin from './src/features/activities/ActivityAdmin.vue';
 import WelfarePage from './src/pages/WelfarePage.vue';
 import WelfareNavLabel from './src/features/activities/WelfareNavLabel.vue';
 import {activitiesApi} from './src/features/activities/api';
 import {useWelfareNotifications,refreshWelfareNotifications} from './src/features/activities/useWelfareNotifications';
 const user={id:1,role:'admin',points:100,permissions:{welfare_panel:true}};
 localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('token','synthetic-preview');
 const mode=ref('guild_rally'), controller=ref();
 const app=createApp({setup(){const n=useWelfareNotifications();return()=>h('main',{class:mode.value==='page'?'full-page':''},[h('span',{id:'notification',style:'position:absolute;left:-10000px'},n.hasPending.value?'有待办':'无待办'),h('div',{id:'welfare-nav-preview',style:'height:36px;padding:4px 16px'},h(WelfareNavLabel,{active:n.hasActiveActivities.value})),h(mode.value==='admin'?Admin:mode.value==='page'?WelfarePage:Welfare,{key:mode.value,ref:controller,...(mode.value==='admin'?{token:'synthetic-admin'}:mode.value==='page'?{}:{type:mode.value})})])}});
 app.use(Antd).mount('#app');window.activityTest={async mode(value){mode.value=value;await nextTick()},get vm(){return controller.value?.$?.setupState},refresh:refreshWelfareNotifications,summary:()=>activitiesApi.summary(),clearMessages:()=>message.destroy()};
 `},plugins:[{name:'activity-fixture',setup(builder){
 builder.onResolve({filter:/(utils\/axios|\.\/axios)$/},()=>({path:'axios',namespace:'fixture'}));
 builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:mock,loader:'js'}));
 builder.onLoad({filter:/\.vue$/},async args=>{
 const {descriptor,errors}=parse(await readFile(args.path,'utf8'),{filename:args.path});assert.deepEqual(errors,[]);
 const id='data-v-'+path.basename(args.path).replace(/\W/g,'').toLowerCase();const script=compileScript(descriptor,{id,genDefaultAs:'__sfc__'});
 const template=compileTemplate({id,filename:args.path,source:descriptor.template.content,compilerOptions:{bindingMetadata:script.bindings}});assert.deepEqual(template.errors,[]);
 for(const style of descriptor.styles){const source=style.src?await readFile(path.resolve(path.dirname(args.path),style.src),'utf8'):style.content;const result=compileStyle({source,id,scoped:style.scoped});assert.deepEqual(result.errors,[]);styles+=result.code}
 return {contents:script.content+'\n'+template.code.replace('export function render','function render')+'\n__sfc__.render=render;__sfc__.__scopeId='+JSON.stringify(id)+';export default __sfc__',loader:'ts',resolveDir:path.dirname(args.path)};
 });}}]});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=(bundle.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'')+styles;
const server=createServer(async(req,res)=>{if(/^\/images\/activities\/[a-z-]+\.png$/.test(req.url)){res.setHeader('Content-Type','image/png');res.end(await readFile(path.join(root,'public',req.url)));return}if(req.url.startsWith('/api/activity-backgrounds/')){res.setHeader('Content-Type','image/png');res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR2kAAAAASUVORK5CYII=','base64'));return}if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js)}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css)}else if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{margin:0;background:#f7f9fc}main{max-width:1100px;margin:auto;padding:16px}main.full-page{max-width:none;padding:0}</style></head><body><div id="app"></div><script src="/app.js"></script></body></html>')}else{res.statusCode=404;res.end()}});
let executable;for(const candidate of [process.env.ACTIVITIES_TEST_BROWSER,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)){try{if((await stat(candidate)).isFile()){executable=candidate;break}}catch{}}
assert.ok(executable,'需安装 Edge/Chrome 或设置 ACTIVITIES_TEST_BROWSER');
const tempRoot=await realpath(tmpdir()),profile=await mkdtemp(path.join(tempRoot,'activities-browser-'));
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
let child,socket,nextId=0;const pending=new Map(),exceptions=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method))},15000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function waitFor(expression){for(let i=0;i<160;i++){if(await evaluate(expression))return;await sleep(50)}throw Error('未满足浏览器断言: '+expression)}
async function click(text){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\\s/g,'')===${JSON.stringify(text)}&&!b.disabled);if(!b)throw Error('未找到按钮: '+${JSON.stringify(text)});b.click()})()`);await sleep(150)}
async function capture(name){const i=process.argv.indexOf('--screenshots');if(i<0)return;await evaluate('activityTest.clearMessages()');await sleep(350);await mkdir(process.argv[i+1],{recursive:true});const metrics=await command('Page.getLayoutMetrics');const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:metrics.cssContentSize.width,height:metrics.cssContentSize.height,scale:1}});await writeFile(path.join(process.argv[i+1],name+'.png'),Buffer.from(result.data,'base64'))}
async function layout(width,name){await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await sleep(150);assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'页面不能横向溢出 '+width);await capture(name+'-'+width)}
try{
 let stderr='';child=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1280,900','about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});child.stderr.on('data',c=>stderr=(stderr+c.toString()).slice(-20000));
 let port;for(let i=0;i<100;i++){port=stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//)?.[1];if(port)break;if(child.exitCode!==null)throw Error(stderr);await sleep(100)}assert.ok(port);
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});
 socket.addEventListener('message',({data})=>{const r=JSON.parse(data);if(r.method==='Runtime.exceptionThrown')exceptions.push(r.params.exceptionDetails);const p=pending.get(r.id);if(!p)return;clearTimeout(p.timeout);pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result)});
 await command('Runtime.enable');await command('Page.navigate',{url:base});await waitFor("!!window.activityTest?.vm && document.body.innerText.includes('青山妖盟')");
 assert.equal(await evaluate("document.getElementById('notification').innerText"),'有待办');
 // 旧版摘要只有 hasPending；进行中的活动仍须显示入口和 new，领完奖励也不消失。
 await evaluate("activityFixture.summary=false;activityTest.mode('page')");
 await waitFor('!activityTest.vm.activitiesLoading');
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.welfare-tabs [role=tab]')].map(t=>t.textContent)"),['公会集结','签到活动','充值福利（限时）'],'旧摘要缺少 activeTypes 不能误判为没有活动');
 assert.ok(await evaluate("!!document.querySelector('.welfare-new')"),'无待办但活动进行中仍显示 new');
 await layout(390,'page-legacy-summary');
 await evaluate('activityFixture.listError=503;activityTest.refresh()');
 assert.ok(await evaluate("!!document.querySelector('.activity-load-error')"),'加载失败应提示重试');
 assert.equal(await evaluate("document.querySelectorAll('.welfare-tabs [role=tab]').length"),3,'暂时失败保留已加载入口');
 assert.ok(await evaluate("!!document.querySelector('.welfare-new')"));
 await evaluate('activityFixture.listError=0');await click('重试加载活动');
 await waitFor("!document.querySelector('.activity-load-error')");
 await evaluate("activityFixture.summaryMode='modern';activityFixture.summary=true;activityTest.mode('guild_rally')");
 await waitFor("!!document.querySelector('.guild-progress')");
 await evaluate('activityTest.refresh()');
 // 新版明确返回 [] 时不能用旧列表重新打开活动，也不能额外请求完整列表。
 const emptySummary = await evaluate(`(async()=>{activityFixture.activeTypesOverride=[];const before=activityFixture.calls.filter(c=>c.url==='/api/activities').length;const result=await activityTest.summary();delete activityFixture.activeTypesOverride;return {result,extraLists:activityFixture.calls.filter(c=>c.url==='/api/activities').length-before}})()`);
 assert.deepEqual(emptySummary,{result:{hasPending:true,activeTypes:[]},extraLists:0});
 await evaluate("activityFixture.summaryMode='invalid'");
 assert.deepEqual(await evaluate('(async()=> (await activityTest.summary()).activeTypes)()'),['guild_rally','sign_in'],'字段格式错误使用列表兼容');
 await evaluate("activityFixture.summaryMode='modern'");
 for (const status of [404,503]) {
   await evaluate(`activityFixture.summaryError=${status}`);
   assert.deepEqual(await evaluate('(async()=> (await activityTest.summary()).activeTypes)()'),['guild_rally','sign_in'],'摘要不可用使用列表兼容');
 }
 for (const status of [401,403]) {
   const denied = await evaluate(`(async()=>{activityFixture.summaryError=${status};const before=activityFixture.calls.filter(c=>c.url==='/api/activities').length;try{await activityTest.summary();return null}catch(error){return {status:error.response.status,extraLists:activityFixture.calls.filter(c=>c.url==='/api/activities').length-before}}})()`);
   assert.deepEqual(denied,{status,extraLists:0},'登录/权限拒绝不触发兼容请求');
 }
 await evaluate('activityFixture.summaryError=0');
 await layout(1280,'guild-before');await layout(390,'guild-before');await layout(320,'guild-before');
 await click('分配配额并参与');await click('确认分配');await waitFor("document.querySelector('.guild-count strong')?.textContent==='2'");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url.endsWith('/allocate')).length"),1);
 await click('选择奖励');await waitFor("document.body.innerText.includes('5 点福利卡')");await click('确认领取');await waitFor("document.body.innerText.includes('FLKTESTTEST12345')");
 await layout(390,'guild-claimed');
 await evaluate("activityTest.mode('sign_in')");await waitFor("document.body.innerText.includes('今日还未签到')");
 // 网络未知重试应复用同一 requestId。
 await evaluate('activityFixture.failNext=true');await click('立即签到');await waitFor("!activityTest.vm.busy");await click('立即签到');await waitFor("document.body.innerText.includes('今日已签到')");
 assert.equal(await evaluate("(()=>{const calls=activityFixture.calls.filter(c=>c.url.endsWith('/sign-in'));return calls.length===2&&calls[0].body.requestId===calls[1].body.requestId})()"),true);
 await evaluate("document.querySelector('.calendar-day.day-today').click()");await waitFor('activityTest.vm.claimOpen');await evaluate("activityTest.vm.selectedOptionId='time'");assert.ok(await evaluate("Array.from(document.querySelectorAll('.ant-modal-footer button')).find(b=>b.innerText.includes('确认领取')).disabled"));await evaluate('activityTest.vm.claimReward()');
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/2/claim').length"),0,'选择时长必须选择自己的目标角色');
 // 领取时长的目标角色必须有效，不能借其他有效角色替过期角色领取。
 await evaluate("activityFixture.accounts.push({id:12,nickname:'过期角色',serverName:'测试服',expireTime:'2020-01-01T00:00:00Z'});activityTest.vm.load(true)");
 assert.deepEqual(await evaluate('activityTest.vm.accountOptions.map(a=>a.value)'),[11]);
 await evaluate('activityTest.vm.targetAccountId=12;activityTest.vm.claimReward()');
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/2/claim').length"),0);
 await evaluate("activityFixture.accounts[0].expireTime='2020-01-01T00:00:00Z';activityTest.vm.load(true)");
 assert.equal(await evaluate('activityTest.vm.accountOptions.length'),0);
 assert.equal(await evaluate('activityTest.vm.targetAccountId == null'),true,'过期或移除后清空目标，不能显示裸角色ID');
 assert.ok(await evaluate("document.body.innerText.includes('暂无可领取角色')"));
 await layout(320,'time-reward-expired-role');
 await evaluate("activityFixture.accounts[0].expireTime=new Date(Date.now()+86400000).toISOString();activityTest.vm.load(true)");
 assert.deepEqual(await evaluate('activityTest.vm.accountOptions.map(a=>a.value)'),[11]);
 await evaluate('activityTest.vm.targetAccountId=11');await click('确认领取');await waitFor("document.body.innerText.includes('已到账角色')");
 await click('选择奖励');await evaluate("activityTest.vm.selectedOptionId='points'");await click('确认领取');await waitFor("activityFixture.claims.length===3");await layout(390,'signin-claimed');
 await evaluate('activityFixture.summary=false;activityTest.refresh()');assert.equal(await evaluate("document.getElementById('notification').innerText"),'无待办');
 await evaluate('activityFixture.recharge=1;activityTest.refresh()');assert.equal(await evaluate("document.getElementById('notification').innerText"),'有待办');
 await evaluate("activityTest.mode('admin')");await waitFor("document.body.innerText.includes('秋日公会集结')");await layout(1280,'admin-list');await layout(390,'admin-list');
 await click('添加活动');await waitFor('activityTest.vm.open');await click('保存活动');
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.method==='POST'&&c.url==='/api/activities/admin').length"),0,'管理员缺少必填项不能提交');
 await evaluate("activityTest.vm.form.title='新一期集结';activityTest.vm.form.rewards[0].label='五人礼包'");
 await click('添加可选奖励');await click('添加可选奖励');await layout(1280,'admin-editor');await layout(390,'admin-editor');
 await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=80;c.height=40;const blob=await new Promise(r=>c.toBlob(r,'image/png'));const d=new DataTransfer();d.items.add(new File([blob],'test-background.png',{type:'image/png'}));const input=document.querySelector('.background-file-input');input.files=d.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 await waitFor("!!activityFixture.uploaded && !activityTest.vm.uploading");
 assert.ok(await evaluate("activityTest.vm.form.backgroundUrl.startsWith('/api/activity-backgrounds/')"));
 await click('保存活动');await waitFor('!activityTest.vm.open');
 assert.ok(await evaluate("activityFixture.created.backgroundUrl.endsWith('.jpg')"));
 assert.equal(await evaluate('activityFixture.created.quota.maxPerRole'),1);
 assert.deepEqual(await evaluate('activityFixture.created.rewards[0].options.map(o=>o.type)'),['points','card','time']);
 await click('添加活动');await evaluate("activityTest.vm.form.type='sign_in';activityTest.vm.changeType();activityTest.vm.form.title='新一期签到';activityTest.vm.form.rewards[0].label='每日礼'");
 await click('添加奖励档位');await evaluate("activityTest.vm.form.rewards[1].label='累计七天礼'");await click('保存活动');await waitFor('!activityTest.vm.open');
 assert.equal(await evaluate('activityFixture.created.quota'),null);
 assert.deepEqual(await evaluate('activityFixture.created.rewards.map(r=>r.kind)'),['daily','cumulative']);
 await evaluate('activityTest.vm.items[0].hasParticipation=true');await click('编辑活动');await waitFor('activityTest.vm.locked');
 assert.equal(await evaluate("document.querySelector('.rule-section').disabled"),true,'已有参与活动的配额表单锁定');
 await evaluate("activityTest.vm.form.title='只更新说明标题'");await click('保存活动');await waitFor('!activityTest.vm.open');
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.method==='PUT').at(-1).body.startAt===activityFixture.activities[0].startAt"),true,'编辑标题保留原始毫秒开始时间');
 // 活动卡片只展示进行中的签到；历史领奖不受过滤影响。
 await evaluate("activityFixture.activities.push(...['disabled','ended','upcoming'].map((status,index)=>({...JSON.parse(JSON.stringify(activityFixture.activities[1])),id:index+10,title:'隐藏签到'+status,status,enabled:status!=='disabled',endAt:status==='ended'?Date.now()-1:Date.now()+86400000})));activityTest.mode('sign_in')");
 await waitFor("document.querySelectorAll('.activity-card').length===1");
 assert.equal(await evaluate("document.body.innerText.includes('隐藏签到')"),false);
 assert.equal(await evaluate("document.querySelectorAll('.day-signed').length"),1,'已签到日期在日历中勾选');
 await evaluate("activityFixture.activities.find(a=>a.id===2).status='ended';activityTest.vm.load(true)");
 await waitFor("!!document.querySelector('.activity-empty')");
 assert.equal(await evaluate("document.querySelectorAll('.claim-record').length"),3,'隐藏旧签到仍保留所有已发奖励');
 await layout(390,'signin-empty');
 // 管理员只有已到期活动能打开删除确认，两种活动删除均保留已发奖励。
 await evaluate("activityTest.mode('admin')");await waitFor("activityTest.vm.items.length===5");
 assert.equal(await evaluate("[...document.querySelectorAll('button')].filter(b=>b.textContent.replace(/\\s/g,'')==='删除活动'&&!b.disabled).length"),1);
 await click('删除活动');await waitFor("document.body.innerText.includes('确认删除')");await click('取消');
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.method==='DELETE').length"),0,'取消删除不发请求');
 await click('删除活动');await click('确认删除');await waitFor("activityTest.vm.items.length===4");
 await evaluate("activityFixture.activities[0].endAt=Date.now()-1;activityTest.vm.load()");await waitFor("activityTest.vm.items[0].canDelete");
 await click('删除活动');await click('确认删除');await waitFor("activityTest.vm.items.length===3");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.method==='DELETE').length"),2);
 assert.equal(await evaluate('activityFixture.claims.length'),3);
 // 在真实福利页外壳中检查双类型、导航和手机布局。
 await evaluate("activityFixture.activities=activityFixture.activities.filter(a=>a.id===2);activityFixture.activities[0].status='active';activityFixture.activities[0].startAt=Date.parse('2026-10-01T00:00:00+08:00');activityFixture.activities[0].endAt=Date.parse('2026-11-10T00:00:00+08:00');activityFixture.activities[0].signIn.today='2026-10-27';activityFixture.activities[0].signIn.days=['2026-10-27'];activityTest.mode('page')");
 await waitFor("!!document.querySelector('.signin-calendar')");
 assert.equal(await evaluate('activityTest.vm.activeTab'),'sign_in','仅开放签到时默认展示签到');
 await waitFor("document.querySelector('.activity-artwork img')?.naturalWidth>0");await layout(1280,'page-signin');await layout(390,'page-signin');await layout(320,'page-signin');
 assert.equal(await evaluate("document.querySelectorAll('.calendar-table thead th').length"),7);
 await evaluate("document.querySelector('[aria-label=下个月]').click()");await waitFor("!!document.querySelector('[data-date=\"2026-11-01\"]')");
 await evaluate("window.dispatchEvent(new Event('activitiesChanged'))");await sleep(180);
 assert.ok(await evaluate("!!document.querySelector('[data-date=\"2026-11-01\"]')"),'刷新后仍保留正在浏览的月份');
 await evaluate("document.querySelector('[aria-label=回到本月]').click()");await waitFor("!!document.querySelector('[data-date=\"2026-10-01\"]')");

 await evaluate("activityFixture.activities.unshift({...JSON.parse(JSON.stringify(activityFixture.activities[0])),id:1,type:'guild_rally',title:'秋日公会集结',description:'与公会伙伴集结，解锁每一份心意。',quota:{days:30,points:30,maxPerRole:1},guilds:[{accountId:11,nickname:'山间听雨',unionName:'青山妖盟',participants:3,allocationCount:1,canAllocate:false,reason:'本期分配次数已用完'}],rewards:[{id:'g5',label:'集结五人礼',kind:'guild',threshold:5,options:[{id:'points',type:'points',value:10}]},{id:'g10',label:'集结十人礼',kind:'guild',threshold:10,options:[{id:'card',type:'card',value:20},{id:'points',type:'points',value:20},{id:'time',type:'time',value:24}]}],rewardStates:[]});activityTest.vm.activeTab='guild_rally'");
 await evaluate('activityTest.refresh()');await waitFor("!!document.querySelector('.guild-progress')");await layout(1280,'page-guild');await layout(390,'page-guild');await layout(320,'page-guild');
 await evaluate("activityFixture.accounts=[];activityTest.mode('sign_in')");await waitFor("activityTest.vm.accounts.length===0 && !!document.querySelector('.signin-calendar')");
 // 服务端拒绝无有效角色；按钮和今日日期均不可签到，不能发出签到请求。
 const signCallsBefore = await evaluate("activityFixture.calls.filter(c=>c.url.endsWith('/sign-in')).length");
 for (const expired of [false,true]) {
  await evaluate(`activityFixture.accounts=${expired ? "[{id:11,nickname:'已过期角色',serverName:'测试服',expireTime:'2020-01-01T00:00:00Z'}]" : "[]"};(()=>{const a=activityFixture.activities.find(a=>a.type==='sign_in');Object.assign(a.signIn,{signedToday:false,canSignIn:false,reason:'名下至少需要一个未过期角色才能签到，请先绑定角色并开通或续期配额'});a.rewardStates=[]})();activityTest.vm.load(true)`);
  await waitFor("document.querySelector('.signin-cta').disabled && document.body.innerText.includes('请先绑定角色并开通或续期配额')");
  await evaluate("document.querySelector('.signin-cta').click()");
  assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url.endsWith('/sign-in')).length"),signCallsBefore);
  assert.ok(await evaluate("document.querySelector('.calendar-day.day-today').disabled"));
  await layout(320,expired?'signin-expired-role':'signin-no-role');
 }
 await evaluate("activityFixture.accounts=[{id:11,nickname:'已续期角色',serverName:'测试服',expireTime:new Date(Date.now()+86400000).toISOString()}];(()=>{const a=activityFixture.activities.find(a=>a.type==='sign_in');Object.assign(a.signIn,{canSignIn:true,reason:''})})();activityTest.vm.load(true)");
 await waitFor("!document.querySelector('.signin-cta').disabled");
 await click('立即签到');await waitFor("document.querySelector('.signin-cta').disabled");
 assert.ok(await evaluate("document.body.innerText.includes('签到需名下至少一个未过期角色')"));
 // 旧版列表也只开放进行中的类型，奖励领完、无角色不能隐藏入口。
 await evaluate("activityFixture.summaryMode='legacy';activityFixture.activities.forEach(a=>{a.enabled=false;a.status='disabled'});activityFixture.summary=false;activityTest.mode('page')");
 await waitFor("activityTest.vm.activeTab==='recharge'");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.welfare-tabs [role=tab]')].map(t=>t.textContent)"),['充值福利（限时）']);
 assert.equal(await evaluate("!!document.querySelector('.welfare-new')"),false,'全部停用，即使有充值次数也不显示 new');
 await evaluate("const g=activityFixture.activities.find(a=>a.type==='guild_rally');g.enabled=true;g.status='active';window.dispatchEvent(new Event('activitiesChanged'))");
 await waitFor("document.querySelectorAll('.welfare-tabs [role=tab]').length===2");
 assert.equal(await evaluate('activityTest.vm.activeTab'),'recharge','新活动开放不打断当前有效选项卡');
 await evaluate("[...document.querySelectorAll('.welfare-tabs [role=tab]')].find(t=>t.textContent==='公会集结').click()");
 await waitFor("activityTest.vm.activeTab==='guild_rally'");
 await evaluate("const s=activityFixture.activities.find(a=>a.type==='sign_in');s.enabled=true;s.status='active';window.dispatchEvent(new Event('activitiesChanged'))");
 await waitFor("document.querySelectorAll('.welfare-tabs [role=tab]').length===3");
 assert.ok(await evaluate("!!document.querySelector('.welfare-new')"),'没有角色且已签到领完仍有 new');
 await evaluate('window.openActivities=JSON.parse(JSON.stringify(activityFixture.activities))');
 await evaluate("activityFixture.activities.find(a=>a.type==='guild_rally').enabled=false;window.dispatchEvent(new Event('activitiesChanged'))");
 await waitFor("activityTest.vm.activeTab==='sign_in'");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.welfare-tabs [role=tab]')].map(t=>t.textContent)"),['签到活动','充值福利（限时）']);
 await evaluate("activityFixture.activities.find(a=>a.type==='sign_in').status='ended';window.dispatchEvent(new Event('activitiesChanged'))");
 await waitFor("activityTest.vm.activeTab==='recharge'");
 assert.equal(await evaluate("!!document.querySelector('.welfare-new')"),false);
 await evaluate("activityFixture.activities.forEach(a=>{a.enabled=true;a.status='upcoming'});activityTest.refresh()");
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.welfare-tabs [role=tab]')].map(t=>t.textContent)"),['充值福利（限时）'],'未开始活动不开放入口');
 await evaluate("activityFixture.activities=[];activityFixture.rechargeEnabled=false;activityTest.vm.loadLotteryInfo();activityTest.refresh()");
 await waitFor("activityTest.vm.activeTab==='' && document.body.innerText.includes('暂无开放的福利活动')");
 assert.equal(await evaluate("document.querySelectorAll('.welfare-tabs [role=tab]').length"),0);
 assert.equal(await evaluate("document.querySelectorAll('.activity-card').length"),0);
 await layout(390,'page-no-open-activities');
 // 未加载成功不能误报“暂无开放活动”；手动重试恢复页签和 new。
 await evaluate('activityFixture.activities=window.openActivities;activityFixture.summaryError=503;activityFixture.listError=503;activityTest.refresh()');
 assert.ok(await evaluate("!!document.querySelector('.activity-load-error')"));
 assert.equal(await evaluate("document.body.innerText.includes('暂无开放的福利活动')"),false);
 await layout(320,'page-activities-error');
 await evaluate('activityFixture.summaryError=0;activityFixture.listError=0');await click('重试加载活动');
 await waitFor("document.querySelectorAll('.welfare-tabs [role=tab]').length===2 && !!document.querySelector('.welfare-new')");
 assert.equal(await evaluate('activityTest.vm.activeTab'),'guild_rally');
 await waitFor("!!document.querySelector('.guild-progress')");
 // 两段式集结：先付款一天、失败重试、等待读条、刷新恢复及自动补足。
 await evaluate(`window.beforeStaged=JSON.parse(JSON.stringify(activityFixture.activities));window.stagedTemplate={...JSON.parse(JSON.stringify(activityFixture.activities.find(a=>a.type==='guild_rally'))),id:81,title:'六十天集结测试',quota:{days:60,points:60,maxPerRole:1},guilds:[{accountId:11,nickname:'山间听雨',unionId:'9',unionName:'待更新妖盟',participants:0,allocationCount:0,canAllocate:false,canPrepare:true,requiresGuildSync:true,firstPoints:1}],rewardStates:[]};activityFixture.activities=[JSON.parse(JSON.stringify(stagedTemplate))];activityFixture.guildReady=false;activityFixture.allocationCompleted=false;activityTest.mode('guild_rally')`);
 await waitFor("document.body.innerText.includes('先分配 1 天，准备同步公会')");
 await click('先分配1天，准备同步公会');await click('确认分配');
 await waitFor("document.body.innerText.includes('第一步已完成')");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/81/allocate/prepare').length"),1);
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/81/allocate/complete').length"),0);
 await layout(390,'guild-prepared');await layout(320,'guild-prepared');
 await evaluate('activityFixture.startFailure=true');await click('启动角色并刷新公会');
 await waitFor("document.body.innerText.includes('角色授权已过期')");
 await evaluate('activityFixture.startFailure=false');await click('重新启动并继续同步');
 await waitFor("document.body.innerText.includes('等待角色上线并同步最新公会信息')");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/81/allocate/prepare').length"),1,'启动失败重试不再发起首日付款');
 await layout(390,'guild-syncing');
 await evaluate('activityFixture.guildReady=true');
 await waitFor("document.body.innerText.includes('配额已全部到账')");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/81/allocate/complete').length"),1);
 await layout(390,'guild-completed');
 // 未过期但公会不对时手动选择同步；离开再回到页面从接口恢复首日状态。
 await evaluate("const next=JSON.parse(JSON.stringify(stagedTemplate));next.id=82;next.guilds[0].canAllocate=true;next.guilds[0].requiresGuildSync=false;activityFixture.activities=[next];activityFixture.guildReady=false;activityFixture.allocationCompleted=false;activityTest.vm.load(true)");
 await waitFor("!!document.querySelector('.refresh-guild-choice input')");
 await evaluate("document.querySelector('.refresh-guild-choice input').click()");
 await click('先分配1天，准备同步公会');await click('确认分配');await waitFor("document.body.innerText.includes('第一步已完成')");
 await evaluate("activityTest.mode('admin')");await waitFor("!!document.querySelector('.activity-admin') || !!activityTest.vm.items");
 await evaluate("activityTest.mode('guild_rally')");await waitFor("document.body.innerText.includes('首日配额已到账')");
 await evaluate('activityFixture.completeFailure=true;activityFixture.guildReady=true');await click('已启动，刷新公会信息');
 await waitFor("document.body.innerText.includes('点数不足，首日进度保留')");
 await evaluate('activityFixture.completeFailure=false');await click('已启动，刷新公会信息');
 await waitFor("document.body.innerText.includes('配额已全部到账')");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/82/allocate/prepare').length"),1);
 // 运行中的角色重新启动后才能刷新快照；等待中离开页面不得继续自动扣余款。
 await evaluate("const nextRally=JSON.parse(JSON.stringify(stagedTemplate));nextRally.id=83;activityFixture.activities=[nextRally];activityFixture.guildReady=false;activityFixture.allocationCompleted=false;activityFixture.roleOnline=true;activityTest.vm.load(true)");
 await waitFor("document.body.innerText.includes('先分配 1 天，准备同步公会')");await click('先分配1天，准备同步公会');await click('确认分配');await waitFor("document.body.innerText.includes('第一步已完成')");
 const stopBefore = await evaluate("activityFixture.calls.filter(c=>c.url==='/api/game-accounts/11/stop').length");
 await click('启动角色并刷新公会');await waitFor("document.body.innerText.includes('等待角色上线并同步最新公会信息')");
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/game-accounts/11/stop').length"),stopBefore+1);
 await evaluate('activityFixture.holdSync=true');await waitFor('!!activityFixture.releaseSync');
 await evaluate("activityTest.mode('admin')");
 await evaluate('activityFixture.guildReady=true;activityFixture.releaseSync()');
 assert.equal(await evaluate("activityFixture.calls.filter(c=>c.url==='/api/activities/83/allocate/complete').length"),0);
 await evaluate("activityFixture.activities=window.beforeStaged;activityTest.mode('page')");
 await waitFor("!!document.querySelector('.guild-progress')");
 // 兼容请求未完成时退出，旧账号的响应不能重新点亮入口。
 await evaluate('activityFixture.holdNextList=true;window.delayedRefresh=activityTest.refresh();undefined');
 await waitFor('!!activityFixture.releaseList');
 await evaluate("localStorage.removeItem('token');localStorage.removeItem('user');window.dispatchEvent(new Event('logout'));activityFixture.releaseList();window.delayedRefresh");
 assert.equal(await evaluate("document.getElementById('notification').innerText"),'无待办');
 assert.equal(await evaluate("!!document.querySelector('.welfare-new')"),false);
 assert.equal(await evaluate("document.querySelectorAll('.welfare-tabs [role=tab]').length"),0);
 assert.deepEqual(exceptions,[]);console.log('PASS 活动真实浏览器：320/390/1280布局、公会分配、卡密/点数/时长领奖、签到重试幂等、目标角色必选、奖励历史、管理员创建双类型/三选一/锁定规则、待办摘要与活动new、签到仅进行中、到期删除及保留奖励、福利页完整布局、整月奖励日历/三类图标/无角色及全过期禁止签到/续期恢复、背景上传预览、未开放入口隐藏/单类型开放/停用切换/全部关闭空状态、旧摘要缺字段兼容/明确空数组/摘要失败回退/鉴权拒绝不回退/失败提示及重试/退出丢弃延迟响应');
}finally{
 if(socket?.readyState===WebSocket.OPEN){try{await command('Browser.close')}catch{}socket.close()}
 if(child&&child.exitCode===null){await Promise.race([new Promise(r=>child.once('exit',r)),sleep(3000)]);if(child.exitCode===null)child.kill()}
 for(const p of pending.values())clearTimeout(p.timeout);server.closeAllConnections();await new Promise(r=>server.close(r));
 const resolved=await realpath(profile);assert.equal(path.dirname(resolved).toLowerCase(),tempRoot.toLowerCase());assert.ok(path.basename(resolved).startsWith('activities-browser-'));await rm(resolved,{recursive:true,force:true,maxRetries:6,retryDelay:300});
}
