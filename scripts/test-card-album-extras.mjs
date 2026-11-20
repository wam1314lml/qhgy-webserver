import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { loadSharePageModel } from './config-share-page-model.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
export { normalizeGameConfigSelects } from './src/pages/game-config/normalizeConfigSelects';
export { shareProject } from './src/features/config-share/project';`, resolveDir: root },
bundle: true, write: false, platform: 'node', format: 'esm' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const page = await loadSharePageModel(root), adapter = page.adapter
const fresh = () => structuredClone(page.current)
const fields = ['enabledJadeGift', 'enabledCuttingFruit']
for (const field of fields) {
  assert.equal(fresh().activity.actCardCollect[field], false)
  for (const value of [undefined, null, false, 1, 'true', 'false']) {
    const config = fresh(); config.activity.actCardCollect[field] = value
    m.normalizeGameConfigSelects(config)
    assert.equal(config.activity.actCardCollect[field], false)
  }
}
let combinations = 0
for (const enabledJadeGift of [false, true]) for (const enabledCuttingFruit of [false, true]) {
  for (const enabledCardCollect of [false, true]) for (const enabledOpenCardPack of [false, true]) {
    const values = { enabledJadeGift, enabledCuttingFruit, enabledCardCollect, enabledOpenCardPack }
    const config = fresh(); Object.assign(config.activity.actCardCollect, values)
    const saved = JSON.parse(JSON.stringify(config)); m.normalizeGameConfigSelects(saved)
    const imported = adapter.preview(fresh(), adapter.exportConfig(saved)).config
    for (const [field, expected] of Object.entries(values)) assert.equal(imported.activity.actCardCollect[field], expected)
    const old = adapter.preview(imported, { format: 1, project: m.shareProject.id, schemaVersion: 1,
      config: { activity: { actCardCollect: { enabledCardCollect: !enabledCardCollect } } } }).config
    for (const field of fields) assert.equal(old.activity.actCardCollect[field], values[field])
    combinations++
  }
}
console.log(`PASS 卡册礼包/扦插默认关闭、严格布尔、${combinations}种独立组合保存/分享及旧码保值`)
