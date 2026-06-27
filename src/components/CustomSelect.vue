<template>
  <a-select
    v-bind="$attrs"
    v-model:value="modelValue"
    :options="selectOptions"
    :filter-option="filterOption"
    :class="className"
    class="custom-select"
    showArrow
  />
</template>

<script setup lang="ts">
import { computed, useAttrs, watch } from 'vue'
import {
  isSameSelectValue,
  normalizeSelectValue,
} from '../utils/selectDefaults'

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

const selectOptions = computed(() => {
  const options = props.options ?? []

  if (!props.showSelectAll || !isMultipleMode.value) {
    return options
  }

  return [
    {
      label: isAllSelected.value ? '取消全选' : '全选',
      value: SELECT_ALL_VALUE,
    },
    ...options,
  ]
})

const filterOption = (input: string, option?: SelectOption) => {
  const keyword = input.trim().toLowerCase()
  if (!keyword) return true

  return String(option?.label ?? '').toLowerCase().includes(keyword)
}

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
        const next = normalizeSelectValue([], props.options, true)
        emit('update:value', next)
      } else {
        // 否则选择全部
        emit('update:value', [...allValues])
      }
      return
    }

    const next = normalizeSelectValue(val, props.options, isMultipleMode.value)
    emit('update:value', next)
  },
})

watch(
  [() => props.value, () => props.options, isMultipleMode],
  () => {
    const next = normalizeSelectValue(props.value, props.options, isMultipleMode.value)
    if (!isSameSelectValue(props.value, next)) {
      emit('update:value', next)
    }
  },
  { immediate: true, deep: true },
)
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
