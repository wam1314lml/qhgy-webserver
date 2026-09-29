import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import vm from 'node:vm'
import { build } from 'esbuild'
const root=fileURLToPath(new URL('../',import.meta.url))
const bundle=await build({stdin:{contents:`export * from './src/pages/game-config/defaultConfig';export * from './src/pages/game-config/utils';export * from './src/pages/game-config/normalizeConfigSelects';export * from './src/pages/game-config/fmlRaceAcceptRules';`,resolveDir:root},bundle:true,write:false,platform:'node',format:'cjs'})
const mod={exports:{}};new Function('module','exports',bundle.outputFiles[0].text)(mod,mod.exports)
const code=readFileSync(new URL('../src/pages/GameConfigPage.vue',import.meta.url),'utf8').match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1]
const ast=ts.createSourceFile('config.ts',code,ts.ScriptTarget.Latest,true)
let fn;for(const statement of ast.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(declaration.name.text==='copyConfigToSelectedAccounts')fn='const '+declaration.getText(ast)
const compiled=ts.transpileModule(fn+';this.copy=copyConfigToSelectedAccounts',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
function fixture(){
 const saved=mod.exports.createDefaultGameConfig();saved.activity.flowerEmbroidery.enabled=true;saved.activity.flowerEmbroidery.refreshEnabled=true
 const puts=[],waits=[],messages=[];let token='test-owner'
 const ctx={...mod.exports,configCopyDisposed:false,accountId:{value:7},copyTargetAccountIds:{value:[7,8,8,9,999]},importAccountOptions:{value:[{value:8},{value:9}]},importConfigLoading:{value:false},importAccountListLoading:{value:false},copyConfigProgress:{value:''},importConfigModalVisible:{value:true},localStorage:{getItem:()=>token},message:{warning:v=>messages.push(v),error:v=>messages.push(v),success:v=>messages.push(v)},axios:{get:async()=>({status:200,data:{success:true,data:saved}}),put:async(url,body)=>{puts.push({url,body});return {data:{success:!url.includes('/9/')}}}},wait:async ms=>waits.push(ms)}
 vm.createContext(ctx);vm.runInContext(compiled,ctx);return {ctx,puts,waits,messages,saved,setOwner:value=>token=value}
}
{
 const h=fixture();await h.ctx.copy();assert.deepEqual(h.puts.map(p=>p.url),['/api/game-accounts/8/setting','/api/game-accounts/9/setting']);assert.equal(h.waits.reduce((a,b)=>a+b,0),11000);assert.deepEqual(Array.from(h.ctx.copyTargetAccountIds.value),[9]);assert.ok(h.ctx.copyConfigProgress.value.includes('成功 1 个，失败 1 个'));assert.equal(h.puts[0].body.activity.flowerEmbroidery.refreshEnabled,true);assert.notEqual(h.puts[0].body,h.puts[1].body)
}
{
 const h=fixture();h.ctx.axios.get=async()=>({status:200,data:{data:{}}});await h.ctx.copy();assert.equal(h.puts.length,0)
}
for(const boundary of ['owner','unmount','route']){
 const h=fixture();h.ctx.wait=async()=>{if(boundary==='owner')h.setOwner('new-owner');else if(boundary==='unmount')h.ctx.configCopyDisposed=true;else h.ctx.accountId.value=88};await h.ctx.copy();assert.equal(h.puts.length,1);assert.equal(h.ctx.importConfigLoading.value,false)
}
console.log('PASS 配置复制：保存源、去重/排除自己、失败保留、11秒节流、无效源及切号切页隔离')
