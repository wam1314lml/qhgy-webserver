import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

// 配置函数内存打包执行：不运行浏览器、后台接口、游戏账号或网络。
const bundle = await build({
  stdin: {
    contents: `export * from './src/pages/game-config/defaultConfig.ts';
      export * from './src/pages/game-config/normalizeConfigSelects.ts';
      export { deepMerge } from './src/pages/game-config/utils.ts';
      export { actElimSpeedOptions } from './src/pages/game-config/options.ts';`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { createDefaultGameConfig, normalizeGameConfigSelects, deepMerge, actElimSpeedOptions } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`,
)
const expectedDefaults = {
  enabled: false, autoClaimEnergy: false, customScoreEnabled: false, scoreMode: 'extreme', speed: 1,
}
assert.deepEqual(createDefaultGameConfig().activity.actElim, expectedDefaults)
assert.deepEqual(actElimSpeedOptions.map(option => option.value), [1, 5, 10, 25, 100], '配置必须保存真实倍率，不保存 model 档位')
const normalize = (input = {}) => {
  const config = deepMerge(createDefaultGameConfig(), { activity: { actElim: input } })
  normalizeGameConfigSelects(config)
  return config
}
assert.deepEqual(normalize().activity.actElim, expectedDefaults)
assert.deepEqual(normalize({ enabled: true, speed: 25 }).activity.actElim, {
  ...expectedDefaults, enabled: true, speed: 25,
}, '保留四个用户配置及强制关闭标志')

for (const enabled of [true, false]) {
  for (const autoClaimEnergy of [true, false]) {
    for (const simpleMode of [true, false]) {
      for (const speed of [1, 5, 10, 25, 100]) {
        for (const maxScorePerMove of [1, 1000, 1000000]) {
          const settings = { enabled, autoClaimEnergy, simpleMode, speed, maxScorePerMove }
          let config = normalize(settings)
          for (let round = 0; round < 3; round++) {
            assert.deepEqual(config.activity.actElim, { ...expectedDefaults, enabled, autoClaimEnergy, speed })
            assert.deepEqual(config.activity.hdReward, { enabled: true, hd3013DrawEnabled: false })
            assert.equal(config.activity.actCardCollect.enabledCardCollect, false)
            config = deepMerge(createDefaultGameConfig(), JSON.parse(JSON.stringify(config)))
            normalizeGameConfigSelects(config)
          }
        }
      }
    }
  }
}
for (const speed of ['1', '5', '10', '25', '100']) {
  assert.equal(normalize({ speed }).activity.actElim.speed, Number(speed))
}
for (const mode of ['normal', 'extreme', 'task', 'score', undefined, null, 'bad', true, 500, {}, []]) {
  for (const scoreMode of ['normal', 'extreme', 'task', 'score', undefined, null, true]) {
    let config = normalize({ enabled: true, autoClaimEnergy: true, speed: 25, mode, scoreMode })
    for (let round = 0; round < 3; round++) {
      assert.deepEqual(config.activity.actElim, { ...expectedDefaults, enabled: true, autoClaimEnergy: true, speed: 25, scoreMode: scoreMode === 'normal' ? 'normal' : 'extreme' })
      assert.equal(Object.hasOwn(config.activity.actElim, 'mode'), false, '历史或手工模式不再保存')
      assert.equal(config.activity.actElim.scoreMode, scoreMode === 'normal' ? 'normal' : 'extreme', '只允许高分/普通策略，重复保存导入不丢失')
      config = normalize(JSON.parse(JSON.stringify(config.activity.actElim)))
    }
  }
}
for (const speed of [0, 2, 3, 4, 6, 50, 101, -1, 1.5, 'bad', Infinity]) {
  assert.equal(normalize({ speed }).activity.actElim.speed, 1)
}
for (const enabled of [true, false]) {
  for (const customScoreEnabled of [true, false]) {
    for (const customScoreStrategy of ['normal', 'medium']) {
      let config = normalize({ enabled, customScoreEnabled, customScoreStrategy })
      for (let round = 0; round < 3; round++) {
        assert.deepEqual(config.activity.actElim, { ...expectedDefaults, enabled }, '旧自定义开关强制关闭并清理旧策略')
        config = normalize(JSON.parse(JSON.stringify(config.activity.actElim)))
      }
    }
  }
}
for (const customScoreEnabled of [undefined, null, 'true', 'false', 1, 0, '', 'bad', {}, []]) {
  assert.equal(normalize({ customScoreEnabled }).activity.actElim.customScoreEnabled, false, '任何输入均强制关闭')
}
for (const customScoreStrategy of [undefined, null, 'extreme', 'task', 'score', '', 'bad', true, false, 0, 1, {}, []]) {
  assert.equal(Object.hasOwn(normalize({ customScoreStrategy }).activity.actElim, 'customScoreStrategy'), false, '旧策略不再保存')
}
for (const scoreMode of ['normal', 'extreme']) {
  const config = normalize({ enabled: false, scoreMode, customScoreEnabled: true, customScoreMin: 1, customScoreMax: 99999 })
  assert.deepEqual(config.activity.actElim, { ...expectedDefaults, scoreMode })
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(config.activity.actElim))).activity.actElim, config.activity.actElim)
}
for (const input of [undefined, null, true, false, 0, 500, 1000, 1000000, '', ' ', 'bad', Infinity, NaN, {}, []]) {
  const config = createDefaultGameConfig()
  config.activity.actElim.maxScorePerMove = input
  normalizeGameConfigSelects(config)
  assert.equal(Object.hasOwn(config.activity.actElim, 'maxScorePerMove'), false, '历史或手工上限不再保存')
}
for (const input of ['true', 'false', 1, 0, null]) {
  const normalized = normalize({ enabled: input, autoClaimEnergy: input, simpleMode: input }).activity.actElim
  assert.equal(normalized.enabled, false)
  assert.equal(normalized.autoClaimEnergy, false)
  assert.equal(Object.hasOwn(normalized, 'simpleMode'), false, '历史简易模式设置不再保存')
}

const filename = 'src/pages/GameConfigPage.vue'
const source = await readFile(new URL(`../${filename}`, import.meta.url), 'utf8')
const parsed = parse(source, { filename })
assert.deepEqual(parsed.errors, [])
const script = compileScript(parsed.descriptor, { id: 'act-elim-config-test' })
const template = compileTemplate({
  source: parsed.descriptor.template.content, filename, id: 'act-elim-config-test',
  compilerOptions: { bindingMetadata: script.bindings },
})
assert.deepEqual(template.errors, [])
const start = source.indexOf('<Divider orientation="left">甘之如饴</Divider>')
assert.ok(start > source.indexOf(`<div v-if="activeTab === '活动'"`))
const panel = source.slice(start, source.indexOf('</Form>', start))
assert.deepEqual([...panel.matchAll(/name="activity\.actElim\.([^\"]+)"/g)].map(match => match[1]), [
  'enabled', 'autoClaimEnergy', 'scoreMode', 'speed',
])
for (const field of ['enabled', 'autoClaimEnergy', 'scoreMode', 'speed']) {
  const block = panel.match(new RegExp(`<CustomFormItem[^>]*name="activity\\.actElim\\.${field}"[\\s\\S]*?</CustomFormItem>`))?.[0]
  assert.ok(block, field)
  assert.match(block, new RegExp(`v-model:(?:checked|value)="config\\.activity\\.actElim\\.${field}"`))
  if (field !== 'enabled') assert.match(block, /:disabled="!config\.activity\.actElim\.enabled"/)
}
assert.match(panel, /:options="actElimSpeedOptions"/)
assert.match(panel, /每日任务完成后的体力奖励，以及已耗体力达标的进度奖励/)
assert.doesNotMatch(panel, /自定义分数|customScore|中等策略/)
assert.match(panel, /label="分数策略"/)
assert.match(panel, /value: 'normal', label: '普通策略'/)
assert.match(panel, /value: 'extreme', label: '高分策略'/)
assert.doesNotMatch(panel, /<Input(?:Number)?\b/, '只允许选择策略，不开放任意分数输入')
assert.match(panel, /label="最高倍率"/)
assert.match(panel, /任务模式固定使用1倍/)
assert.match(panel, /仅供脚本切换分数模式后使用/)
assert.match(panel, /按解锁积分与内部策略自动降档/)
assert.doesNotMatch(panel, /actElim\.mode|游戏模式|普通模式|极限模式|simpleMode|maxScorePerMove|简易模式|分数上限/)
assert.match(source, /normalizeGameConfigSelects\(config\.value\)[\s\S]*?axios\.put\(`\/api\/game-accounts\/\$\{accountId\.value\}\/setting`, config\.value\)/)
assert.match(source, /deepMerge\(createDefaultGameConfig\(\), sourceResponse\.data\.data\)[\s\S]*?normalizeGameConfigSelects\(payload\)/)

assert.doesNotMatch(panel, /250|500|每\s*1?\s*体力|目标分数/, '玩家可见配置不展示每体力得分或内部目标')
console.log('甘之如饴前端测试通过：自定义计分强制关闭、scoreMode高分/普通保存导入、旧字段清理、四项可见配置、真实倍率、其他活动隔离及Vue编译（全离线）。')
