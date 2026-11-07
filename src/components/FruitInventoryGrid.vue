<template>
  <div class="evt-fruit-inventory">
    <template v-if="showQualityControls">
      <div class="evt-inventory-quality" role="group" aria-label="水果品质筛选">
        <span>品质</span>
        <button v-for="option in inventoryQualityOptions" :key="option.key" type="button"
          class="evt-inventory-quality-option" :aria-pressed="quality === option.key"
          @click="$emit('update:quality', option.key)">{{ option.label }}</button>
      </div>
      <div class="evt-inventory-quality-sort" role="group" aria-label="品质内库存排序">
        <span>库存排序</span>
        <button v-for="option in inventoryQualitySortOptions" :key="option.key" type="button"
          class="evt-inventory-quality-sort-option" :aria-pressed="stockSort === option.key"
          @click="$emit('update:stockSort', option.key)">{{ option.label }}</button>
      </div>
    </template>
    <div v-if="items.length" class="evt-fruit-grid" role="list" :aria-label="label">
      <template v-for="(item, index) in items" :key="item.itemId ?? index">
        <div v-if="showQualityControls && (index === 0 || qualityOf(items[index - 1]) !== qualityOf(item))"
          class="evt-fruit-quality-heading" :class="`evt-fruit-tile--quality-${qualityOf(item)}`" role="presentation">
          <span>{{ qualityNames[qualityOf(item)] }}{{ qualityOf(item) ? '品质' : '' }}</span>
          <span class="evt-fruit-quality-count">{{ qualityCounts.get(qualityOf(item)) }} 种</span>
        </div>
        <div class="evt-fruit-tile" :class="`evt-fruit-tile--quality-${qualityOf(item)}`" role="listitem">
          <div class="evt-fruit-artwork">
            <FruitImage :fruit-id="item.itemId ?? 0" :size="72" />
            <span class="evt-fruit-quality">{{ qualityNames[qualityOf(item)] }}</span>
          </div>
          <div class="evt-fruit-caption">
            <span class="evt-fruit-name" :title="item.name">{{ item.name }}</span>
            <span class="evt-fruit-stock">库存 <b>{{ item.value }}</b></span>
          </div>
        </div>
      </template>
    </div>
    <div v-else class="evt-rank-empty">{{ emptyText }}</div>
  </div>
</template>

<script setup lang="ts">
import FruitImage from './FruitImage.vue'
import { computed } from 'vue'
import {
  inventoryQualityNames as qualityNames, inventoryQualityOf as qualityOf,
  inventoryQualityOptions, inventoryQualitySortOptions,
  type InventoryQualityFilter, type InventoryQualitySort,
} from '../utils/fruitInventoryQuality'

interface InventoryFruit {
  itemId?: number
  name: string
  value: string | number
  quality?: number
}
const props = withDefaults(defineProps<{
  items: InventoryFruit[]
  label?: string
  showQualityControls?: boolean
  quality?: InventoryQualityFilter
  stockSort?: InventoryQualitySort
  emptyText?: string
}>(), { label: '水果', quality: 'all', stockSort: 'stockDesc', emptyText: '暂无库存数据' })
defineEmits<{
  'update:quality': [value: InventoryQualityFilter]
  'update:stockSort': [value: InventoryQualitySort]
}>()
const qualityCounts = computed(() => {
  const counts = new Map<number, number>()
  if (props.showQualityControls) for (const item of props.items) {
    const quality = qualityOf(item)
    counts.set(quality, (counts.get(quality) ?? 0) + 1)
  }
  return counts
})
</script>

<style scoped>
.evt-fruit-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(108px,1fr)); gap:6px; padding:10px 14px 14px; }
.evt-inventory-quality, .evt-inventory-quality-sort { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 14px 2px; color:#6b7280; font-size:12px; }
.evt-inventory-quality > span, .evt-inventory-quality-sort > span { margin-right:2px; }
.evt-inventory-quality-option, .evt-inventory-quality-sort-option { border:1px solid #e5e7eb; border-radius:12px; padding:4px 12px; background:#fff; color:#6b7280; font-size:12px; cursor:pointer; white-space:nowrap; }
.evt-inventory-quality-option[aria-pressed="true"], .evt-inventory-quality-sort-option[aria-pressed="true"] { border-color:#c084fc; background:#f3e8ff; color:#7e22ce; font-weight:600; }
.evt-inventory-quality-option:focus-visible, .evt-inventory-quality-sort-option:focus-visible { outline:2px solid #9333ea; outline-offset:2px; }
.evt-fruit-quality-heading { --fruit-ink:#64748b; --fruit-bg:#f3f4f6; grid-column:1 / -1; display:flex; align-items:center; gap:8px; padding:7px 9px; margin-top:8px; border-radius:4px; background:var(--fruit-bg); color:var(--fruit-ink); font-size:12px; font-weight:600; }
.evt-fruit-quality-heading:first-child { margin-top:0; }
.evt-fruit-quality-count { color:#6b7280; font-size:11px; font-weight:400; }
.evt-rank-empty { padding:12px 14px; color:#9ca3af; font-size:12px; text-align:center; }
.evt-fruit-tile { --fruit-ink:#64748b; --fruit-bg:#f3f4f6; min-width:0; overflow:hidden; border:1px solid #e5e7eb; border-radius:6px; background:#fff; }
.evt-fruit-tile--quality-5 { --fruit-ink:#ad354d; --fruit-bg:#fff0f2; }
.evt-fruit-tile--quality-4 { --fruit-ink:#966313; --fruit-bg:#fff7dd; }
.evt-fruit-tile--quality-3 { --fruit-ink:#765299; --fruit-bg:#f5edff; }
.evt-fruit-tile--quality-2 { --fruit-ink:#226d99; --fruit-bg:#e9f5ff; }
.evt-fruit-tile--quality-1 { --fruit-ink:#48752d; --fruit-bg:#edf8e8; }
.evt-fruit-artwork { position:relative; display:grid; place-items:center; height:98px; padding-top:8px; box-sizing:border-box; background:var(--fruit-bg); }
.evt-fruit-quality { position:absolute; top:5px; left:6px; color:var(--fruit-ink); font-size:10px; line-height:1.2; }
.evt-fruit-caption { display:flex; flex-direction:column; align-items:center; gap:3px; padding:5px 3px 6px; }
.evt-fruit-name { display:block; max-width:100%; color:var(--fruit-ink); font-size:12px; font-weight:600; line-height:1.4; text-align:center; overflow-wrap:anywhere; }
.evt-fruit-stock { max-width:100%; color:#6b7280; font-size:11px; line-height:1.3; text-align:center; overflow-wrap:anywhere; }
.evt-fruit-stock b { color:#374151; font-weight:600; font-variant-numeric:tabular-nums; }
@media (max-width:640px) {
  .evt-fruit-grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:5px; padding:8px 8px 12px; }
  .evt-fruit-artwork { height:92px; }
}
@media (max-width:359px) {
  .evt-fruit-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
</style>
