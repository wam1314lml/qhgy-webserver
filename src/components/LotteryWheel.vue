<template>
  <div class="lottery-wheel-container">
    <div class="wheel-wrapper">
      <!-- 转盘 -->
      <div class="wheel" :style="{ transform: `rotate(${rotation}deg)` }">
        <div
          v-for="(prize, index) in prizes"
          :key="index"
          class="prize-sector"
          :style="getSectorStyle(index)"
        >
          <div class="prize-content">
            <div class="prize-name">{{ prize.prize_name }}</div>
          </div>
        </div>
      </div>

      <!-- 中心指针 -->
      <div class="center-pointer">
        <div class="pointer-arrow"></div>
      </div>

      <!-- 抽奖按钮 -->
      <div
        class="draw-button"
        @click="handleDraw"
        :class="{ spinning: spinning, disabled: !canDraw }"
      >
        <span v-if="!spinning">{{ buttonText }}</span>
        <span v-else>抽奖中...</span>
      </div>
    </div>

    <!-- 结果弹窗 -->
    <a-modal
      v-model:open="showResult"
      title="恭喜获得"
      :footer="null"
      centered
      @cancel="handleResultClose"
    >
      <div class="result-content">
        <div class="result-icon">🎉</div>
        <div class="result-prize-name">{{ wonPrize?.name }}</div>
        <div class="result-prize-detail">
          <span v-if="wonPrize?.type === 'time'">游戏时长 +{{ wonPrize.value }}小时</span>
          <span v-else-if="wonPrize?.type === 'points'">点数 +{{ wonPrize.value }}</span>
          <span v-else>{{ wonPrize?.value }}</span>
        </div>
      </div>
      <div class="result-actions">
        <a-button type="primary" block @click="handleResultClose">确定</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import { message } from 'ant-design-vue'

interface Prize {
  id: number
  prize_name: string
  reward_type: string
  reward_value: string
  probability: string
}

interface WonPrize {
  name: string
  type: string
  value: string
}

const props = defineProps<{
  prizes: Prize[]
  canDraw: boolean
  buttonText?: string
}>()

const emit = defineEmits<{
  draw: []
  confirm: [prize: WonPrize | null]
}>()

const rotation = ref(0)
const spinning = ref(false)
const showResult = ref(false)
const wonPrize = ref<WonPrize | null>(null)

// 计算每个扇形的样式
const getSectorStyle = (index: number) => {
  const totalPrizes = props.prizes.length
  const angle = 360 / totalPrizes
  const startAngle = angle * index

  // 准备12种不同的颜色，确保每个奖品颜色都不同
  const colors = [
    '#ff6b6b', // 红色
    '#feca57', // 黄色
    '#48dbfb', // 天蓝色
    '#ff9ff3', // 粉色
    '#54a0ff', // 蓝色
    '#5f27cd', // 紫色
    '#1dd1a1', // 青绿色
    '#ee5a6f', // 玫瑰红
    '#ff9f43', // 橙色
    '#00d2d3', // 青色
    '#9980fa', // 淡紫色
    '#26de81', // 绿色
  ]
  const color = colors[index % colors.length]

  return {
    transform: `rotate(${startAngle}deg)`,
    background: color,
    '--sector-angle': `${angle}deg`,
  }
}

// 处理抽奖
const handleDraw = () => {
  if (!props.canDraw || spinning.value) {
    return
  }

  spinning.value = true
  emit('draw')
}

// 开始旋转动画
const startSpin = (prizeIndex: number, prize: WonPrize) => {
  const totalPrizes = props.prizes.length
  const angle = 360 / totalPrizes

  // 计算目标位置（相对于0度的位置）
  const targetPosition = 360 - (angle * prizeIndex + angle / 2)

  // 基于当前旋转值计算下一个目标角度，确保总是正向旋转且至少转5圈
  const currentRotation = rotation.value % 360
  const additionalRotation = 360 * 5 // 至少转5圈
  const nextTarget = rotation.value - currentRotation + targetPosition + additionalRotation

  rotation.value = nextTarget
  wonPrize.value = prize

  // 3秒后显示结果
  setTimeout(() => {
    spinning.value = false
    showResult.value = true
  }, 3000)
}

// 关闭结果弹窗
const handleResultClose = () => {
  showResult.value = false
  // 发出确认事件，传递奖品信息
  // emit('confirm', wonPrize.value)
  wonPrize.value = null
}

// 暴露方法供父组件调用
defineExpose({
  startSpin,
})
</script>

<style scoped>
.lottery-wheel-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.wheel-wrapper {
  position: relative;
  width: 400px;
  height: 400px;
}

.wheel {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  transition: transform 3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.prize-sector {
  position: absolute;
  width: 50%;
  height: 50%;
  top: 0;
  left: 50%;
  transform-origin: 0% 100%;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 30px;
}

.prize-content {
  transform: rotate(calc(var(--sector-angle) / 2));
  text-align: center;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.prize-name {
  font-size: 14px;
  word-break: break-all;
  max-width: 80px;
}

.center-pointer {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.pointer-arrow {
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-top: 30px solid #e74c3c;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.draw-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
  z-index: 20;
  user-select: none;
}

.draw-button:hover:not(.disabled):not(.spinning) {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.draw-button.spinning {
  cursor: not-allowed;
  opacity: 0.8;
}

.draw-button.disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background: #95a5a6;
}

.result-content {
  text-align: center;
  padding: 30px 20px;
}

.result-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.result-prize-name {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
}

.result-prize-detail {
  font-size: 18px;
  color: #7f8c8d;
}

.result-actions {
  padding: 0 20px 20px;
}

@media (max-width: 768px) {
  .wheel-wrapper {
    width: 100%;
    max-width: 300px;
    height: auto;
    aspect-ratio: 1 / 1;
  }

  .draw-button {
    width: 80px;
    height: 80px;
    font-size: 16px;
  }

  .prize-name {
    font-size: 12px;
    max-width: 60px;
  }
}
</style>
