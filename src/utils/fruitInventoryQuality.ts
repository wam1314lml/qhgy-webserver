export const inventoryQualityNames = ['未知品质', '绿色', '蓝色', '紫色', '金色', '红色'] as const

export const inventoryQualityOptions = [
  { key: 'all', label: '全部' },
  { key: 5, label: '红' },
  { key: 4, label: '金' },
  { key: 3, label: '紫' },
  { key: 2, label: '蓝' },
  { key: 1, label: '绿' },
] as const
export type InventoryQualityFilter = typeof inventoryQualityOptions[number]['key']

export const inventoryQualitySortOptions = [
  { key: 'stockAsc', label: '从少到多 ↑' },
  { key: 'stockDesc', label: '从多到少 ↓' },
] as const
export type InventoryQualitySort = typeof inventoryQualitySortOptions[number]['key']

export function inventoryQualityOf(item: { quality?: number }): number {
  const quality = Number(item.quality)
  return Number.isInteger(quality) && quality >= 1 && quality <= 5 ? quality : 0
}
