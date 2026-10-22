import catalog from '../data/guild-artwork.json'

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

type ArtworkIcon = { type: number; asset: string; mask?: string }
type ArtworkTitle = { asset: string; name: string; color: string; outline: string }

/** 编号和图片均来自本游戏客户端目录；陌生编号不拼接资源 URL。 */
export function guildArtwork(guild: ReturnType<typeof accountGuild>) {
  const assets: Record<string, string> = catalog.assets
  const sizes: Record<string, number[]> = catalog.sizes
  const icons: Record<string, ArtworkIcon> = catalog.icons
  const titles: Record<string, ArtworkTitle> = catalog.titles
  const parts = guild.status === 'joined' && guild.icon?.match(/^[1-9]\d*_[1-9]\d*_[1-9]\d*$/)
    ? guild.icon.split('_').map(id => icons[id]) : null
  let avatar = null
  if (parts?.every((part, index) => part?.type === index + 1)) {
    const [background, frame, icon] = parts
    const keys = [background.asset, frame.asset, icon.asset, frame.mask ?? '']
    if (keys.every(key => assets[key] && sizes[key])) {
      const canvas = Math.max(...sizes[frame.asset]!)
      const layer = (key: string) => ({
        width: `${sizes[key]![0]! / canvas * 100}%`,
        height: `${sizes[key]![1]! / canvas * 100}%`,
      })
      avatar = {
        background: assets[background.asset]!, texture: assets[frame.asset]!,
        icon: assets[icon.asset]!, mask: assets[frame.mask!]!,
        backgroundStyle: {
          ...layer(background.asset),
          maskImage: `url(${assets[frame.mask!]})`,
          WebkitMaskImage: `url(${assets[frame.mask!]})`,
          maskSize: `${sizes[frame.mask!]![0]! / sizes[background.asset]![0]! * 100}% ${sizes[frame.mask!]![1]! / sizes[background.asset]![1]! * 100}%`,
        },
        textureStyle: layer(frame.asset), iconStyle: layer(icon.asset),
      }
    }
  }
  const title = guild.status === 'joined' && guild.titleId ? titles[String(guild.titleId)] : undefined
  return { avatar, title: title ? { ...title, src: assets[title.asset] } : null }
}

export const guildNumber = (value: number | null) => value === null ? '—' : value.toLocaleString('zh-CN')
export function guildWealth(value: number | null) {
  if (value === null) return '—'
  if (value >= 100000000) return `${Math.floor(value / 1000000) / 100}亿`
  if (value >= 10000) return `${Math.floor(value / 1000) / 10}万`
  return guildNumber(value)
}
