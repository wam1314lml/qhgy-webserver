const integer = (value: unknown): number | null =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
  && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null

/** 只展示脚本确认的本角色公会快照，旧记录/缺字段不推断入会。 */
export function accountGuild(value: unknown) {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const status = raw.status === 'joined' || raw.status === 'not_joined' ? raw.status : 'unknown'
  const joined = status === 'joined'
  return {
    status,
    id: joined && integer(raw.id) ? String(raw.id) : null,
    name: joined && typeof raw.name === 'string' ? raw.name.slice(0, 100) : null,
    icon: joined && typeof raw.icon === 'string' ? raw.icon.slice(0, 40) : null,
    titleName: joined && typeof raw.titleName === 'string' ? raw.titleName.slice(0, 100) : null,
    level: joined ? integer(raw.level) : null,
    members: joined ? integer(raw.members) : null,
    capacity: joined ? integer(raw.capacity) : null,
    wealth: joined ? integer(raw.wealth) : null,
    guildCoin: joined ? integer(raw.guildCoin) : null,
    titleId: joined ? integer(raw.titleId) : null,
    titleLevel: joined ? integer(raw.titleLevel) : null,
  }
}

export const guildNumber = (value: number | null) => value === null ? '—' : value.toLocaleString('zh-CN')
export function guildWealth(value: number | null) {
  if (value === null) return '—'
  if (value >= 100000000) return `${Math.floor(value / 1000000) / 100}亿`
  if (value >= 10000) return `${Math.floor(value / 1000) / 10}万`
  return guildNumber(value)
}
