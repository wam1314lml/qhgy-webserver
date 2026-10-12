// 由脚本仓库 scripts/sync-fml-shop.mjs 生成，勿手动修改。
import catalog from './fmlShopCatalog.json';

export const FML_SHOP_CATALOG = catalog;
export const FML_SHOP_MODES = ['discount', 'stock', 'stockOrDiscount', 'stockAndDiscount', 'always'];
export const FML_SHOP_REFRESH_MODES = ['none', 'free', 'paid'];
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const integer = (value, fallback, min, max) => {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(Number(value))));
};

/** 商品顺序即购买优先级；旧账号、新增商品均默认不购买。前端副本由同步脚本生成。 */
export function normalizeFmlShop(value) {
    const raw = object(value), seen = new Set(), items = [];
    const ids = new Set(catalog.items.map(item => item.id));
    for (const entry of Array.isArray(raw.items) ? raw.items : []) {
        const item = object(entry), id = Number(item.id);
        if (!ids.has(id) || seen.has(id)) continue;
        seen.add(id);
        items.push({ id, enabled: item.enabled === true,
            mode: FML_SHOP_MODES.includes(item.mode) ? item.mode : 'discount',
            stockBelow: integer(item.stockBelow, 100, 0, 99999999),
            discount: integer(item.discount, 2, 1, 10) });
    }
    for (const item of catalog.items) if (!seen.has(item.id)) {
        items.push({ id: item.id, enabled: false, mode: 'discount', stockBelow: 100, discount: 2 });
    }
    return { enabled: raw.enabled === true,
        coinReserve: integer(raw.coinReserve, 0, 0, 99999999),
        autoUnlock: raw.autoUnlock === true,
        unlockTo: integer(raw.unlockTo, catalog.maxSlots, 1, catalog.maxSlots),
        refreshMode: FML_SHOP_REFRESH_MODES.includes(raw.refreshMode) ? raw.refreshMode : 'none', items };
}

export function matchesFmlShopRule(rule, stock, discount) {
    if (!rule?.enabled || !Number.isSafeInteger(stock) || stock < 0 || !Number.isFinite(discount) || discount <= 0 || discount > 10) return false;
    const low = stock < rule.stockBelow, cheap = discount <= rule.discount;
    switch (rule.mode) {
        case 'stock': return low;
        case 'stockOrDiscount': return low || cheap;
        case 'stockAndDiscount': return low && cheap;
        case 'always': return true;
        case 'discount': return cheap;
        default: return false;
    }
}
