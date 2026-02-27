<template>
  <div class="shopping-component">
    <!-- 使用穿梭框组件选择商店物品 -->
    <TransferBox
      v-model:value="selectedItems"
      title="商店购物"
      :data-source="treeData"
      key-field="id"
      display-field="name"
      group-field="group"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TransferBox from './TransferBox.vue'
import { treeData } from '../assets/mallData'

// 定义数据类型
interface MallItem {
  id: number
  name: string
  group: string
}

// 定义 mall 配置的类型
interface MallConfig {
  buyGoodLists: number[]
  popupGoodLists: number[]
}

// 定义 props
const props = defineProps<{
  value?: MallConfig
}>()

// 定义 emits
const emit = defineEmits<{
  'update:value': [value: MallConfig]
}>()

// 将分组对象转换为平铺数组，以便进行过滤
const flattenedData = Object.values(treeData as Record<string, MallItem[]>).flat()

// 根据传入的 value 初始化选中的商品
const selectedItems = computed({
  get: () => {
    if (!props.value?.buyGoodLists) return []

    // 保持排序：根据 buyGoodLists 的顺序重新排列商品
    const itemMap = new Map(flattenedData.map((item: MallItem) => [item.id, item]))
    return props.value.buyGoodLists
      .map((id: number) => itemMap.get(id))
      .filter((item): item is MallItem => item !== undefined)
  },
  set: (newItems: MallItem[]) => {
    // 当选中项发生变化时，更新 buyGoodLists，保持传入的排序
    const newConfig: MallConfig = {
      buyGoodLists: newItems.map((item) => item.id),
      popupGoodLists: props.value?.popupGoodLists || [],
    }
    emit('update:value', newConfig)
  },
})
</script>

<style scoped>
.shopping-component {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
