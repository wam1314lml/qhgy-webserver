import type { FmlRaceAcceptRules } from './types'

export const fmlRaceAcceptRuleOptions: Array<{
  key: keyof FmlRaceAcceptRules
  label: string
}> = [
  { key: 'normal', label: '普通任务未升级' },
  { key: 'systemUpgrade', label: '系统升级任务' },
  { key: 'selfUpgrade', label: '自己升级任务' },
  { key: 'otherUpgrade', label: '他人升级任务' },
]

export const createDefaultFmlRaceAcceptRules = (): FmlRaceAcceptRules => ({
  normal: { enabled: false, minScore: 23 },
  systemUpgrade: { enabled: false, minScore: 46 },
  selfUpgrade: { enabled: false, minScore: 46 },
  otherUpgrade: { enabled: false, minScore: 46, memberMode: 'all' },
})

/** 新分类必须显式开启，不把旧的全局限分/他人任务开关迁移成授权。 */
export const normalizeFmlRaceAcceptRules = (value: unknown): FmlRaceAcceptRules => {
  const rules = createDefaultFmlRaceAcceptRules()
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  for (const { key } of fmlRaceAcceptRuleOptions) {
    const entry = source[key]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const rule = entry as Record<string, unknown>
    rules[key].enabled = rule.enabled === true
    const score = Number(rule.minScore)
    if (rule.minScore !== null && rule.minScore !== '' && Number.isFinite(score)) {
      rules[key].minScore = Math.max(1, Math.min(99, Math.floor(score)))
    }
    if (key === 'otherUpgrade') {
      rules.otherUpgrade.memberMode = rule.memberMode === 'specified' ? 'specified' : 'all'
    }
  }
  return rules
}
