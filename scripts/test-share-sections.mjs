import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../',import.meta.url))
const bundle=await build({stdin:{contents:" export * from './src/features/config-share/sectionSelection';",resolveDir:root},bundle:true,write:false,platform:'node',format:'esm'})
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const {sectionForPath,selectShareSections}=m
const {loadSharePageModel}=await import('./config-share-page-model.mjs')
const model=await loadSharePageModel(root),adapter=model.adapter,fresh=()=>JSON.parse(JSON.stringify(model.current))

const clone = value => JSON.parse(JSON.stringify(value))
const leaves = (value, prefix = '') => Object.entries(value).flatMap(([key,item]) => {
  const path = prefix ? prefix + '.' + key : key
  return item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length ? leaves(item,path) : [[path,item]]
})
const get = (obj,path) => path.split('.').reduce((v,k)=>v?.[k],obj)
const patch = (path,value) => path.split('.').reverse().reduce((v,k)=>({[k]:v}),value)
const raw = fresh()
const original = adapter.preview(raw,adapter.exportConfig(raw)).config, before = clone(original), full = adapter.exportConfig(original)
const keys = adapter.sections.map(s=>s.key)
assert.equal(new Set(keys).size, keys.length)
assert.deepEqual(adapter.exportConfig(original, keys), full)
assert.deepEqual(adapter.exportConfig(original, [...keys].reverse()), full)
assert.throws(()=>adapter.exportConfig(original, []),/至少选择/)
assert.throws(()=>adapter.exportConfig(original, ['unknown']),/页签无效/)
const merged = new Map(), variations = new Map()
for (const section of adapter.sections) {
  const partial = adapter.exportConfig(original, [section.key])
  assert.deepEqual({...partial,config:full.config}, full)
  for (const [path,value] of leaves(partial.config)) {
    assert.equal(sectionForPath(path,adapter.sections)?.key,section.key)
    assert.ok(!merged.has(path), 'duplicate '+path); merged.set(path,value)
    assert.deepEqual(value,get(full.config,path))
  }
  assert.deepEqual(adapter.preview(original,partial).config,original)
  // Construct a valid non-default value through the real import/normalizer, not raw fixture mutation.
  for(const [path,value] of leaves(partial.config).filter(([,v])=>typeof v==='boolean' || typeof v==='number' || Array.isArray(v))) {
    const alternative = typeof value === 'boolean' ? !value : typeof value === 'number' ? value+1 : value.length ? [] : [path.split('.').reduce((rule,k)=>rule?.properties?.[k], adapter.project.schema)?.item?.type === 'number' ? 1001 : '1001']
    try {
      const target = adapter.preview(original,{...full,config:patch(path,alternative)}).config
      if(JSON.stringify(get(adapter.exportConfig(target).config,path)) !== JSON.stringify(alternative)) continue
      variations.set(section.key,{target,path,value:alternative}); break
    } catch {}
  }
  assert.ok(variations.has(section.key),'need non-default fixture for '+section.label)
}
assert.deepEqual([...merged].sort(), leaves(full.config).sort())
let checks=5
for(const selected of adapter.sections) {
  const variant=variations.get(selected.key)
  const shared=adapter.exportConfig(variant.target,[selected.key])
  const imported=adapter.preview(original,shared).config
  assert.deepEqual(get(adapter.exportConfig(imported).config,variant.path),variant.value)
  const exportedImported=adapter.exportConfig(imported)
  for(const [path,value] of leaves(full.config)) if(sectionForPath(path,adapter.sections)?.key!==selected.key) assert.deepEqual(get(exportedImported.config,path),value)
  for(const omitted of adapter.sections.filter(s=>s.key!==selected.key)) {
    const other=variations.get(omitted.key), before=clone(other.target)
    const kept=adapter.preview(other.target,adapter.exportConfig(original,[selected.key])).config
    assert.deepEqual(kept,other.target, 'unselected '+omitted.label+' preserved importing '+selected.label)
    assert.deepEqual(other.target,before)
  }
  checks++
}
assert.equal(sectionForPath('basic.hasSeparation',adapter.sections)?.key, 'order')
assert.deepEqual(original,before)
// Leaf filtering preserves explicit false/0/empty arrays and keeps nested split roots disjoint.
const sections=[{key:'a',label:'A',paths:['root']},{key:'b',label:'B',paths:['root.child']}]
const sample={root:{a:false,n:0,list:[],child:{enabled:true}},}
assert.deepEqual(selectShareSections(sample,sections,['a']),{root:{a:false,n:0,list:[]}})
assert.deepEqual(selectShareSections(sample,sections,['b']),{root:{child:{enabled:true}}})
assert.deepEqual(sample,{root:{a:false,n:0,list:[],child:{enabled:true}}})
console.log(`PASS ${adapter.project.name}: ${checks} 页签分享专项，逐页互斥导出/旧码导入/未选非默认值保留`)
