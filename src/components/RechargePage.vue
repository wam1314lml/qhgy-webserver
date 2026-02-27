<template>
  <div class="recharge-page">
    <div class="recharge-header">
      <div class="balance-card">
        <div class="balance-info">
          <span class="balance-label">当前点数</span>
          <div class="balance-amount">
            <span class="currency">💎</span>
            <span class="amount">{{ balance }}</span>
            <span class="unit">点</span>
          </div>
        </div>
        <div class="balance-icon">⚡</div>
      </div>
    </div>

    <div class="recharge-content">
      <div class="section-title">
        <h3>选择充值点数</h3>
        <p>充值点数用于运行和各种功能服务</p>
      </div>

      <div class="recharge-options">
        <div
          v-for="option in rechargeOptions"
          :key="option.amount"
          :class="[
            'recharge-option',
            { selected: selectedAmount === option.amount },
            { popular: option.popular },
          ]"
          @click="selectedAmount = option.amount"
        >
          <div v-if="option.popular" class="popular-badge">推荐</div>
          <div class="option-amount">{{ option.label }}</div>
          <div v-if="option.bonus > 0" class="option-bonus">送{{ option.bonus }}点</div>
          <div class="option-total">实得: {{ option.amount + option.bonus }}点</div>
        </div>
      </div>

      <div class="custom-amount">
        <label>自定义点数</label>
        <div class="custom-input">
          <span class="currency-symbol">💎</span>
          <input type="number" placeholder="输入点数" min="10" max="50000" v-model="customAmount" />
        </div>
      </div>

      <div class="recharge-actions">
        <a-button
          class="recharge-button"
          @click="handleRecharge"
          :disabled="loading || selectedAmount <= 0"
        >
          <div v-if="loading" class="loading-spinner">
            <div class="spinner"></div>
            <span>处理中...</span>
          </div>
          <template v-else>
            <span>立即充值</span>
            <span v-if="selectedAmount > 0" class="button-amount">{{ selectedAmount }}点</span>
          </template>
        </a-button>
      </div>

      <div class="recharge-notice">
        <div class="notice-item">
          <span class="notice-icon">🔒</span>
          <span>支付安全，资金有保障</span>
        </div>
        <div class="notice-item">
          <span class="notice-icon">⚡</span>
          <span>充值即时到账</span>
        </div>
        <div class="notice-item">
          <span class="notice-icon">🎁</span>
          <span>充值点数满额享受额外赠送</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import axios from '../utils/axios'
import { message } from 'ant-design-vue'
import { updateUserBalance } from '../utils/userUtils'

interface Props {
  user: any
  token: string
  onPointsUpdate?: (points: number) => void
}

const props = defineProps<Props>()
const emit = defineEmits<{
  pointsUpdate: [points: number]
}>()

const balance = ref<number>(props.user?.points || 0)
const loading = ref(false)
const selectedAmount = ref<number>(0)
const customAmount = ref<number | ''>('')

const rechargeOptions = [
  { amount: 100, bonus: 0, label: '100点', popular: false },
  { amount: 300, bonus: 50, label: '300点', popular: false },
  { amount: 500, bonus: 100, label: '500点', popular: true },
  { amount: 1000, bonus: 250, label: '1000点', popular: false },
  { amount: 2000, bonus: 600, label: '2000点', popular: false },
  { amount: 5000, bonus: 2000, label: '5000点', popular: false },
]

const fetchBalance = async () => {
  try {
    const response = await axios.get('/api/points/balance', {})
    const newBalance = response.data.balance || 0
    balance.value = newBalance

    // 更新 localStorage 中的用户信息
    await updateUserBalance()

    // 通知父组件更新点数
    if (props.onPointsUpdate) {
      props.onPointsUpdate(newBalance)
    }
    emit('pointsUpdate', newBalance)
    return newBalance
  } catch (error) {
    console.error('获取余额失败:', error)
    return balance.value
  }
}

const handleRecharge = async () => {
  if (selectedAmount.value <= 0) {
    message.error('请选择充值金额')
    return
  }

  loading.value = true
  try {
    const response = await axios.post(
      '/api/points/recharge',
      {
        amount: selectedAmount.value,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    // 检查响应状态
    if (response.status === 200 && response.data) {
      if (response.data.success !== false) {
        message.success('充值成功！')
        // 立即刷新余额
        await fetchBalance()
        selectedAmount.value = 0
        customAmount.value = ''
      } else {
        message.error(response.data.message || '充值失败')
      }
    } else {
      message.error('充值请求失败')
    }
  } catch (error: any) {
    console.error('充值失败:', error)
    message.error(error.response?.data?.message || '充值失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 监听自定义金额输入
watch(customAmount, (newValue) => {
  if (newValue && typeof newValue === 'number' && newValue > 0) {
    // 如果输入的是自定义金额，清除预设选择
    const isPresetAmount = rechargeOptions.some((opt) => opt.amount === newValue)
    if (!isPresetAmount) {
      selectedAmount.value = newValue
    }
  }
})

// 监听预设金额选择
watch(selectedAmount, (newValue) => {
  const isPresetAmount = rechargeOptions.some((opt) => opt.amount === newValue)
  if (isPresetAmount) {
    customAmount.value = ''
  }
})

onMounted(() => {
  // 首先设置用户传入的点数
  if (props.user?.points !== undefined) {
    const userPoints = Number(props.user.points) || 0
    balance.value = userPoints
    if (props.onPointsUpdate) {
      props.onPointsUpdate(userPoints)
    }
    emit('pointsUpdate', userPoints)
  }
  // 然后尝试从API获取最新数据
  fetchBalance()
})
</script>

<style scoped>
@import './RechargePage.css';
</style>
