import type { ConfigObject } from './core'

export interface ShareSection { key: string; label: string; paths: readonly string[] }

// 页签与存储层级并不总相同；更精确的路径归属优先，数组/JSON 子项不拆散。
export function sectionForPath(path: string, sections: readonly ShareSection[]): ShareSection | undefined {
  let match: ShareSection | undefined
  let length = -1
  for (const section of sections) for (const prefix of section.paths) {
    if ((path === prefix || path.startsWith(prefix + '.')) && prefix.length > length) {
      match = section; length = prefix.length
    }
  }
  return match
}

// 只过滤已由项目 adapter 清理过的配置，不补默认值、不修改草稿或导入协议。
export function selectShareSections(config: ConfigObject, sections: readonly ShareSection[], selected?: readonly string[]): ConfigObject {
  const keys = selected === undefined ? sections.map(section => section.key) : selected
  if (!Array.isArray(keys) || !keys.length) throw new Error('请至少选择一个分享页签')
  if (keys.some(key => !sections.some(section => section.key === key))) throw new Error('分享页签无效，请重新打开分享窗口')
  const chosen = new Set(keys)
  function visit(value: ConfigObject, parent: string): ConfigObject {
    const result: ConfigObject = {}
    for (const [key, item] of Object.entries(value)) {
      const path = parent ? parent + '.' + key : key
      if (item !== null && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length) {
        const child = visit(item as ConfigObject, path)
        if (Object.keys(child).length) result[key] = child
      } else {
        const section = sectionForPath(path, sections)
        if (!section) throw new Error('配置尚未归属分享页签：' + path)
        if (chosen.has(section.key)) result[key] = item
      }
    }
    return result
  }
  const result = visit(config, '')
  if (!Object.keys(result).length) throw new Error('所选页签没有可分享的配置')
  return result
}
