<template>
  <a-table
    v-bind="$attrs"
    :scroll="computedScroll"
  >
    <!-- 透传所有插槽 -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </a-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableProps } from 'ant-design-vue'

// 定义 props，使用 TableProps 类型，但让所有属性都是可选的
interface Props {
  scroll?: TableProps['scroll']
}

const props = withDefaults(defineProps<Props>(), {
  scroll: undefined,
})

const attrs = useAttrs()

// 计算 scroll 属性：如果用户传入了 scroll，使用用户的；否则使用默认值
const computedScroll = computed(() => {
  // 如果用户显式传入了 scroll（包括通过 v-bind 或 $attrs），使用用户的值
  if (props.scroll !== undefined) {
    return props.scroll
  }
  
  // 如果 attrs 中有 scroll，使用 attrs 中的值
  if (attrs.scroll !== undefined) {
    return attrs.scroll as TableProps['scroll']
  }
  
  // 否则使用默认值：横向滚动
  return { x: 'max-content' }
})
</script>

<script lang="ts">
import { defineComponent, useAttrs } from 'vue'

export default defineComponent({
  name: 'CustomTable',
  inheritAttrs: false, // 不自动继承属性，我们手动通过 v-bind="$attrs" 传递
})
</script>

