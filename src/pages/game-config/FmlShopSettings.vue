<script setup lang="ts">
import { computed } from 'vue'
import { Switch } from 'ant-design-vue'
import VueDraggable from 'vuedraggable'
import CustomFormItem from '../../components/CustomFormItem.vue'
import CustomSelect from '../../components/CustomSelect.vue'
import CustomInputNumber from '../../components/CustomInputNumber.vue'
import { FML_SHOP_CATALOG, normalizeFmlShop, type FmlShopConfig, type FmlShopItemRule } from './fmlShopRules'

const props = defineProps<{ modelValue: FmlShopConfig }>()
const emit = defineEmits<{ 'update:modelValue': [value: FmlShopConfig] }>()
const products = new Map(FML_SHOP_CATALOG.items.map(item => [item.id, item]))
const modes = [
  { label: '按折扣', value: 'discount' }, { label: '按库存', value: 'stock' },
  { label: '库存或折扣', value: 'stockOrDiscount' }, { label: '库存且折扣', value: 'stockAndDiscount' },
  { label: '出现即买', value: 'always' },
]
const refreshModes = [
  { label: '不自动刷新', value: 'none' }, { label: '仅使用免费刷新', value: 'free' },
  { label: '免费刷新后允许付费刷新', value: 'paid' },
]
const rows = computed({ get: () => props.modelValue.items, set: items => update('items', items) })
function update(key: keyof FmlShopConfig, value: unknown) {
  emit('update:modelValue', normalizeFmlShop({ ...props.modelValue, [key]: value }))
}
function updateItem(id: number, key: keyof FmlShopItemRule, value: unknown) {
  update('items', rows.value.map(item => item.id === id ? { ...item, [key]: value } : item))
}
function move(index: number, direction: number) {
  const next = [...rows.value], target = index + direction
  if (target < 0 || target >= next.length) return
  ;[next[index], next[target]] = [next[target], next[index]]
  rows.value = next
}
const hasStock = (mode: string) => ['stock', 'stockOrDiscount', 'stockAndDiscount'].includes(mode)
const hasDiscount = (mode: string) => ['discount', 'stockOrDiscount', 'stockAndDiscount'].includes(mode)
function discounts(id: number) {
  const price = products.get(id)?.price ?? 0
  return Array.from({ length: 10 }, (_, index) => ({ value: index + 1,
    label: index === 9 ? `不限折扣（≤${price}币）` : `${index + 1}折及以下（≤${price * (index + 1) / 10}币）` }))
}
</script>

<template>
  <section class="fml-shop-settings" aria-label="公会商店设置">
    <CustomFormItem label="自动购买" name="union.fmlShop.enabled" tooltip="按商品、库存、折扣和优先级自动购买公会商店商品。">
      <Switch :checked="modelValue.enabled" @update:checked="update('enabled', $event)" />
    </CustomFormItem>
    <template v-if="modelValue.enabled">
      <CustomFormItem label="最低保留公会币" name="union.fmlShop.coinReserve" tooltip="购买、解锁和付费刷新后，公会币都不能低于此值。填0表示不保留。">
        <CustomInputNumber class="shop-top-number" :value="modelValue.coinReserve" :min="0" :max="99999999" :precision="0" @update:value="update('coinReserve', $event)" />
      </CustomFormItem>
      <CustomFormItem label="自动解锁格子" name="union.fmlShop.autoUnlock" tooltip="按游戏费用逐格解锁，先解锁再购买，同样遵守最低保留公会币。">
        <Switch :checked="modelValue.autoUnlock" @update:checked="update('autoUnlock', $event)" />
      </CustomFormItem>
      <CustomFormItem v-if="modelValue.autoUnlock" label="解锁到" name="union.fmlShop.unlockTo">
        <CustomInputNumber class="shop-top-number" :value="modelValue.unlockTo" :min="1" :max="FML_SHOP_CATALOG.maxSlots" :precision="0" addon-after="格" @update:value="update('unlockTo', $event)" />
      </CustomFormItem>
      <CustomFormItem label="刷新策略" name="union.fmlShop.refreshMode" tooltip="先买完当前符合条件的商品，再按策略刷新。免费次数与半价资格读取公会建设；全部库存目标达标后不再刷新。">
        <CustomSelect :value="modelValue.refreshMode" :options="refreshModes" class="shop-refresh-select" @update:value="update('refreshMode', $event)" />
      </CustomFormItem>
      <p v-if="modelValue.refreshMode === 'paid'" class="shop-spend-hint">允许持续消耗公会币刷新，直到余额不足、达到保留额或库存目标。首次半价以公会建设为准。</p>
      <CustomFormItem class="shop-order-title" label="商品购买顺序" name="union.fmlShop.items" tooltip="开启需要购买的商品并拖拽排序。购买时按上方优先级执行，每次购买后重新检查库存和余额。库存按道具个数计算，每次买一整组，可能超过库存阈值。" />
      <VueDraggable v-model="rows" item-key="id" handle=".shop-drag-handle" :animation="160" class="shop-products" :delay="120" :delay-on-touch-only="true">
        <template #item="{ element: item, index }">
          <article class="shop-product" :class="{ 'is-disabled': !item.enabled }" :data-product-id="item.id">
            <div class="shop-product-heading">
              <span class="shop-drag-handle" title="拖拽排序" aria-hidden="true">☰</span>
              <span class="shop-product-name">{{ products.get(item.id)?.name }} ×{{ products.get(item.id)?.amount }}</span>
              <div class="shop-order-buttons">
                <button type="button" :disabled="index === 0" :aria-label="`上移${products.get(item.id)?.name}`" @click="move(index, -1)">↑</button>
                <button type="button" :disabled="index === rows.length - 1" :aria-label="`下移${products.get(item.id)?.name}`" @click="move(index, 1)">↓</button>
              </div>
              <Switch :checked="item.enabled" size="small" :aria-label="`购买${products.get(item.id)?.name}`" @update:checked="updateItem(item.id, 'enabled', $event)" />
            </div>
            <div v-if="item.enabled" class="shop-product-options">
              <label :for="`fml-shop-mode-${item.id}`">购买条件</label>
              <CustomSelect :id="`fml-shop-mode-${item.id}`" :value="item.mode" :options="modes" @update:value="updateItem(item.id, 'mode', $event)" />
              <template v-if="hasStock(item.mode)">
                <label :for="`fml-shop-stock-${item.id}`">库存低于</label>
                <CustomInputNumber :id="`fml-shop-stock-${item.id}`" :value="item.stockBelow" :min="0" :max="99999999" :precision="0" @update:value="updateItem(item.id, 'stockBelow', $event)" />
              </template>
              <template v-if="hasDiscount(item.mode)">
                <label :for="`fml-shop-discount-${item.id}`">接受折扣</label>
                <CustomSelect :id="`fml-shop-discount-${item.id}`" :value="item.discount" :options="discounts(item.id)" @update:value="updateItem(item.id, 'discount', $event)" />
              </template>
            </div>
          </article>
        </template>
      </VueDraggable>
    </template>
  </section>
</template>

<style scoped>
.fml-shop-settings { max-width: 640px; }
.fml-shop-settings :deep(.shop-top-number) { width: min(100%, 192px) !important; min-width: 0; }
.fml-shop-settings :deep(.shop-top-number .ant-input-number) { width: 100% !important; min-width: 0; }
.shop-refresh-select { width: min(100%, 300px) !important; }
.shop-spend-hint { font-size: 12px; line-height: 1.7; color: var(--text-secondary, #777); margin: -6px 0 16px 24px; }
.shop-products { display: grid; gap: 8px; padding: 0 12px 20px 24px; }
.shop-order-title :deep(.ant-form-item-label) { flex: 1 !important; max-width: none !important; text-align: left; }
.shop-order-title :deep(.ant-form-item-control) { display: none; }
.shop-order-title :deep(.label-text) { white-space: nowrap; }
.shop-product { border: 1px solid var(--border-color, #ddd); border-radius: 10px; padding: 10px 12px; background: var(--bg-color, #fff); }
.shop-product-heading { display: flex; align-items: center; gap: 8px; }
.shop-product-name { flex: 1; min-width: 0; font-size: 13px; }
.shop-drag-handle { cursor: grab; color: #999; touch-action: none; }
.shop-order-buttons { display: flex; gap: 1px; }
.shop-order-buttons button { border: 0; background: transparent; color: inherit; padding: 0 3px; cursor: pointer; }
.shop-order-buttons button:disabled { opacity: .25; cursor: default; }
.shop-product.is-disabled { background: var(--bg-secondary, #f7f7f7); }
.is-disabled .shop-product-name { color: var(--text-secondary, #999); }
.shop-product-options { display: grid; grid-template-columns: 60px minmax(0, 1fr); align-items: center; gap: 8px; margin: 12px 0 0 20px; }
.shop-product-options label { font-size: 12px; white-space: nowrap; }
.shop-product-options :deep(.ant-select), .shop-product-options :deep(.ant-input-number) { width: 100% !important; min-width: 0; }
@media (max-width: 480px) {
  .shop-products { padding-left: 0; padding-right: 0; }
  .shop-product { padding: 9px 8px; }
  .shop-product-heading { gap: 6px; }
  .shop-product-options { margin-left: 0; grid-template-columns: 56px minmax(0, 1fr); gap: 7px; }
}
</style>
