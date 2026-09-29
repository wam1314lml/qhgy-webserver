import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
const source = readFileSync(new URL('../src/pages/GameConfigPage.vue', import.meta.url), 'utf8')
const code = source.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1]
const ast = ts.createSourceFile('config.ts',code,ts.ScriptTarget.Latest,true)
const names=new Set(['DIAMOND_COST_WARNING','handleDiamondCostSwitchChange','applyDiamondCostSwitchValue'])
const selected=[]
for(const statement of ast.statements) if(ts.isVariableStatement(statement)) for(const item of statement.declarationList.declarations) if(names.has(item.name.text)) selected.push('const '+item.getText(ast))
const dialogs=[],config={value:{activity:{flowerEmbroidery:{refreshEnabled:false}}}}
const context={config,Modal:{confirm:options=>dialogs.push(options)}}
vm.createContext(context)
vm.runInContext(ts.transpileModule(selected.join(';')+';this.toggle=handleDiamondCostSwitchChange',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context)
context.toggle('activity.flowerEmbroidery.refreshEnabled',true)
assert.equal(config.value.activity.flowerEmbroidery.refreshEnabled,false)
assert.equal(dialogs[0].content,'开启此项会消耗勾玉，请谨慎开启，谢谢')
// 取消即不执行onOk；再次开启并确认才改变配置。
context.toggle('activity.flowerEmbroidery.refreshEnabled',true);dialogs[1].onOk()
assert.equal(config.value.activity.flowerEmbroidery.refreshEnabled,true)
context.toggle('activity.flowerEmbroidery.refreshEnabled',false)
assert.equal(config.value.activity.flowerEmbroidery.refreshEnabled,false);assert.equal(dialogs.length,2)
assert.ok(source.includes("handleDiamondCostSwitchChange('activity.flowerEmbroidery.refreshEnabled', checked === true)"))
console.log('PASS 实际开启确认处理器：取消/确认/直接关闭及模板绑定')
