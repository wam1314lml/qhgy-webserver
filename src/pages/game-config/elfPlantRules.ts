import { ELVES, ELF_IDENTITIES } from './elfOptions'
import { elfPlantOptions } from './elfPlantOptions'

const byId = new Map(elfPlantOptions.map(option => [option.value, option]))
const byBookId = new Map(elfPlantOptions.map(option => [String(option.bookId), option]))
const findOption = (id: string) => byId.get(id) ?? byBookId.get(id)

/** 保留旧或未知指定以供用户重选，绝不能清空后意外启用周双倍。 */
export function normalizeSelectedElvesIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,，|;；]/)
    : value == null ? [] : [value]
  return [...new Set(values
    // 异常旧配置也必须保留“已有指定”的意图；对象只留固定占位，不显示其原始内容。
    .map(item => item !== null && typeof item === 'object' ? '无效果灵配置' : String(item).trim())
    .filter(Boolean))]
}

function invalidLabel(id: string): string {
  return `${ELVES[id] ?? `【系列待确认】未知果灵（ID：${id}）`}（当前图鉴未收录有效种植组合，请重新选择）`
}

function invalidDetail(id: string): string {
  const identity = ELF_IDENTITIES[id]
  const source = identity?.titleSource === 'description'
    ? `；物品说明组合：${identity.mainFruitName} + ${identity.secondaryFruitName}` : ''
  return `${invalidLabel(id)}${source}`
}

/** 无效旧项仅用于显示当前选择，不提供为新的可选种植目标。 */
export function getElfPlantOptions(selected: unknown) {
  const options: Array<{ value: string; label: string; title?: string; disabled?: boolean }> = [...byId.values()]
  for (const id of normalizeSelectedElvesIds(selected)) {
    if (byId.has(id)) continue
    const option = findOption(id)
    options.push(option
      ? { value: id, label: `${option.label}（已保存图鉴ID：${id}）`, title: option.title }
      : { value: id, label: invalidLabel(id), title: invalidDetail(id), disabled: true })
  }
  return options
}

export function getElfPlantSelectionNotice(selected: unknown): { type: 'info' | 'warning'; text: string } {
  const ids = normalizeSelectedElvesIds(selected)
  if (ids.length === 0) return { type: 'info', text: '未指定果灵：按本周双倍名单，选择主果和副果都已培育的首个组合；没有可种组合时，按原土地策略种植。' }
  const firstValid = ids.map(findOption).find(Boolean)
  const invalidIds = ids.filter(id => !findOption(id))
  const invalidText = invalidIds.map(invalidDetail).join('、')
  if (!firstValid) return { type: 'warning', text: `指定项 ${invalidText}。暂停果灵种植，不自动改选本周双倍；仍按原土地策略种植。` }
  const selectedText = `按选择顺序使用首个有效指定：${firstValid.label}。需主果和副果都已培育，不自动改选本周双倍。`
  return invalidIds.length
    ? { type: 'warning', text: `${invalidText}。${selectedText}` }
    : { type: 'info', text: selectedText }
}
