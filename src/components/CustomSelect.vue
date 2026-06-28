<template>
  <a-select
    v-bind="$attrs"
    v-model:value="modelValue"
    :options="selectOptions"
    :filter-option="filterOption"
    :class="resolvedClassName"
    :dropdown-match-select-width="!wide"
    :popup-class-name="wide ? 'custom-select-dropdown--wide' : undefined"
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
    wide?: boolean // 宽选项：占满容器并完整展示长文本
  }>(),
  {
    className: 'w-42! sm:w-48!',
    wide: false,
  },
)

const resolvedClassName = computed(() => {
  if (props.wide) return 'custom-select--wide w-full!'
  return props.className
})

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
.custom-select {
  .ant-select-arrow {
    color: black;
    text-shadow: 0 0 10px #333;
  }
}

.custom-select--wide {
  width: 100%;
  max-width: 100%;
  min-width: 0;

  .ant-select-selector {
    height: auto !important;
    min-height: 32px;
  }

  &.ant-select-multiple .ant-select-selection-overflow {
    flex-wrap: wrap;
    max-width: 100%;
  }

  &.ant-select-multiple .ant-select-selection-overflow-item {
    flex: none;
    max-width: 100%;
  }

  .ant-select-selection-item {
    max-width: 100%;
    height: auto;
    line-height: 1.4;
    white-space: normal;
    word-break: break-all;
  }

  .ant-select-selection-item-content {
    white-space: normal;
    word-break: break-all;
  }

  .ant-select-selection-search {
    max-width: 100%;
    margin-inline-start: 0;
  }
}
</style>

<style lang="scss">
.custom-select-dropdown--wide {
  min-width: min(100vw - 32px, 480px) !important;

  .ant-select-item-option-content {
    overflow: visible;
    text-overflow: unset;
    white-space: normal;
    word-break: break-all;
  }
}
</style>
