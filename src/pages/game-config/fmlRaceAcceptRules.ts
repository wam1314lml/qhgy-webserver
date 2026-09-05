import type { FmlRaceAcceptRule, FmlRaceAcceptRules } from './types'

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
  normal: { enabled: false, minScore: 23, maxScore: 99 },
  systemUpgrade: { enabled: false, minScore: 46, maxScore: 99 },
  selfUpgrade: { enabled: false, minScore: 46, maxScore: 99 },
  otherUpgrade: { enabled: false, minScore: 46, maxScore: 99, memberMode: 'all' },
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
    const maximum = Number(rule.maxScore)
    if (rule.maxScore !== null && rule.maxScore !== '' && Number.isFinite(maximum)) {
      rules[key].maxScore = Math.max(1, Math.min(99, Math.floor(maximum)))
    }
    if (key === 'otherUpgrade') {
      rules.otherUpgrade.memberMode = rule.memberMode === 'specified' ? 'specified' : 'all'
    }
  }
  return rules
}

/** 错误区间不交换上下限，避免悄悄改变用户的接取范围。 */
export const getFmlRaceScoreRangeError = (rule: FmlRaceAcceptRule): string => {
  if (!rule.enabled) return ''
  const minimum = Number(rule.minScore)
  const maximum = Number(rule.maxScore)
  if (![minimum, maximum].every((value) => Number.isInteger(value) && value >= 1 && value <= 99)) {
    return '最低分和最高分都须填写 1–99 的整数'
  }
  return minimum > maximum ? '最低分不能大于最高分' : ''
}

export const validateFmlRaceScoreRanges = (rules: FmlRaceAcceptRules): string => {
  for (const { key, label } of fmlRaceAcceptRuleOptions) {
    const error = getFmlRaceScoreRangeError(rules[key])
    if (error) return `${label}：${error}`
  }
  return ''
}
