import catalogs from './activityShopCatalogs.json'

export interface ActivityShopConfig {
  enabled: boolean
  beforeEndMinutes: number
  shopItemId: number
}
export interface ActivityShopCatalog {
  currencyName: string
  defaultShopItemId: number
  fallbackShopItemId: number | null
  items: Array<{ shopItemId: number; name: string; amount: number; price: number }>
}
export const activityShopCatalogs = catalogs
export type ActivityShopKey = keyof typeof catalogs

export function normalizeShopConfig(value: unknown, items: Array<{ shopItemId: number }>, defaultId: number): ActivityShopConfig {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const numeric = (v: unknown): number => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN
  const minutes = numeric(source.beforeEndMinutes)
  const id = source.shopItemId == null ? defaultId : numeric(source.shopItemId)
  const valid = items.some(item => item.shopItemId === id)
  return {
    enabled: source.enabled === true && valid,
    beforeEndMinutes: Number.isFinite(minutes) ? Math.min(1440, Math.max(1, Math.floor(minutes))) : 5,
    shopItemId: valid ? id : defaultId,
  }
}

export function normalizeActivityShop(value: unknown, key: ActivityShopKey): ActivityShopConfig {
  const catalog = catalogs[key]
  return normalizeShopConfig(value, catalog.items, catalog.defaultShopItemId)
}
export const createDefaultActivityShop = (key: ActivityShopKey): ActivityShopConfig => normalizeActivityShop(undefined, key)

export const getActivityShopOptions = (catalog: ActivityShopCatalog) => catalog.items.map(item => ({
  value: item.shopItemId, label: `${item.name}×${item.amount}（${item.price}${catalog.currencyName}）`,
}))
