<template>
  <div class="transfer-box">
    <h3 v-if="title">{{ title }}</h3>
    <div class="transfer-container">
      <!-- 左侧数据列表 -->
      <div class="transfer-panel left-panel">
        <div class="panel-header">
          <span>可选项 ({{ totalLeftCount }})</span>
        </div>
        <div class="panel-content">
          <div v-if="totalLeftCount === 0" class="empty-state">暂无可选数据</div>

          <!-- 树形结构展示 -->
          <div v-if="isTreeData" class="tree-container">
            <a-collapse v-model:activeKey="activeKeys" ghost>
              <a-collapse-panel
                v-for="[groupName, items] in Object.entries(groupedLeftData)"
                :key="groupName"
                :header="groupName"
              >
                <div
                  v-for="item in items"
                  :key="getItemKey(item)"
                  class="transfer-item"
                  @click.stop="selectItem(item, 'left')"
                  :class="{ selected: selectedLeft.has(getItemKey(item)) }"
                >
                  <div class="item-content">
                    <span class="item-name">{{ getItemDisplay(item) }}</span>
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>
          </div>

          <!-- 平铺结构展示（兼容旧版本） -->
          <div v-else>
            <div
              v-for="item in leftData"
              :key="getItemKey(item)"
              class="transfer-item"
              @click="selectItem(item, 'left')"
              :class="{ selected: selectedLeft.has(getItemKey(item)) }"
            >
              <div class="item-content">
                <span class="item-name">{{ getItemDisplay(item) }}</span>
                <span v-if="getItemGroup(item)" class="item-group">{{ getItemGroup(item) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间操作按钮 -->
      <div class="transfer-actions">
        <button
          class="action-btn"
          @click="moveToRight"
          :disabled="selectedLeft.size === 0"
          title="移动到右侧"
        >
          →
        </button>
        <button
          class="action-btn"
          @click="moveToLeft"
          :disabled="selectedRight.size === 0"
          title="移动到左侧"
        >
          ←
        </button>
      </div>

      <!-- 右侧数据列表 -->
      <div class="transfer-panel right-panel">
        <div class="panel-header">
          <span>已选项 ({{ value.length }})</span>
        </div>
        <div class="panel-content">
          <div v-if="value.length === 0" class="empty-state">暂无已选数据</div>
          <VueDraggable
            v-else
            :model-value="value"
            @update:model-value="onDragEnd"
            :options="dragOptions"
            class="draggable-list"
            item-key="getItemKey"
            handle=".drag-handle"
          >
            <template #item="{ element: item }">
              <div
                :key="getItemKey(item)"
                class="transfer-item draggable-item"
                :class="[
                  { selected: selectedRight.has(getItemKey(item)) },
                  !props.disabled ? 'cursor-move hover:bg-gray-50' : 'cursor-default',
                ]"
                @click="selectItem(item, 'right')"
              >
                <!-- 拖拽指示器 -->
                <div class="drag-handle" v-if="!props.disabled">
                  <HolderOutlined class="drag-icon" />
                </div>
                <div class="item-content">
                  <span class="item-name">{{ getItemDisplay(item) }}</span>
                  <span v-if="getItemGroup(item)" class="item-group">{{ getItemGroup(item) }}</span>
                </div>
              </div>
            </template>
          </VueDraggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed } from 'vue'
import VueDraggable from 'vuedraggable'
import { HolderOutlined } from '@ant-design/icons-vue'

interface Props {
  // 组件属性数据
  title?: string
  disabled?: boolean
  // 数据源（左侧可选数据）- 支持数组或树形结构
  dataSource?: T[] | Record<string, T[]>
  // 显示字段名
  displayField?: string
  // 唯一标识字段名
  keyField?: string
  // 分组字段名（当dataSource为树形结构时使用）
  groupField?: string
  // 其他属性数据
  [key: string]: any
}

// 定义泛型props和emits
const props = withDefaults(
  defineProps<
    Props & {
      // 绑定的value值，类型为T[]（右侧已选数据）
      value: T[]
    }
  >(),
  {
    title: '',
    disabled: false,
    dataSource: () => [] as T[],
    displayField: 'name',
    keyField: 'id',
    groupField: 'group',
    value: () => [] as T[],
  },
)

// 定义emits用于双向绑定
const emit = defineEmits<{
  'update:value': [value: T[]]
}>()

// 选中状态管理
const selectedLeft = ref<Set<string>>(new Set())
const selectedRight = ref<Set<string>>(new Set())

// 折叠面板活跃的key
const activeKeys = ref<string[]>([])

// 判断是否为树形数据结构
const isTreeData = computed(() => {
  return !Array.isArray(props.dataSource) && typeof props.dataSource === 'object'
})

// 获取项目唯一标识
const getItemKey = (item: T): string => {
  if (typeof item === 'object' && item !== null) {
    const key = (item as any)[props.keyField]
    return String(key)
  }
  return String(item)
}

// 获取项目显示内容
const getItemDisplay = (item: T): string => {
  if (typeof item === 'object' && item !== null) {
    const display = (item as any)[props.displayField]
    return String(display)
  }
  return String(item)
}

// 获取项目分组
const getItemGroup = (item: T): string => {
  if (typeof item === 'object' && item !== null && props.groupField) {
    const group = (item as any)[props.groupField]
    return String(group || '')
  }
  return ''
}

// 将数据源转换为统一格式
const flattenedData = computed(() => {
  if (!props.dataSource) return []

  // 如果是数组格式，直接返回
  if (Array.isArray(props.dataSource)) {
    return props.dataSource
  }

  // 如果是树形结构，将其转换为平铺数组
  const result: T[] = []
  Object.entries(props.dataSource).forEach(([, items]) => {
    if (Array.isArray(items)) {
      result.push(...items)
    }
  })
  return result
})

// 计算左侧数据（排除已选中的）
const leftData = computed(() => {
  const selectedKeys = new Set(props.value.map(getItemKey))
  return flattenedData.value.filter((item) => !selectedKeys.has(getItemKey(item)))
})

// 树形结构的分组左侧数据（排除已选中的）
const groupedLeftData = computed(() => {
  if (!isTreeData.value || !props.dataSource) return {}

  const selectedKeys = new Set(props.value.map(getItemKey))
  const result: Record<string, T[]> = {}

  Object.entries(props.dataSource as Record<string, T[]>).forEach(([groupName, items]) => {
    if (Array.isArray(items)) {
      const filteredItems = items.filter((item) => !selectedKeys.has(getItemKey(item)))
      if (filteredItems.length > 0) {
        result[groupName] = filteredItems
      }
    }
  })

  return result
})

// 左侧数据总数
const totalLeftCount = computed(() => {
  if (isTreeData.value) {
    return Object.values(groupedLeftData.value).reduce((total, items) => total + items.length, 0)
  }
  return leftData.value.length
})

// 选择项目
const selectItem = (item: T, side: 'left' | 'right') => {
  const key = getItemKey(item)
  if (side === 'left') {
    if (selectedLeft.value.has(key)) {
      selectedLeft.value.delete(key)
    } else {
      selectedLeft.value.add(key)
    }
  } else {
    if (selectedRight.value.has(key)) {
      selectedRight.value.delete(key)
    } else {
      selectedRight.value.add(key)
    }
  }
}

// 移动到右侧
const moveToRight = () => {
  let itemsToMove: T[] = []

  if (isTreeData.value) {
    // 树形结构数据的处理
    Object.values(groupedLeftData.value).forEach((items) => {
      const selectedItems = items.filter((item) => selectedLeft.value.has(getItemKey(item)))
      itemsToMove.push(...selectedItems)
    })
  } else {
    // 平铺数据的处理
    itemsToMove = leftData.value.filter((item) => selectedLeft.value.has(getItemKey(item)))
  }

  const newValue = [...props.value, ...itemsToMove]
  emit('update:value', newValue)
  selectedLeft.value.clear()
}

// 移动到左侧
const moveToLeft = () => {
  const newValue = props.value.filter((item) => !selectedRight.value.has(getItemKey(item)))
  emit('update:value', newValue)
  selectedRight.value.clear()
}

// 拖拽配置选项 - 针对移动端优化
const dragOptions = computed(() => ({
  animation: 200,
  ghostClass: 'ghost-item',
  dragClass: 'drag-item',
  handle: '.drag-handle', // 只使用拖拽句柄，避免与滚动手势冲突
  disabled: props.disabled,
  // 移动端优化配置
  touchStartThreshold: 5, // 增加触摸阈值，减少误触
  delay: 150, // 增加延迟，给滚动更多时间
  delayOnTouchStart: true,
  forceFallback: false,
  fallbackOnBody: true,
  swapThreshold: 0.65,
  // 确保拖拽不干扰滚动
  preventOnFilter: false,
  filter: '.item-content', // 内容区域不触发拖拽
}))

// 处理拖拽结束事件
const onDragEnd = (newOrder: T[]) => {
  emit('update:value', newOrder)
  // 清除右侧选中状态，避免拖拽后出现异常选中
  selectedRight.value.clear()
}
</script>

<style lang="scss">
.transfer-box {
  margin-bottom: 16px;

  h3 {
    margin: 0 0 16px 0;
    color: #333;
    font-size: 16px;
    font-weight: 500;
  }

  .transfer-container {
    display: flex;
    align-items: stretch;
    min-height: 320px;
  }

  .transfer-panel {
    flex: 1;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #d9d9d9;
    font-size: 14px;
    color: #666;
    border-radius: 6px 6px 0 0;
  }

  .panel-content {
    flex: 1;
    max-height: 388px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* iOS 原生滚动 */
    overscroll-behavior-y: contain; /* 防止滚动穿透 */

    // 滚动条样式
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;

      &:hover {
        background: #a8a8a8;
      }
    }
  }

  .empty-state {
    text-align: center;
    color: #999;
    padding: 60px 20px;
    font-size: 14px;
  }

  .transfer-item {
    padding: 8px 0 8px 12px;
    margin-bottom: 4px;
    cursor: pointer;
    border-radius: 4px;
    user-select: none;
    border: 1px solid transparent;

    &:hover {
      background-color: #f5f5f5;
      border-color: #d9d9d9;
    }

    &.selected {
      background-color: #e6f7ff;
      border-color: #91d5ff;
      color: #1890ff;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  .item-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .item-name {
    font-size: 14px;
    font-weight: 500;
    color: inherit;
  }

  .item-group {
    font-size: 11px;
    color: #999;
    font-weight: 400;
  }

  .transfer-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: center;
    align-items: center;
    min-width: 50px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #d9d9d9;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      color: #1890ff;
      border-color: #91d5ff;
      background-color: #f0f8ff;
    }

    &:disabled {
      color: #ccc;
      cursor: not-allowed;
      background-color: #f5f5f5;
    }
  }

  // 树形结构样式
  .tree-container {
    padding: 0;

    .ant-collapse {
      border: none;
      background: transparent;
    }

    .ant-collapse-item {
      border: none;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 4px;

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
    }

    .ant-collapse-header {
      padding: 8px 12px !important;
      font-weight: 500;
      color: #333;
      background-color: #fafafa;
      border-radius: 4px;

      &:hover {
        background-color: #f5f5f5;
      }
    }

    .ant-collapse-content {
      border: none;
      background: transparent;
    }

    .ant-collapse-content-box {
      padding: 4px 8px 8px 8px;
    }

    // 折叠面板内的传输项样式调整
    .transfer-item {
      margin-left: 12px;
    }
  }

  // 拖拽相关样式
  .draggable-list {
    min-height: 20px;
  }

  .draggable-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
    touch-action: pan-y; /* 允许垂直滚动，但限制其他手势以支持拖拽 */

    .item-content {
      flex: 1;
      min-width: 0; /* 防止内容溢出 */
    }
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    cursor: grab;
    opacity: 0.6;
    transition: opacity 0.2s ease;
    flex-shrink: 0;
    touch-action: none; /* 拖拽句柄禁用所有手势，专用于拖拽 */

    &:hover {
      opacity: 1;
    }

    &:active {
      cursor: grabbing;
    }

    &:focus {
      outline: 2px solid #1890ff;
      outline-offset: 2px;
      border-radius: 4px;
    }
  }

  .drag-icon {
    color: #999;
    font-size: 16px;
    line-height: 1;
    user-select: none;
  }

  // 拖拽状态样式
  .ghost-item {
    opacity: 0.4;
    background: #f0f8ff !important;
    border: 2px dashed #91d5ff !important;
    transform: rotate(2deg);
  }

  .sortable-chosen {
    opacity: 0.3;
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
    border-color: #1890ff !important;
    background: #e6f7ff !important;
    z-index: 1000;
  }

  .drag-item {
    opacity: 0.9;
    transform: rotate(-2deg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  // 移动端优化
  @media (max-width: 768px) {
    .drag-handle {
      padding: 8px;
      opacity: 0.8;
    }

    .draggable-item {
      padding: 8px 4px 8px 8px;
      min-height: 48px; /* 增加触摸目标大小 */
    }

    .sortable-chosen {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(24, 144, 255, 0.4);
    }
  }

  // 触摸设备优化
  @media (hover: none) and (pointer: coarse) {
    .drag-handle {
      opacity: 1;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      margin-right: 4px;
    }

    .draggable-item:active {
      background-color: #f0f8ff;
      border-color: #91d5ff;
    }
  }

  // 高对比度模式
  @media (prefers-contrast: high) {
    .ghost-item {
      border: 3px dashed #000 !important;
      background: #fff !important;
    }

    .sortable-chosen {
      border: 2px solid #000 !important;
      background: #e6f7ff !important;
    }
  }
}
</style>
