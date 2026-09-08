import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/pages/game-config/fmlRaceAcceptRules.ts';
      export * from './src/pages/game-config/defaultConfig.ts';
      export * from './src/pages/game-config/normalizeConfigSelects.ts';
      export { deepMerge } from './src/pages/game-config/utils.ts';
    `,
    resolveDir: projectRoot,
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
})
const {
  createDefaultFmlRaceAcceptRules,
  normalizeFmlRaceAcceptRules,
  getFmlRaceSelfUpgradeMinScoreLimit,
  clampFmlRaceSelfUpgradeMinScore,
  getFmlRaceScoreRangeError,
  validateFmlRaceScoreRanges,
  createDefaultGameConfig,
  normalizeGameConfigSelects,
  deepMerge,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

const defaults = createDefaultFmlRaceAcceptRules()
assert.deepEqual(defaults, {
  normal: { enabled: false, minScore: 23, maxScore: 99 },
  systemUpgrade: { enabled: false, minScore: 46, maxScore: 99 },
  selfUpgrade: { enabled: false, minScore: 46, maxScore: 99 },
  otherUpgrade: { enabled: false, minScore: 46, maxScore: 99, memberMode: 'all' },
})
defaults.normal.enabled = true
assert.equal(createDefaultFmlRaceAcceptRules().normal.enabled, false)

for (const source of [undefined, null, false, [], 'legacy']) {
  assert.deepEqual(normalizeFmlRaceAcceptRules(source), createDefaultFmlRaceAcceptRules())
}
const normalized = normalizeFmlRaceAcceptRules({
  normal: { enabled: true, minScore: 0 },
  systemUpgrade: { enabled: true, minScore: 101 },
  selfUpgrade: { enabled: 'true', minScore: '47.9' },
  otherUpgrade: { enabled: true, minScore: null, memberMode: 'specified' },
})
assert.deepEqual(normalized, {
  normal: { enabled: true, minScore: 1, maxScore: 99 },
  systemUpgrade: { enabled: true, minScore: 99, maxScore: 99 },
  selfUpgrade: { enabled: false, minScore: 2, maxScore: 99 },
  otherUpgrade: { enabled: true, minScore: 46, maxScore: 99, memberMode: 'specified' },
})
assert.equal(normalizeFmlRaceAcceptRules({ normal: { minScore: Infinity } }).normal.minScore, 23)
assert.equal(normalizeFmlRaceAcceptRules({ normal: { minScore: 25 } }).normal.maxScore, 99)
assert.equal(normalizeFmlRaceAcceptRules({ normal: { maxScore: 100 } }).normal.maxScore, 99)
assert.equal(normalizeFmlRaceAcceptRules({ normal: { maxScore: 0 } }).normal.maxScore, 1)
assert.equal(normalizeFmlRaceAcceptRules({ normal: { maxScore: '49' } }).normal.maxScore, 49)

// 自己升级最低分只设上限，不随普通任务最低分调高而自动抬高。
for (const [normalMinimum, selfMinimum, expected] of [
  [23, 47, 46], [23, 46, 46], [23, 45, 45], [23, 1, 1],
  [20, 46, 40], [30, 46, 46], [1, 3, 2], [50, 99, 99],
  ['23', '47', 46],
]) {
  const rules = createDefaultFmlRaceAcceptRules()
  rules.normal.minScore = normalMinimum
  rules.selfUpgrade.minScore = selfMinimum
  rules.selfUpgrade.maxScore = 80
  rules.otherUpgrade.memberMode = 'specified'
  const unchanged = structuredClone(rules)
  clampFmlRaceSelfUpgradeMinScore(rules)
  assert.deepEqual(rules, {
    ...unchanged,
    selfUpgrade: { ...unchanged.selfUpgrade, minScore: expected },
  }, `普通最低分 ${normalMinimum} / 自己最低分 ${selfMinimum}`)
}
const editedRules = createDefaultFmlRaceAcceptRules()
editedRules.normal.minScore = 20
clampFmlRaceSelfUpgradeMinScore(editedRules)
assert.equal(editedRules.selfUpgrade.minScore, 40)
editedRules.normal.minScore = 30
clampFmlRaceSelfUpgradeMinScore(editedRules)
assert.equal(editedRules.selfUpgrade.minScore, 40, '提高上限时不能抬高已有最低分')
for (const value of [null, undefined, '', 0, -1, Infinity, 'invalid']) {
  const rules = createDefaultFmlRaceAcceptRules()
  rules.normal.minScore = value
  clampFmlRaceSelfUpgradeMinScore(rules)
  assert.equal(rules.selfUpgrade.minScore, 46, '编辑中无效的普通最低分不能误改自己最低分')
}
assert.equal(getFmlRaceSelfUpgradeMinScoreLimit(23), 46)
assert.equal(getFmlRaceSelfUpgradeMinScoreLimit(50), 99)
assert.equal(getFmlRaceSelfUpgradeMinScoreLimit(null), 99)
for (const minimum of [45, 46, 47]) {
  const loaded = deepMerge(createDefaultGameConfig(), {
    union: { fmlRace: { acceptRules: {
      normal: { enabled: true, minScore: 23, maxScore: 99 },
      selfUpgrade: { enabled: true, minScore: minimum, maxScore: 99 },
    } } },
  })
  normalizeGameConfigSelects(loaded)
  const saved = JSON.parse(JSON.stringify(loaded))
  normalizeGameConfigSelects(saved)
  assert.equal(saved.union.fmlRace.acceptRules.selfUpgrade.minScore, Math.min(minimum, 46))
  assert.equal(saved.union.fmlRace.acceptRules.selfUpgrade.maxScore, 99)
}
const reversed = normalizeFmlRaceAcceptRules({ normal: { enabled: true, minScore: 46, maxScore: 23 } })
assert.equal(reversed.normal.maxScore, 23, '错误区间不得自动扩大')
assert.match(validateFmlRaceScoreRanges(reversed), /普通任务未升级：最低分不能大于最高分/)
assert.equal(getFmlRaceScoreRangeError({ enabled: true, minScore: 46, maxScore: 46 }), '')
assert.equal(getFmlRaceScoreRangeError({ enabled: false, minScore: 46, maxScore: 23 }), '')
for (const maximum of [null, '', undefined, 100, -1, 1.5]) {
  assert.match(getFmlRaceScoreRangeError({ enabled: true, minScore: 1, maxScore: maximum }), /1–99/)
}

const oldKeys = [
  'minTaskScore', 'minUpgradeTaskScore', 'onlyUpgradeTask', 'othersUpgradeTaskMode',
  'excludeOthersUpgradeTask', 'onlySpecifiedUpgradeTask', 'acceptQualifiedNormalTask',
]
const legacy = deepMerge(createDefaultGameConfig(), {
  union: { fmlRace: {
    minTaskScore: 25, minUpgradeTaskScore: 50, othersUpgradeTaskMode: true,
    onlyUpgradeTask: true, excludeOthersUpgradeTask: false, onlySpecifiedUpgradeTask: true,
    acceptQualifiedNormalTask: true, specifiedUpgradePlayers: [' 公会甲 ', '公会甲', '公会乙'],
  } },
})
normalizeGameConfigSelects(legacy)
assert.deepEqual(legacy.union.fmlRace.acceptRules, createDefaultFmlRaceAcceptRules())
assert.equal(legacy.union.fmlRace.completeTakenTask, false)
assert.deepEqual(legacy.union.fmlRace.specifiedUpgradePlayers, ['公会甲', '公会乙'])
for (const key of oldKeys) assert.equal(Object.hasOwn(legacy.union.fmlRace, key), false, key)

const configured = deepMerge(createDefaultGameConfig(), {
  union: { fmlRace: {
    acceptRules: normalized,
    completeTakenTask: true,
    specifiedUpgradePlayers: ['公会甲'],
    upgradeTask: true,
  } },
})
normalizeGameConfigSelects(configured)
// 自动升级开关不能再重写四类最低分，保存/重新加载应无损。
assert.deepEqual(configured.union.fmlRace.acceptRules, normalized)
const roundtrip = deepMerge(createDefaultGameConfig(), JSON.parse(JSON.stringify(configured)))
normalizeGameConfigSelects(roundtrip)
assert.deepEqual(roundtrip.union.fmlRace.acceptRules, normalized)
assert.equal(roundtrip.union.fmlRace.completeTakenTask, true)

const filename = 'src/pages/GameConfigPage.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'fml-race-config-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content,
  filename,
  id: 'fml-race-config-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
assert.ok(source.indexOf('label="完成已接任务"') < source.indexOf('label="避开有进度任务"'))
assert.ok(source.includes(':disabled="!config.union.fmlRace.acceptRules[rule.key].enabled"'))
assert.ok(source.includes(':disabled="!fmlRaceQuickSetupRules[rule.key].enabled"'))
assert.ok(source.includes('v-model:value="config.union.fmlRace.acceptRules[rule.key].maxScore"'))
assert.ok(source.includes('v-model:value="fmlRaceQuickSetupRules[rule.key].maxScore"'))
assert.ok(source.includes('validateFmlRaceScoreRanges(config.value.union.fmlRace.acceptRules)'))
assert.ok(source.includes('validateFmlRaceScoreRanges(payload.union.fmlRace.acceptRules)'))
assert.ok(!source.includes('flex: 0 0 145px'), '桌面规则应继承父表单标签列')
assert.ok(source.includes('<Divider orientation="left" :orientation-margin="0">接取规则</Divider>'), '接取规则标题应取消默认留白，与说明文字左对齐')
for (const key of oldKeys) assert.equal(source.includes(key), false, key)
console.log('竞赛配置测试通过：自己升级最低分两倍上限、低分保留、普通分数联动、保存往返、四类规则、Vue编译。')
