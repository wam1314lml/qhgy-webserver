import type { ObjectDirective } from 'vue'

export interface ConfigFieldRow { id: string; section: string; tab: string; paths: string[] }
export interface MissingConfigField { path: string; row: string; section: string; tab: string }
export interface ConfigMissingMarker { id: string; count: number; section: boolean }

export function configValueAt(value: unknown, path: string): unknown {
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, key)) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

// 数组/动态列表整体算一项；只判断字段是否缺失，false、0、空字符串和空数组均是有效配置。
export function findMissingConfigFields(raw: unknown, defaults: unknown, rows: ConfigFieldRow[]): MissingConfigField[] {
  const fields: MissingConfigField[] = []
  const seen = new Set<string>()
  function add(path: string, value: unknown, row: ConfigFieldRow) {
    if (value === undefined) return
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
      for (const [key, child] of Object.entries(value)) add(`${path}.${key}`, child, row)
      return
    }
    if (seen.has(path)) return
    seen.add(path)
    const saved = configValueAt(raw, path)
    if (saved === undefined || (saved === null && value !== null)) fields.push({ path, row: row.id, section: row.section, tab: row.tab })
  }
  for (const row of rows) for (const path of row.paths) add(path, configValueAt(defaults, path), row)
  return fields
}

export function createMissingConfigMarkers(fields: MissingConfigField[], rows: ConfigFieldRow[]): Record<string, ConfigMissingMarker> {
  const markers: Record<string, ConfigMissingMarker> = {}
  for (const field of fields) {
    markers[field.section] ||= { id: field.section, count: 0, section: true }
    markers[field.section].count++
  }
  for (const row of rows) {
    const count = fields.filter(field => row.paths.some(path => field.path === path || field.path.startsWith(path + '.'))).length
    if (count) markers[row.id] = { id: row.id, count, section: false }
  }
  return markers
}

// 仅管理自己的标记节点，不覆盖 Vue/Ant 标签，也不改变任何表单值。
const ownedMarkers = new WeakMap<HTMLElement, HTMLElement>()
function updateMarker(el: HTMLElement, value?: ConfigMissingMarker) {
  let marker = ownedMarkers.get(el)
  if (!value?.count) {
    marker?.remove()
    ownedMarkers.delete(el)
    delete el.dataset.configMissingTarget
    delete el.dataset.configMissingHighlight
    el.classList.remove('config-missing-section')
    return
  }
  el.dataset.configMissingTarget = value.id
  el.classList.toggle('config-missing-section', value.section)
  if (!marker) {
    marker = document.createElement('span')
    ownedMarkers.set(el, marker)
    marker.dataset.configMissingDot = ''
    const customLabel = el.querySelector('.label-text')
    const label = el.querySelector('.ant-form-item-label label, .ant-divider-inner-text')
    if (customLabel) customLabel.after(marker)
    else if (label) label.append(marker)
    else el.prepend(marker)
  }
  marker.className = value.section ? 'config-missing-section-count' : 'config-missing-dot'
  marker.textContent = value.section ? `未设置 ${value.count} 项` : ''
  marker.title = `有 ${value.count} 项尚未保存，当前显示默认值`
  marker.setAttribute('role', 'img')
  marker.setAttribute('aria-label', `未设置 ${value.count} 项`)
}

export const vConfigMissing: ObjectDirective<HTMLElement, ConfigMissingMarker | undefined> = {
  mounted: (el, binding) => updateMarker(el, binding.value),
  updated: (el, binding) => updateMarker(el, binding.value),
}
