<template>
  <div class="evt-fruit-grid" role="list" :aria-label="label">
    <div v-for="(item, index) in items" :key="item.itemId ?? index"
      class="evt-fruit-tile" :class="`evt-fruit-tile--quality-${qualityOf(item)}`" role="listitem">
      <div class="evt-fruit-artwork">
        <FruitImage :fruit-id="item.itemId ?? 0" :size="72" />
        <span class="evt-fruit-quality">{{ qualityNames[qualityOf(item)] }}</span>
      </div>
      <div class="evt-fruit-caption">
        <span class="evt-fruit-name" :title="item.name">{{ item.name }}</span>
        <span class="evt-fruit-stock">库存 <b>{{ item.value }}</b></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FruitImage from './FruitImage.vue'

interface InventoryFruit {
  itemId?: number
  name: string
  value: string | number
  quality?: number
}
defineProps<{ items: InventoryFruit[]; label: string }>()

const qualityNames = ['未知品质', '绿色', '蓝色', '紫色', '金色', '红色']
const qualityOf = (item: InventoryFruit) => {
  const quality = Number(item.quality)
  return Number.isInteger(quality) && quality >= 1 && quality <= 5 ? quality : 0
}
</script>

<style scoped>
.evt-fruit-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(108px,1fr)); gap:6px; padding:10px 14px 14px; }
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
