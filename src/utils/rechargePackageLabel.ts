/** Presentation only: never use this text to decide purchase eligibility or price. */
export const normalizePurchaseLimitLabel = (value: unknown): string =>
  typeof value === 'string' ? Array.from(value.trim()).slice(0, 20).join('') : ''

export const hasPurchaseLimit = (pkg: { max_purchase_count?: unknown }): boolean =>
  Number(pkg.max_purchase_count) > 0

export const getUnlimitedPurchaseLabel = (pkg: { activity_display_text?: unknown }): string =>
  normalizePurchaseLimitLabel(pkg.activity_display_text) || '无限制'
