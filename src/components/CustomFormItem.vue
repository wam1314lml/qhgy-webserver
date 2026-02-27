<script setup lang="ts">
import { Form, Tooltip } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  label?: string
  tooltip?: string
  [key: string]: any
}

const props = defineProps<Props>()

// 过滤掉 label 和 tooltip，其他属性传给 Form.Item
const formItemProps = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { label, tooltip, ...rest } = props
  return rest
})

// 判断是否为移动设备
const isMobile = () => {
  // 方法1: 检测触摸事件支持
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  // 方法2: 检测屏幕宽度
  const isSmallScreen = window.innerWidth <= 768
  // 综合判断
  return hasTouchScreen || isSmallScreen
}

// 根据设备类型动态设置 trigger
const tooltipTrigger = computed<('click' | 'hover' | 'focus' | 'contextmenu')[]>(() => {
  return isMobile() ? ['click'] : ['hover']
})

// 阻止点击事件冒泡，避免触发下面的控件
const handleTooltipClick = (e: Event) => {
  e.stopPropagation()
}
</script>

<template>
  <Form.Item v-bind="{ ...formItemProps, ...$attrs }" class="custom-form-item">
    <!-- 自定义 label 插槽 -->
    <template #label>
      <span class="custom-label-wrapper">
        <span class="label-text">{{ props.label }}</span>
        <Tooltip
          v-if="props.tooltip"
          placement="top"
          :title="props.tooltip"
          :trigger="tooltipTrigger"
        >
          <QuestionCircleOutlined class="tooltip-icon" @click="handleTooltipClick" />
        </Tooltip>
      </span>
    </template>

    <slot></slot>
  </Form.Item>
</template>

<style lang="scss">
.custom-form-item {
  .ant-form-item-label {
    pointer-events: none;
  }
  .custom-label-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    .tooltip-icon {
      // 确保 tooltip 图标可以点击
      pointer-events: auto;
      color: rgba(0, 0, 0, 0.45);
      font-size: 14px;

      &:hover {
        color: rgba(0, 0, 0, 0.75);
      }
    }
  }
}
</style>
