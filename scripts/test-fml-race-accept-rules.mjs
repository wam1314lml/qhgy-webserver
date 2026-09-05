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
  createDefaultGameConfig,
  normalizeGameConfigSelects,
  deepMerge,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

const defaults = createDefaultFmlRaceAcceptRules()
assert.deepEqual(defaults, {
  normal: { enabled: false, minScore: 23 },
  systemUpgrade: { enabled: false, minScore: 46 },
  selfUpgrade: { enabled: false, minScore: 46 },
  otherUpgrade: { enabled: false, minScore: 46, memberMode: 'all' },
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
  normal: { enabled: true, minScore: 1 },
  systemUpgrade: { enabled: true, minScore: 99 },
  selfUpgrade: { enabled: false, minScore: 47 },
  otherUpgrade: { enabled: true, minScore: 46, memberMode: 'specified' },
})
assert.equal(normalizeFmlRaceAcceptRules({ normal: { minScore: Infinity } }).normal.minScore, 23)

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
for (const key of oldKeys) assert.equal(source.includes(key), false, key)
console.log('竞赛配置测试通过：四类默认关闭、1—99分、成员规则、旧配置清理、保存往返、Vue编译。')
