<script setup lang="ts">
import { computed } from 'vue'
import { Switch } from 'ant-design-vue'
import CustomFormItem from '../../components/CustomFormItem.vue'
import CustomSelect from '../../components/CustomSelect.vue'
import CustomInputNumber from '../../components/CustomInputNumber.vue'
import { getActivityShopOptions, normalizeShopConfig, type ActivityShopConfig, type ActivityShopCatalog } from './activityShop'

const props = defineProps<{ modelValue: ActivityShopConfig; catalog: ActivityShopCatalog; configPath: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: ActivityShopConfig] }>()
const options = computed(() => getActivityShopOptions(props.catalog))
function update(key: keyof ActivityShopConfig, value: unknown) {
  emit('update:modelValue', normalizeShopConfig({ ...props.modelValue, [key]: value }, props.catalog.items, props.catalog.defaultShopItemId))
}
</script>

<template>
  <CustomFormItem :label="`活动结束前清空${catalog.currencyName}兑换`" :name="`${configPath}.enabled`">
    <Switch :checked="modelValue.enabled" @update:checked="update('enabled', $event)" />
  </CustomFormItem>
  <template v-if="modelValue.enabled">
    <CustomFormItem label="提前清仓（分钟）" :name="`${configPath}.beforeEndMinutes`">
      <CustomInputNumber :value="modelValue.beforeEndMinutes" :min="1" :max="1440" :precision="0"
        class="w-42! sm:w-48!" @update:value="update('beforeEndMinutes', $event)" />
    </CustomFormItem>
    <CustomFormItem label="兑换商品" :name="`${configPath}.shopItemId`">
      <CustomSelect :value="modelValue.shopItemId" :options="options" class="w-64! sm:w-80!"
        @update:value="update('shopItemId', $event)" />
    </CustomFormItem>
    <p class="activity-shop-help">
      按服务器活动结束时间倒推，尽量将{{ catalog.currencyName }}兑换为所选商品。
      <template v-if="catalog.fallbackShopItemId != null">余额不足所选商品一组时转兑金币，仍不足兑换的余额保留。</template>
      <template v-else>余额不足一组时停止，剩余兑换币保留。</template>
      仅消耗金丝绣线，不消耗勾玉。请保持账号运行，脚本将在设置时间内检查兑换。
    </p>
  </template>
</template>

<style scoped>
.activity-shop-help { margin: 0 0 16px; padding-left: 24px; font-size: 13px; line-height: 1.8; color: var(--text-secondary, #666); }
</style>
