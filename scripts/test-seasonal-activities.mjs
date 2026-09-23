import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { loadSharePageModel } from './config-share-page-model.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({ stdin: { contents: `
  export * from './src/pages/game-config/defaultConfig';
  export * from './src/pages/game-config/normalizeConfigSelects';
  export * from './src/pages/game-config/utils';
  export * from './src/pages/game-config/activityShop';
`, resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node' })
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const load = value => { value = structuredClone(value); m.migrateLegacyFlowerCompeteSelection(value); const config = m.deepMerge(m.createDefaultGameConfig(), value); m.normalizeGameConfigSelects(config); return config }
const defaults = load({})
assert.deepEqual(defaults.activity.flowerCompete, { autoSelect: false, selectIndex: 0, autoLike: false, autoClaimRewards: false })
assert.deepEqual(defaults.activity.silkEmbroidery, { enabled: false, shop: { enabled: false, beforeEndMinutes: 5, shopItemId: 2 } })
for (const autoLike of [false, true]) for (const autoClaimRewards of [false, true]) {
  for (const autoSelect of [false, true]) for (const selectIndex of [0, 1]) {
  for (const enabled of [false, true]) for (const shopEnabled of [false, true]) {
    for (const shopItemId of [1, 2, 3, 4]) {
      const activity = { flowerCompete: { autoSelect, selectIndex, autoLike, autoClaimRewards }, silkEmbroidery: {
        enabled, shop: { enabled: shopEnabled, beforeEndMinutes: 1, shopItemId },
      } }
      const config = load({ activity })
      const reloaded = load(JSON.parse(JSON.stringify(config)))
      assert.deepEqual(reloaded.activity.flowerCompete, activity.flowerCompete)
      assert.deepEqual(reloaded.activity.silkEmbroidery, activity.silkEmbroidery)
    }
  }
  }
}
for (const selectIndex of [false, '', 'invalid', -1, 2, 0.5, 5301, [0], {}, null]) {
  const config = load({ activity: { flowerCompete: { autoSelect: true, selectIndex } } })
  assert.equal(config.activity.flowerCompete.autoSelect, false)
  assert.equal(config.activity.flowerCompete.selectIndex, 0)
}
assert.equal(load({ activity: { flowerCompete: { autoSelect: 'true' } } }).activity.flowerCompete.autoSelect, false)
assert.equal(load({ activity: { flowerCompete: { autoSelect: true, selectIndex: '1' } } }).activity.flowerCompete.selectIndex, 1)
for (const [selectFlowerId, selectIndex] of [[5301, 0], ['5302', 1]]) {
  const legacy = load({ activity: { flowerCompete: { autoSelect: true, selectFlowerId } } }).activity.flowerCompete
  assert.equal(legacy.selectIndex, selectIndex)
  assert.equal(legacy.autoSelect, true)
  assert.equal(Object.hasOwn(legacy, 'selectFlowerId'), false)
}
for (const selectFlowerId of [false, '', 'invalid', 0, 5303, 5301.5, [5301], {}, null]) {
  assert.equal(load({ activity: { flowerCompete: { autoSelect: true, selectFlowerId } } }).activity.flowerCompete.autoSelect, false)
}
assert.equal(load({ activity: { flowerCompete: { autoSelect: true, selectIndex: 0, selectFlowerId: 5302 } } }).activity.flowerCompete.selectIndex, 0)
for (const [input, expected] of [[undefined, 5], [null, 5], ['', 5], ['12', 12], [0, 1], [-10, 1], [2000, 1440], [2.8, 2]]) {
  const config = load({ activity: { silkEmbroidery: { shop: { beforeEndMinutes: input } } } })
  assert.equal(config.activity.silkEmbroidery.shop.beforeEndMinutes, expected)
}
for (const shopItemId of [false, 'bogus', 99, 2.5]) {
  const config = load({ activity: { silkEmbroidery: { enabled: 'false', shop: { enabled: true, shopItemId } } } })
  assert.equal(config.activity.silkEmbroidery.enabled, false)
  assert.equal(config.activity.silkEmbroidery.shop.enabled, false)
}
assert.deepEqual(m.getActivityShopOptions(m.activityShopCatalogs.silkEmbroidery).map(row => row.label),
  ['加速卡×4（50金丝绣线）', '水滴×4（50金丝绣线）', '百果券×4（50金丝绣线）', '金币×1000（25金丝绣线）'])

const page = await loadSharePageModel(root)
const current = load({ activity: { flowerCompete: { autoSelect: true, selectIndex: 1, autoLike: true, autoClaimRewards: true },
  silkEmbroidery: { enabled: true, shop: { enabled: true, beforeEndMinutes: 7, shopItemId: 3 } } } })
const payload = page.adapter.exportConfig(current)
const applied = page.adapter.preview(defaults, payload).config
assert.deepEqual(applied.activity.flowerCompete, current.activity.flowerCompete)
assert.deepEqual(applied.activity.silkEmbroidery, current.activity.silkEmbroidery)
const old = page.adapter.preview(current, { format: 1, project: 'qhgy', schemaVersion: 1, config: {
  activity: { hdReward: { enabled: false } },
} }).config
assert.deepEqual(old.activity.flowerCompete, current.activity.flowerCompete)
assert.deepEqual(old.activity.silkEmbroidery, current.activity.silkEmbroidery)
const oldFlower = page.adapter.preview(current, { format: 1, project: 'qhgy', schemaVersion: 1, config: {
  activity: { flowerCompete: { autoLike: false, autoClaimRewards: false } },
} }).config
assert.deepEqual(oldFlower.activity.flowerCompete, { autoSelect: true, selectIndex: 1, autoLike: false, autoClaimRewards: false })
for (const [selectFlowerId, selectIndex] of [[5301, 0], [5302, 1]]) {
  const legacyCode = { format: 1, project: 'qhgy', schemaVersion: 1, config: {
    activity: { flowerCompete: { autoSelect: true, selectFlowerId } },
  } }
  const before = structuredClone(legacyCode)
  const migrated = page.adapter.preview(current, legacyCode).config.activity.flowerCompete
  assert.deepEqual(migrated, { autoSelect: true, selectIndex, autoLike: true, autoClaimRewards: true })
  assert.deepEqual(legacyCode, before, '分享预览不修改原码')
}
const invalidLegacyCode = page.adapter.preview(current, { format: 1, project: 'qhgy', schemaVersion: 1, config: {
  activity: { flowerCompete: { autoSelect: true, selectFlowerId: 9999 } },
} }).config.activity.flowerCompete
assert.equal(invalidLegacyCode.autoSelect, false)
assert.equal(invalidLegacyCode.selectIndex, 0)
assert.equal(Object.hasOwn(payload.config.activity.flowerCompete, 'selectFlowerId'), false)
for (const relative of ['src/pages/GameConfigPage.vue', 'src/pages/game-config/ActivityShopSettings.vue']) {
  const source = await readFile(new URL(`../${relative}`, import.meta.url), 'utf8')
  const { descriptor, errors } = parse(source, { filename: relative }); assert.deepEqual(errors, [])
  const script = compileScript(descriptor, { id: 'seasonal-test' })
  const template = compileTemplate({ source: descriptor.template.content, filename: relative, id: 'seasonal-test',
    compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(template.errors, [])
  if (relative.endsWith('GameConfigPage.vue')) {
    for (const field of ['flowerCompete.autoSelect', 'flowerCompete.autoLike', 'flowerCompete.autoClaimRewards', 'silkEmbroidery.enabled']) {
      assert.ok(source.includes(`v-model:checked="config.activity.${field}"`))
    }
    assert.ok(source.includes('v-model="config.activity.silkEmbroidery.shop"'))
    assert.ok(source.includes('配合花艺上架功能就可快速完成任务'))
    assert.ok(source.includes('v-model:value="config.activity.flowerCompete.selectIndex"'))
    assert.ok(source.includes('<Select.Option :value="0">左侧（第一个）</Select.Option>'))
    assert.ok(source.includes('<Select.Option :value="1">右侧（第二个）</Select.Option>'))
    assert.ok(source.includes('migrateLegacyFlowerCompeteSelection(response.data.data)'))
    assert.ok(source.includes('migrateLegacyFlowerCompeteSelection(sourceResponse.data.data)'))
    assert.ok(source.includes('领取免费、任务及累计点赞奖励'))
  }
}
console.log('PASS 新活动配置：256种开关/对象/商品保存重载、非法对象关闭、分钟边界、实际分享适配器新旧码及Vue组件编译')
