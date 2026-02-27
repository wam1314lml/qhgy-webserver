<template>
  <a-input-number
    v-bind="$attrs"
    v-model:value="modelValue"
    @blur="handleBlur"
    class="w-42! sm:w-48!"
  >
    <!-- 支持插槽透传 -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </a-input-number>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 定义 props
const props = defineProps<{
  value?: number | null
}>()

// 定义 emits
const emit = defineEmits<{
  'update:value': [value: number | null | undefined]
  blur: []
}>()

// 计算属性用于双向绑定
const modelValue = computed({
  get: () => props.value,
  set: (val) => {
    emit('update:value', val)
  },
})

const handleBlur = () => {
  if (props.value === null || props.value === undefined) {
    emit('update:value', 0)
  }
  emit('blur')
}
</script>
