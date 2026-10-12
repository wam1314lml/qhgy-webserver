export type FmlShopMode = 'discount' | 'stock' | 'stockOrDiscount' | 'stockAndDiscount' | 'always'
export type FmlShopRefreshMode = 'none' | 'free' | 'paid'
export interface FmlShopItemRule { id: number; enabled: boolean; mode: FmlShopMode; stockBelow: number; discount: number }
export interface FmlShopConfig {
  enabled: boolean; coinReserve: number; autoUnlock: boolean; unlockTo: number
  refreshMode: FmlShopRefreshMode; items: FmlShopItemRule[]
}
export const FML_SHOP_CATALOG: { source: string; currencyId: number; maxSlots: number; items: {
  id: number; itemId: number; name: string; amount: number; price: number; currencyId: number
}[] }
export const FML_SHOP_MODES: FmlShopMode[]
export const FML_SHOP_REFRESH_MODES: FmlShopRefreshMode[]
export function normalizeFmlShop(value?: unknown): FmlShopConfig
export function matchesFmlShopRule(rule: FmlShopItemRule, stock: number, discount: number): boolean
