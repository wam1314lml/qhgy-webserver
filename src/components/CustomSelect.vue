<template>
  <a-select
    v-bind="$attrs"
    v-model:value="modelValue"
    :class="className"
    class="custom-select"
    showArrow
  >
    <!-- 全选选项 -->
    <a-select-option
      v-if="showSelectAll && isMultipleMode"
      :value="SELECT_ALL_VALUE"
      style="font-weight: 600; border-bottom: 1px solid #f0f0f0"
    >
      <span style="color: #1890ff">
        {{ isAllSelected ? '取消全选' : '全选' }}
      </span>
    </a-select-option>
    <!-- 渲染选项列表 -->
    <a-select-option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </a-select-option>
  </a-select>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

// 选项类型定义
interface SelectOption {
  label: string
  value: any
  disabled?: boolean
}

// 全选选项的特殊值
const SELECT_ALL_VALUE = '__SELECT_ALL__'

// 定义 props
const props = withDefaults(
  defineProps<{
    value?: any
    options?: SelectOption[] // 选项列表
    showSelectAll?: boolean // 是否启用全选功能
    className?: string
  }>(),
  {
    className: 'w-42! sm:w-48!',
  },
)

// 定义 emits
const emit = defineEmits<{
  'update:value': [value: any]
}>()

const attrs = useAttrs()

// 判断是否为多选模式
const isMultipleMode = computed(() => {
  return attrs.mode === 'multiple' || attrs.mode === 'tags'
})

// 获取所有可选项的值（排除禁用项）
const getAllOptionValues = computed(() => {
  if (!props.options) return []
  return props.options.filter((opt) => !opt.disabled).map((opt) => opt.value)
})

// 判断是否已全选
const isAllSelected = computed(() => {
  if (!isMultipleMode.value || !props.value) return false
  const currentValues = Array.isArray(props.value) ? props.value : []
  const allValues = getAllOptionValues.value
  if (allValues.length === 0) return false
  return allValues.every((v) => currentValues.includes(v))
})

// 计算属性用于双向绑定
const modelValue = computed({
  get: () => props.value,
  set: (val) => {
    // 处理全选逻辑
    if (isMultipleMode.value && Array.isArray(val) && val.includes(SELECT_ALL_VALUE)) {
      const allValues = getAllOptionValues.value

      // 如果已经全选，则取消全选
      if (isAllSelected.value) {
        emit('update:value', [])
      } else {
        // 否则选择全部
        emit('update:value', [...allValues])
      }
    } else {
      emit('update:value', val)
    }
  },
})
</script>

<style lang="scss">
/* 可以在这里添加自定义样式 */
.custom-select {
  .ant-select-arrow {
    color: black;
    text-shadow: 0 0 10px #333;
  }
}
</style>
