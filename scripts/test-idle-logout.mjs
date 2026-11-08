import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src=fs.existsSync(new URL('../src/utils/idleLogout.ts',import.meta.url))?'../src':'../src/reference';
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(src+'/utils/idleLogout.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,module:mod,Date,encodeURIComponent});
const {createIdleLogout,IDLE_TIMEOUT_MS:T}=mod.exports;
assert.equal(T,1800000);
class Target {
 listeners=new Map(); visibilityState='visible';
 addEventListener(name,cb){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(cb)}
 removeEventListener(name,cb){this.listeners.get(name)?.delete(cb)}
 emit(name,props={}){for(const cb of [...(this.listeners.get(name)||[])])cb({type:name,isTrusted:true,...props})}
 count(){return [...this.listeners.values()].reduce((n,v)=>n+v.size,0)}
}
function setup(shared=new Map(),project='test'){
 let time=100000000,seq=0,out=0;const timers=new Map(); const win=new Target(),doc=new Target();
 const storage={getItem:k=>shared.get(k)??null,setItem:(k,v)=>shared.set(k,v),removeItem:k=>shared.delete(k)};
 win.setTimeout=(fn,delay)=>{const id=++seq;timers.set(id,{fn,due:time+delay});return id};win.clearTimeout=id=>timers.delete(id);
 const idle=createIdleLogout({project,onTimeout:()=>{out++},window:win,document:doc,storage,now:()=>time});
 function tick(delta,run=true){time+=delta;if(run){let count=0;for(;;){const t=[...timers].find(([,v])=>v.due<=time);if(!t)break;timers.delete(t[0]);t[1].fn();assert.ok(++count<30)}}}
 const login=(id=1)=>{storage.setItem('token','synthetic');storage.setItem('user',JSON.stringify({id}));idle.start(true)};
 return {idle,win,doc,storage,shared,login,tick,get out(){return out},get time(){return time},get timers(){return timers.size}};
}
let checks=0;function test(label,fn){fn();checks++;console.log('PASS',label)}
test('anonymous does not start',()=>{const f=setup();f.idle.start();f.tick(T);assert.equal(f.out,0);assert.equal(f.timers,0)});
test('exact 30 minute boundary',()=>{const f=setup();f.login();f.tick(T-1);assert.equal(f.out,0);f.tick(1);assert.equal(f.out,1);f.tick(T);assert.equal(f.out,1);assert.equal(f.doc.count(),0)});
for(const name of ['pointerdown','pointermove','mousedown','mousemove','touchstart','touchmove','keydown','input','change','wheel'])test(name+' renews continuously past login age',()=>{const f=setup();f.login();for(let i=0;i<5;i++){f.tick(T-1);f.doc.emit(name);assert.equal(f.out,0)}f.tick(T-1);assert.equal(f.out,0);f.tick(1);assert.equal(f.out,1)});
test('scripted events never extend',()=>{const f=setup();f.login();f.tick(T-1);f.doc.emit('input',{isTrusted:false});f.tick(1);assert.equal(f.out,1)});
test('polling and programmatic scrolling never extend',()=>{const f=setup();f.login();f.tick(T-1);f.doc.emit('scroll');f.win.emit('apiResponse');f.tick(1);assert.equal(f.out,1)});
test('focus/visibility do not reset clock',()=>{const f=setup();f.login();f.tick(T-1);f.win.emit('focus');f.doc.emit('visibilitychange');f.tick(1);assert.equal(f.out,1)});
test('return from sleep expires before input',()=>{const f=setup();f.login();f.tick(T+1000,false);f.doc.emit('pointerdown');assert.equal(f.out,1)});
test('hidden-page events do not extend',()=>{const f=setup();f.login();f.doc.visibilityState='hidden';f.tick(T-1);f.doc.emit('input');f.tick(1);assert.equal(f.out,1)});
test('expired page resumes from bfcache',()=>{const f=setup();f.login();f.tick(T+1,false);f.win.emit('pageshow');assert.equal(f.out,1)});
test('normal reinitialization is idempotent',()=>{const f=setup();f.login();const count=f.doc.count();f.tick(T-1);f.idle.start();assert.equal(f.doc.count(),count);assert.equal(f.timers,1);f.tick(1);assert.equal(f.out,1)});
test('reload preserves remaining deadline',()=>{const f=setup();f.login();f.tick(T-100);f.idle.stop();f.idle.start();f.tick(100);assert.equal(f.out,1)});
test('new login has fresh window',()=>{const f=setup();f.login();f.tick(T-1);f.idle.start(true);f.tick(T-1);assert.equal(f.out,0);f.tick(1);assert.equal(f.out,1)});
test('manual logout cleanup preserves announcement preference',()=>{const f=setup();f.login();f.storage.setItem('announcement-snooze:v1:test:id%3A1','20000');f.idle.stop(true);f.tick(T);assert.equal(f.out,0);assert.equal(f.doc.count(),0);assert.equal(f.win.count(),0);assert.equal(f.storage.getItem('announcement-snooze:v1:test:id%3A1'),'20000')});
test('external logout cancels timer',()=>{const f=setup();f.login();f.storage.removeItem('token');f.win.emit('storage',{key:'token'});f.tick(T);assert.equal(f.out,0);assert.equal(f.timers,0)});
test('another tab activity extends shared user',()=>{const map=new Map(),a=setup(map),b=setup(map);a.login();b.idle.start();a.tick(T-1000);b.tick(T-1000);b.doc.emit('input');a.win.emit('storage',{key:'user-idle:v1:test:id%3A1'});a.tick(1000);assert.equal(a.out,0);a.tick(T-1000);assert.equal(a.out,1)});
test('projects isolated',()=>{const map=new Map(),a=setup(map,'a'),b=setup(map,'b');a.login();b.idle.start();a.tick(T-1000);b.tick(T-1000);b.doc.emit('input');a.tick(1000);assert.equal(a.out,1);assert.equal(b.out,0)});
test('users isolated',()=>{const f=setup();f.login();f.tick(T-1);f.storage.setItem('user',JSON.stringify({id:2}));f.win.emit('storage',{key:'user'});f.tick(1);assert.equal(f.out,0);f.tick(T-1);assert.equal(f.out,1)});
test('token rotation is not activity',()=>{const f=setup();f.login();f.tick(T-1);f.storage.setItem('token','synthetic-renewed');f.win.emit('storage',{key:'token'});f.tick(1);assert.equal(f.out,1)});
test('future/malformed timestamp does not disable deadline',()=>{for(const value of ['broken','Infinity','1000000000000000','-1']){const f=setup();f.storage.setItem('token','synthetic');f.storage.setItem('user','{"id":1}');f.storage.setItem('user-idle:v1:test:id%3A1',value);f.idle.start();f.tick(T);assert.equal(f.out,1)}});
test('write-denied storage retains in-memory deadline',()=>{const f=setup();f.storage.setItem('token','synthetic');f.storage.setItem('user','{"id":1}');f.storage.setItem=()=>{throw Error('denied')};f.idle.start();f.tick(T-1);f.doc.emit('input');f.tick(T);assert.equal(f.out,1)});
test('clock rollback has finite deadline',()=>{const f=setup();f.login();f.tick(-50000);f.win.emit('focus');f.tick(T);assert.equal(f.out,1)});
test('pagehide flushes latest activity',()=>{const f=setup();f.login();f.tick(100);f.doc.emit('input');f.win.emit('pagehide');assert.equal(Number(f.storage.getItem('user-idle:v1:test:id%3A1')),f.time)});
const entry=fs.readFileSync(new URL(src+'/main.ts',import.meta.url),'utf8');assert.ok(entry.includes('onTimeout: performLogout'));assert.ok(entry.includes('detail?.fresh === true'));
const login=fs.readFileSync(new URL(src+'/components/LoginForm.vue',import.meta.url),'utf8');assert.equal((login.match(/detail: \{ fresh: true \}/g)||[]).length,1);assert.ok(!entry.includes('AUTO_LOGOUT_DURATION'));assert.ok(entry.includes("window.addEventListener('logout'"));
console.log(checks,'idle behavior checks and entry wiring passed');
