// 双渠道目录与真实配置归一化/分享回归：仅本地静态文件，不连接账号或游戏。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/pages/game-config/channelCatalog';
  export * from './src/pages/game-config/accountPlatform';
  export * from './src/pages/game-config/elfPlantRules';
  export * from './src/pages/game-config/optionPickerUtils';
  export * from './src/pages/game-config/normalizeConfigSelects';
  export * from './src/pages/game-config/defaultConfig';
  export * from './src/pages/game-config/utils';
`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'cjs' })
const module = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
const m = module.exports
const clone = value => JSON.parse(JSON.stringify(value))
let checks = 0
async function test(name, fn) { await fn(); checks++; console.log(`PASS ${name}`) }

await test('只有数字1和字符串1使用支付宝，其他渠道默认微信且交替读取不会串库', () => {
  for (const platform of [1, '1', 3, '3', 0, '0', 2, null, undefined, false, true, '', '01', 'zfb', 1]) {
    const zfb = platform === 1 || platform === '1'
    assert.equal(m.getGameCatalog(platform).flowerOptions.find(row => row.value === '52046').label, zfb ? '蛋白石莓' : '柔粉紫荆花')
    assert.equal(m.getFlowerPickerOptions([], platform).find(row => row.value === '52046').label, zfb ? '蛋白石莓' : '柔粉紫荆花')
    assert.equal(m.getGameCatalog(platform).elfPlantOptions.find(row => row.bookId === 200304).secondaryFruitId, zfb ? 51017 : 51039)
  }
})

for (const platform of [3, 1]) {
  const source = path.resolve(root, '../../qhgy-assistant-master/export', platform === 1 ? 'qhgy-database-zfb' : 'qhgy-database')
  const read = name => JSON.parse(fs.readFileSync(path.join(source, name + '.json'), 'utf8'))
  const catalog = m.getGameCatalog(platform)
  await test(`${platform === 1 ? '支付宝' : '微信'}全部水果/花瓶/配方/果灵/兑换/竞赛逐项对齐同源导出`, () => {
    for (const [name, key] of [['fruits','flowerOptions'], ['vases','flowerArtOptions']]) {
      assert.deepEqual(catalog[key], read(name).map(row => ({value:String(row.id),label:row.name})))
    }
    assert.deepEqual(catalog.specifiedArtsFullOptions, read('flower-arts').map(row => {
      const baseName = !row.name || /^item_/i.test(row.name) ? `${row.vaseName || `果艺${row.vaseId}`}果艺品` : row.name
      const materials = (row.flowerNames ?? []).filter(Boolean).join(',')
      return { value: String(row.id), label: materials ? `${baseName}(${materials})` : baseName }
    }))
    assert.deepEqual(catalog.elfOptions, read('fruit-elves').map(row => ({value:String(row.id),label:row.displayName,title:row.displayName})))
    for (const row of read('fruit-elves')) for (const book of row.bookEntries) {
      if (Number(book.hidden) === 1 || !book.mainFruitId || !book.secondaryFruitId) continue
      const actual = catalog.elfPlantOptions.find(item => item.bookId === book.bookId)
      assert.equal(actual.mainFruitId, book.mainFruitId)
      assert.equal(actual.secondaryFruitId, book.secondaryFruitId)
      for (const label of [row.name, String(row.id), book.title, book.secondaryFruitName]) assert.ok(actual.label.includes(label))
    }
    assert.deepEqual(catalog.floralShopAllOptions.flatMap(group => group.options).sort((a,b)=>a.value-b.value),
      read('orchard-exchange-items').map(row => ({value:row.id,label:row.displayName})).sort((a,b)=>a.value-b.value))
    assert.deepEqual(catalog.fmlRaceTaskTypes, read('guild-race-task-types').map(row => ({key:String(row.type),label:row.name})))
  })
  await test(`${platform}渠道加载保存保留原始ID/64地和旧无效果灵，不按名称迁移`, () => {
    const config = m.createDefaultGameConfig()
    config.plant.flower.specificFlowerIds = ['52046']
    config.plant.flower.freeStyleList[0].lands = {'1001':52046}
    config.plant.elves.selectedElvesIds = ['210111', '200304', '999999', '210304']
    for (let i=0;i<3;i++) m.normalizeGameConfigSelects(config, platform)
    assert.deepEqual(config.plant.flower.specificFlowerIds, ['52046'])
    assert.deepEqual(config.plant.flower.freeStyleList[0].lands, {'1001':52046})
    assert.deepEqual(config.plant.elves.selectedElvesIds, ['210111', '200304', '999999', '210304'])
    const options = m.getElfPlantOptions(config.plant.elves.selectedElvesIds, platform)
    assert.equal(options.find(row=>row.value==='210111').disabled,true)
    assert.equal(options.find(row=>row.value==='999999').disabled,true)
    assert.ok(options.find(row=>row.value==='200304').title.includes(platform===1?'暖橙小菊':'绿叶奎尔特夫人'))
    assert.ok(m.getElfPlantSelectionNotice(['210304'], platform).text.includes(platform===1?'暖橙小菊':'绿叶奎尔特夫人'))
  })
  await test(`${platform}渠道真实页面分享适配器按接收方渠道保留ID，分享内容不包含渠道`, async () => {
    const page = await loadSharePageModel(root, {platform})
    const config = clone(page.current)
    config.plant.flower.specificFlowerIds=['52046']
    config.plant.elves.selectedElvesIds=['210111','210304']
    const exported = page.adapter.exportConfig(config)
    assert.equal(Object.hasOwn(exported.config,'platform'),false)
    const result = page.adapter.preview(config, exported)
    assert.deepEqual(result.config.plant.flower.specificFlowerIds,['52046'])
    assert.deepEqual(result.config.plant.elves.selectedElvesIds,['210111','210304'])
  })
}

await test('账号权威渠道优先，旧接口按id查询，缺账号拒绝而非复用上一账号', async () => {
  let calls=0
  const list=async()=>{calls++;return [{id:2,platform:'1'}, {id:3,platform:3}, {id:4}]}
  assert.equal(await m.resolveAccountPlatform(2,{platform:3},list),3)
  assert.equal(calls,0)
  assert.equal(await m.resolveAccountPlatform(2,{},list),'1')
  assert.equal(await m.resolveAccountPlatform(4,{},list),undefined)
  await assert.rejects(m.resolveAccountPlatform(99,{},list),/未找到账号渠道/)
  await assert.rejects(m.resolveAccountPlatform(2,{},async()=>{throw Error('offline')}),/offline/)
})

await test('切账号及离开页面后过期异步响应失效，包括A→B→A', () => {
  const guard = m.createAccountLoadGuard()
  const first = guard.begin(), second = guard.begin(), third = guard.begin()
  assert.equal(guard.isCurrent(first),false)
  assert.equal(guard.isCurrent(second),false)
  assert.equal(guard.isCurrent(third),true)
  guard.invalidate()
  assert.equal(guard.isCurrent(third),false)
})

for (const pageName of ['GameConfigPage', 'FreeStylePlantingPage']) {
  const source = fs.readFileSync(path.join(root, 'src/pages', pageName + '.vue'), 'utf8')
  const start = source.indexOf(pageName === 'GameConfigPage' ? 'const fetchConfig = async' : 'async function fetchConfig()')
  const end = source.indexOf(pageName === 'GameConfigPage' ? '// 配置提示弹窗' : 'async function saveConfig()', start)
  const actualFetch = source.slice(start, end)
  const fixture = () => {
    const context = {
      ...m, accountId:{value:101}, accountPlatform:{value:undefined}, configLoaded:{value:false},
      config:{value:m.createDefaultGameConfig()}, loading:{value:false}, configShareVisible:{value:true},
      importConfigModalVisible:{value:true}, savedSnapshot:{value:''}, selectedFlowerId:{value:''},
      loadGuard:m.createAccountLoadGuard(), console:{log(){},error(){}},
      Modal:{error(){throw Error('unexpected modal')}}, message:{error(){throw Error('unexpected toast')}},
      router:{push(){throw Error('unexpected navigation')}},
    }
    context.currentSnapshot = {get value(){return JSON.stringify(context.config.value.plant.flower)}}
    const pending=[]
    context.axios={get(url){return new Promise(resolve=>pending.push({url,resolve}))}}
    context.loadAccounts=async()=>{
      const response=await context.axios.get('/api/game-accounts/list')
      return response.data.data
    }
    const fetch=new Function(...Object.keys(context),actualFetch+'\nreturn fetchConfig')(...Object.values(context))
    return {context,pending,fetch}
  }
  const response=(platform,id='50006')=>({status:200,data:{success:true,platform,data:{plant:{flower:{specificFlowerIds:[id]}}}}})
  await test(`${pageName}实际fetchConfig忽略A→B→A晚到setting及离开页响应`, async()=>{
    const {context,pending,fetch}=fixture()
    const oldA=fetch()
    context.accountId.value=102
    const oldB=fetch()
    context.accountId.value=101
    const latestA=fetch()
    pending[2].resolve(response('1','52046'));await latestA
    assert.equal(context.accountPlatform.value,'1')
    assert.deepEqual(context.config.value.plant.flower.specificFlowerIds,['52046'])
    pending[1].resolve(response(3));await oldB
    pending[0].resolve(response(3));await oldA
    assert.equal(context.accountPlatform.value,'1')
    assert.deepEqual(context.config.value.plant.flower.specificFlowerIds,['52046'])
    context.accountId.value=103
    const leaving=fetch()
    context.loadGuard.invalidate()
    pending[3].resolve(response(3));await leaving
    assert.equal(context.configLoaded.value,false)
  })
  await test(`${pageName}实际fetchConfig忽略旧API渠道列表晚到结果`, async()=>{
    const {context,pending,fetch}=fixture()
    const oldA=fetch()
    const legacy=response(undefined);delete legacy.data.platform
    pending[0].resolve(legacy)
    await new Promise(resolve=>setImmediate(resolve))
    assert.equal(pending[1].url,'/api/game-accounts/list')
    assert.equal(context.configLoaded.value,false)
    context.accountId.value=102
    const newB=fetch()
    pending[2].resolve(response(3,'52046'));await newB
    pending[1].resolve({data:{data:[{id:101,platform:1}]}});await oldA
    assert.equal(context.accountPlatform.value,3)
    assert.equal(context.configLoaded.value,true)
    assert.equal(context.loading.value,false)
    assert.deepEqual(context.config.value.plant.flower.specificFlowerIds,['52046'])
  })
}
console.log(`双渠道数据库 ${checks} 组通过`)
