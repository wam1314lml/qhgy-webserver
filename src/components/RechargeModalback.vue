<template>
  <a-modal
    :open="modalVisible"
    @cancel="handleClose"
    :footer="null"
    :width="600"
    class="recharge-modal"
    centered
  >
    <template #title>
      <div style="display: flex; align-items: center; gap: 8px">
        <CreditCardOutlined />
        <span>{{ config?.name || '充值点数' }}</span>
      </div>
    </template>
    <div class="recharge-modal-content">
      <!-- 配置加载状态 -->
      <div v-if="configLoading" style="text-align: center; padding: 40px">
        <a-spin size="large" />
        <div style="margin-top: 16px">加载充值配置中...</div>
      </div>

      <!-- 配置加载失败 -->
      <div v-else-if="!config" style="text-align: center; padding: 40px">
        <div>充值配置加载失败，请稍后重试</div>
        <a-button @click="$emit('close')" style="margin-top: 16px">关闭</a-button>
      </div>

      <!-- 主要内容 -->
      <template v-else>
        <!-- 步骤指示器 -->
        <a-steps :current="currentStep" :items="stepItems" size="small" />

        <!-- 步骤1: 选择套餐和支付方式 -->
        <template v-if="currentStep === 0">
          <!-- 充值套餐 -->
          <div v-if="packages.length > 0" class="packages-section">
            <h4>推荐套餐</h4>
            <div class="packages-grid">
              <a-card
                v-for="pkg in packages"
                :key="pkg.id"
                :class="[
                  'package-card',
                  { selected: selectedPackage === pkg.id },
                  { popular: pkg.popular },
                ]"
                class="relative"
                @click="pkg.can_purchase ? handlePackageSelect(pkg) : null"
                :hoverable="pkg.can_purchase"
                size="small"
              >
                <div
                  v-if="getDiscountBadge(pkg)"
                  :class="['popular-badge', `badge-${getDiscountBadge(pkg)}`]"
                >
                  {{ getDiscountBadge(pkg) }}
                </div>
                <div v-if="selectedPackage === pkg.id" class="selected-badge">✓</div>
                <div class="package-quantity">
                  ¥{{ parseFloat(pkg.price || 0).toFixed(2) }}
                  <span v-if="getDiscountPercentage(pkg) <= 80" class="discount-tag"
                    >{{ getDiscountPercentage(pkg) / 10 }}折</span
                  >
                </div>
                <div class="package-price font-bold">{{ pkg.points }} 点配额</div>
                <div v-if="pkg.bonus_points > 0" class="package-bonus">
                  <GiftOutlined /> +{{ pkg.bonus_points }} 赠送
                </div>

                <!-- 购买次数限制信息 -->
                <div v-if="pkg.max_purchase_count" class="pt-1 border-t border-gray-100 text-xs">
                  <div v-if="pkg.can_purchase" class="text-yellow-500 font-medium">
                    限购{{ pkg.max_purchase_count }}次，已购买{{ pkg.user_purchased_count }}次
                  </div>
                  <div v-else class="text-red-500 font-semibold">
                    已达购买上限 ({{ pkg.max_purchase_count }}/{{ pkg.max_purchase_count }})
                  </div>
                </div>
                <div v-else class="pt-1 border-t border-gray-100 text-xs">
                  <div class="text-green-500 font-medium">无限制</div>
                </div>

                <!-- 不可购买时的遮罩 -->
                <div
                  v-if="!pkg.can_purchase"
                  class="absolute inset-0 bg-white/80 flex items-center justify-center text-xs font-semibold text-red-500 rounded-lg"
                >
                  已达购买上限
                </div>
              </a-card>
            </div>
          </div>

          <!-- 自定义数量（当未配置套餐时显示） -->
          <div v-if="packages.length === 0" class="custom-section">
            <h4>自定义数量</h4>
            <div class="custom-input-group">
              <a-input-number
                :min="config.min_quantity"
                :max="config.max_quantity"
                v-model:value="quantity"
                placeholder="输入点数"
                style="width: 200px"
                addon-after="点"
              />
              <div class="quantity-range">
                范围: {{ config.min_quantity }} - {{ config.max_quantity }} 点
              </div>
            </div>
          </div>

          <!-- 支付方式选择 -->
          <div class="payment-method-section flex justify-between items-center">
            <h4>支付方式</h4>
            <div v-if="paymentMethodsLoading" style="text-align: center; padding: 20px">
              <a-spin />
              <div style="margin-top: 8px">加载支付方式中...</div>
            </div>
            <div
              v-else-if="availablePaymentMethods.length === 0"
              style="text-align: center; padding: 20px; color: #999"
            >
              暂无可用的支付方式
            </div>
            <a-radio-group v-else v-model:value="paymentMethod" class="payment-methods">
              <a-radio-button
                v-for="method in availablePaymentMethods"
                :key="method.payment_method"
                :value="method.payment_method"
                class="payment-method-btn"
              >
                <WechatOutlined v-if="method.payment_method === 'wechat'" style="color: #07c160" />
                <AlipayOutlined v-if="method.payment_method === 'alipay'" style="color: #1677ff" />
                <span class="ml-1">{{ method.display_name }}</span>
              </a-radio-button>
            </a-radio-group>
          </div>

          <!-- 支付方式说明 -->
          <div v-if="paymentMethod && availablePaymentMethods.length > 0">
            <div v-if="paymentMethod === 'wechat'" style="color: #666; font-size: 14px">
              <a-alert
                message="电脑打开能直接扫码支付，手机打开需另外一部手机扫码支付"
                type="info"
                show-icon
              />
            </div>
            <div v-if="paymentMethod === 'alipay'" style="color: #666; font-size: 14px">
              <a-alert message="可直接手机打开支付宝支付" type="info" show-icon />
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="modal-actions">
            <a-button @click="handleClose" size="large"> 取消 </a-button>
            <a-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleRecharge"
              :disabled="
                !config.enabled ||
                quantity < config.min_quantity ||
                quantity > config.max_quantity ||
                !paymentMethod ||
                availablePaymentMethods.length === 0 ||
                !canPurchaseSelectedPackage
              "
            >
              {{ purchaseButtonText }}
            </a-button>
          </div>
        </template>

        <!-- 步骤2: 支付 -->
        <div v-if="currentStep === 1" class="payment-step">
          <div class="payment-info">
            <h3 class="text-lg!">
              {{ paymentMethod === 'wechat' ? '请使用微信扫码支付' : '支付宝支付' }}
            </h3>
            <div class="order-info">
              <p>订单号: {{ orderId }}</p>
              <p>
                支付金额: ¥{{ cost.toFixed(2) }}&nbsp;&nbsp;&nbsp;&nbsp;获得点数: {{ total }} 点
              </p>
            </div>
          </div>

          <a-qrcode :value="paymentQRCode" :size="200" style="margin: 0 auto" />
          <div class="payment-status">
            <p>
              <a-spin
                :spinning="paymentStatus === 'pending'"
                class="mr-4"
              />等待支付中，请勿关闭页面...
            </p>
          </div>

          <div v-if="paymentMethod === 'alipay' && paymentQRCode" class="alipay-payment-container">
            <div class="alipay-payment-info">
              <p class="text-sm!">支付页已在新窗口打开，请在新窗口中完成支付</p>
              <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: center">
                <a-button type="primary" size="large" @click="reopenPaymentWindow">
                  重新打开支付页面
                </a-button>
                <a-button
                  type="default"
                  size="large"
                  :loading="loading"
                  @click="handleManualCheckAlipay"
                  style="background-color: #52c41a; border-color: #52c41a; color: white"
                >
                  我已支付完成
                </a-button>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <a-button @click="handleClose" size="large"> 取消支付 </a-button>
          </div>
        </div>

        <!-- 步骤3: 支付完成 -->
        <div v-if="currentStep === 2" class="payment-success">
          <div class="success-icon">
            <CheckCircleOutlined style="font-size: 64px; color: #52c41a" />
          </div>
          <h3>支付成功！</h3>
          <div class="success-info">
            <p>订单号: {{ orderId }}</p>
            <p>支付金额: ¥{{ cost.toFixed(2) }}</p>
            <p>获得点数: {{ total }} 点配额</p>
            <p>当前余额: {{ user?.points || 0 }} 点</p>
          </div>
          <p class="auto-close-tip">页面将在3秒后自动关闭</p>
        </div>
      </template>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, h } from 'vue'
import {
  CreditCardOutlined,
  GiftOutlined,
  WechatOutlined,
  AlipayOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue'
import axios from '../utils/axios'
import { message, Modal } from 'ant-design-vue'
import { updateUserBalance } from '../utils/userUtils'

interface RechargeConfig {
  id: number
  name: string
  unit_price: number
  bonus_rate: number
  min_quantity: number
  max_quantity: number
  enabled: boolean
}

interface Props {
  isOpen?: boolean
  visible?: boolean
  user: any
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

// 兼容两种属性名
const modalVisible = computed(() => (props.isOpen !== undefined ? props.isOpen : props.visible))

const loading = ref(false)
const configLoading = ref(false)
const config = ref<RechargeConfig | null>(null)
const quantity = ref<number>(1)
const selectedPackage = ref<number | null>(null) // 存储套餐ID而非points

// 充值套餐数据
const packages = ref<any[]>([])

// 支付相关状态
const paymentMethod = ref<string>('')
const availablePaymentMethods = ref<any[]>([])
const paymentMethodsLoading = ref(false)
const currentStep = ref(0) // 0: 选择套餐, 1: 支付中, 2: 支付完成
const paymentQRCode = ref<string>('')
const orderId = ref<string>('')
const paymentStatus = ref<'pending' | 'success' | 'failed'>('pending')
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const timeoutTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// 合并的充值数据获取函数，避免竞态问题
const fetchRechargeData = async () => {
  configLoading.value = true
  try {
    // 使用 Promise.all 同时请求套餐和配置数据
    const [packagesResponse, configResponse] = await Promise.all([
      axios.get('/api/payment/recharge-packages', {}),
      axios.get('/api/payment/recharge-config', {}),
    ])

    // 处理配置数据
    if (configResponse.data && configResponse.data.config) {
      config.value = configResponse.data.config
    } else {
      console.warn('充值配置响应格式不正确，使用默认配置')
      setDefaultConfig()
    }

    // 处理套餐数据
    let hasPackages = false
    if (packagesResponse.data && packagesResponse.data.packages) {
      // 兼容 enabled / is_active，并规范化字段
      const enabledPackages = packagesResponse.data.packages
        .filter((pkg: any) => {
          const enabled = pkg.enabled === 1 || pkg.enabled === true
          const isActive = pkg.is_active === 1 || pkg.is_active === true
          return enabled || isActive
        })
        .map((p: any) => ({
          ...p,
          price: Number(p.price),
          points: Number(p.points),
          bonus_points: Number(p.bonus_points || 0),
          popular: Boolean(p.is_recommended) || Boolean(p.popular),
          max_purchase_count: p.max_purchase_count,
          user_purchased_count: Number(p.user_purchased_count || 0),
          can_purchase: Boolean(p.can_purchase !== false),
        }))

      // 按 sort_order 排序（无则置后）
      enabledPackages.sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      packages.value = enabledPackages
      hasPackages = enabledPackages.length > 0

      // 如果有套餐，默认选中第一个可购买的套餐
      if (hasPackages && !selectedPackage.value) {
        const firstAvailable = enabledPackages.find((pkg: any) => pkg.can_purchase)
        if (firstAvailable) {
          // 避免竞态，直接设置而不通过 handlePackageSelect
          selectedPackage.value = firstAvailable.id
          quantity.value = firstAvailable.points
        }
      }
    } else {
      packages.value = []
    }

    // 如果没有套餐，设置为配置的最小值
    if (!hasPackages && config.value) {
      quantity.value = config.value.min_quantity || 1
      selectedPackage.value = null
    }
  } catch {
    message.error('获取充值套餐失败，请稍后重试')
    emit('close')
    return
  } finally {
    configLoading.value = false
  }
}

// 单独获取充值套餐数据（用于刷新套餐状态）
const fetchRechargePackages = async () => {
  try {
    const response = await axios.get('/api/payment/recharge-packages', {})

    if (response.data && response.data.packages) {
      // 兼容 enabled / is_active，并规范化字段
      const enabledPackages = response.data.packages
        .filter((pkg: any) => {
          const enabled = pkg.enabled === 1 || pkg.enabled === true
          const isActive = pkg.is_active === 1 || pkg.is_active === true
          return enabled || isActive
        })
        .map((p: any) => ({
          ...p,
          price: Number(p.price),
          points: Number(p.points),
          bonus_points: Number(p.bonus_points || 0),
          popular: Boolean(p.is_recommended) || Boolean(p.popular),
          max_purchase_count: p.max_purchase_count,
          user_purchased_count: Number(p.user_purchased_count || 0),
          can_purchase: Boolean(p.can_purchase !== false),
        }))

      // 按 sort_order 排序（无则置后）
      enabledPackages.sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      packages.value = enabledPackages
    }
  } catch (error) {
    console.error('获取充值套餐失败:', error)
    packages.value = []
  }
}

const fetchPaymentMethods = async () => {
  paymentMethodsLoading.value = true
  try {
    const response = await axios.get('/api/payment/payment-methods', {})

    if (response.data && response.data.success) {
      const methods = response.data.data
      availablePaymentMethods.value = methods

      // 如果没有选中的支付方式，默认选择第一个可用的
      if (!paymentMethod.value && methods.length > 0) {
        paymentMethod.value = methods[0].payment_method
      }
    }
  } catch (error) {
    console.error('获取支付方式失败:', error)
    availablePaymentMethods.value = []
  } finally {
    paymentMethodsLoading.value = false
  }
}

// 设置默认配置的辅助函数
const setDefaultConfig = () => {
  config.value = {
    id: 1,
    name: '点数充值',
    unit_price: 0.01,
    bonus_rate: 0.1,
    min_quantity: 1,
    max_quantity: 99999,
    enabled: true,
  }
  quantity.value = 1
}

const calculateTotal = (qty: number) => {
  if (!config.value) return { cost: 0, bonus: 0, total: qty }

  const cost = qty * config.value.unit_price
  const bonus = Math.floor(qty * config.value.bonus_rate)
  const total = qty + bonus

  return { cost, bonus, total }
}

const handleRecharge = async () => {
  if (
    !config.value ||
    quantity.value < config.value.min_quantity ||
    quantity.value > config.value.max_quantity
  ) {
    message.error(
      `充值数量必须在 ${config.value?.min_quantity || 1} - ${config.value?.max_quantity || 99999} 之间`,
    )
    return
  }

  loading.value = true
  try {
    // 检查是否选择了套餐
    const selectedPkg = packages.value.find((pkg) => pkg.id === selectedPackage.value)

    if (!selectedPkg && packages.value.length > 0) {
      message.error('请选择充值套餐')
      loading.value = false
      return
    }

    // 创建支付订单
    const response = await axios.post(
      '/api/payment/create-order',
      {
        package_id: selectedPkg?.id || null,
        quantity: quantity.value,
        payment_method: paymentMethod.value,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.data && response.data.success) {
      // 设置支付信息
      orderId.value = response.data.order_id
      paymentQRCode.value = response.data.qr_code
      currentStep.value = 1

      // 如果是支付宝支付，在新窗口打开支付页面
      if (paymentMethod.value === 'alipay' && response.data.qr_code) {
        console.log('支付宝支付页面URL:', response.data.qr_code)
        // 在新窗口打开支付宝HTML页面，保留当前页面
        const paymentWindow = window.open(
          response.data.qr_code,
          '_blank',
          'width=800,height=600,scrollbars=yes,resizable=yes',
        )

        if (paymentWindow) {
          message.success('支付宝支付页面已在新窗口打开，请在新窗口中完成支付')
        } else {
          // 如果弹窗被阻止，提示用户手动打开
          message.warning('请允许弹窗，或手动复制链接打开支付页面')
          // 可以考虑显示链接让用户手动点击
          console.log('支付链接:', response.data.qr_code)
        }
      } else {
        message.success('支付订单创建成功，请扫码支付')
      }

      // 开始轮询支付状态
      startPaymentPolling(response.data.order_id)
    } else {
      message.error(response.data?.message || '创建支付订单失败')
    }
  } catch (error: any) {
    console.error('创建支付订单失败:', error)

    // 处理购买限制错误
    const errorMessage = error.response?.data?.message || '创建支付订单失败，请稍后重试'
    if (errorMessage.includes('限购') || errorMessage.includes('购买上限')) {
      message.error(errorMessage)
      // 刷新套餐列表以更新购买状态
      fetchRechargePackages()
    } else {
      message.error(errorMessage)
    }
  } finally {
    loading.value = false
  }
}

// 开始轮询支付状态
const startPaymentPolling = (orderIdToCheck: string) => {
  const timer = setInterval(async () => {
    try {
      const response = await axios.get(`/api/payment/check-status/${orderIdToCheck}`, {})

      if (response.data.status === 'success') {
        await updateUserBalance()
        // 支付成功
        paymentStatus.value = 'success'
        currentStep.value = 2
        clearInterval(timer)

        // 清除超时定时器
        if (timeoutTimer.value) {
          clearTimeout(timeoutTimer.value)
          timeoutTimer.value = null
        }

        message.success('支付成功！点数已到账')

        // 3秒后关闭弹窗
        setTimeout(() => {
          emit('close')
          resetModal()
        }, 3000)
      } else if (response.data.status === 'failed') {
        // 支付失败
        paymentStatus.value = 'failed'
        clearInterval(timer)

        // 清除超时定时器
        if (timeoutTimer.value) {
          clearTimeout(timeoutTimer.value)
          timeoutTimer.value = null
        }

        message.error('支付失败，请重试')
      }
    } catch (error) {
      console.error('检查支付状态失败:', error)
    }
  }, 2000) // 每2秒检查一次

  pollingTimer.value = timer

  // 5分钟后停止轮询
  const timeout = setTimeout(() => {
    clearInterval(timer)
    if (paymentStatus.value === 'pending') {
      message.warning('支付超时，请重新发起支付')
    }
    timeoutTimer.value = null
  }, 300000)

  timeoutTimer.value = timeout
}

// 手动检查支付宝订单状态
const handleManualCheckAlipay = async () => {
  if (!orderId.value) {
    message.error('订单ID不存在')
    return
  }

  loading.value = true
  try {
    const response = await axios.post(`/api/payment/manual-check-alipay/${orderId.value}`, {}, {})

    if (response.data.success) {
      updateUserBalance()
      // 支付成功
      paymentStatus.value = 'success'
      currentStep.value = 2

      // 停止轮询
      if (pollingTimer.value) {
        clearInterval(pollingTimer.value)
      }

      // 清除超时定时器
      if (timeoutTimer.value) {
        clearTimeout(timeoutTimer.value)
        timeoutTimer.value = null
      }

      message.success('支付成功！点数已到账')

      // 3秒后关闭弹窗
      setTimeout(() => {
        emit('close')
        resetModal()
      }, 3000)
    } else {
      message.info(response.data.message || '订单尚未支付成功')
    }
  } catch (error: any) {
    console.error('手动检查支付状态失败:', error)
    message.error(error.response?.data?.message || '检查支付状态失败')
  } finally {
    loading.value = false
  }
}

// 重置弹窗状态
const resetModal = () => {
  currentStep.value = 0
  paymentQRCode.value = ''
  orderId.value = ''
  paymentStatus.value = 'pending'
  quantity.value = config.value?.min_quantity || 1
  selectedPackage.value = null
  paymentMethod.value = ''
  availablePaymentMethods.value = []
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value)
    timeoutTimer.value = null
  }
}

// 关闭弹窗时清理定时器
const handleClose = async () => {
  // 如果当前在支付步骤且有订单ID，需要确认是否取消订单
  if (currentStep.value === 1 && orderId.value) {
    Modal.confirm({
      title: '确认取消订单',
      content:
        '您确定要取消当前订单吗？如果您已经完成支付，取消订单可能会导致充值不到账。建议等待支付完成后再关闭页面。',
      okText: '确定取消',
      cancelText: '继续支付',
      okType: 'danger',
      centered: true,
      onOk: async () => {
        try {
          await axios.post(`/api/payment/cancel-order/${orderId.value}`, {})
          message.info('订单已取消')
        } catch (error: any) {
          console.error('取消订单失败:', error)
          message.error('取消订单失败，请稍后重试')
        }

        // 清理定时器并关闭弹窗
        if (pollingTimer.value) {
          clearInterval(pollingTimer.value)
          pollingTimer.value = null
        }
        if (timeoutTimer.value) {
          clearTimeout(timeoutTimer.value)
          timeoutTimer.value = null
        }
        resetModal()
        emit('close')
      },
      onCancel: () => {
        // 用户选择继续支付，不做任何操作
      },
    })
    return
  }

  // 非支付步骤，直接关闭
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value)
    timeoutTimer.value = null
  }
  resetModal()
  emit('close')
}

const handlePackageSelect = (pkg: any) => {
  selectedPackage.value = pkg.id
  quantity.value = pkg.points
}

// 重新打开支付窗口
const reopenPaymentWindow = () => {
  if (paymentQRCode.value) {
    window.open(paymentQRCode.value, '_blank')
  }
}

// 计算显示的费用信息
const selectedPkg = computed(() => packages.value.find((pkg) => pkg.id === selectedPackage.value))

const cost = computed(() => {
  if (selectedPkg.value) {
    return Number(selectedPkg.value.price ?? 0)
  } else {
    const calc = calculateTotal(quantity.value)
    return Number(calc.cost ?? 0)
  }
})

const bonus = computed(() => {
  if (selectedPkg.value) {
    return Number(selectedPkg.value.bonus_points ?? 0)
  } else {
    const calc = calculateTotal(quantity.value)
    return Math.floor(Number(calc.bonus ?? 0))
  }
})

const total = computed(() => {
  if (selectedPkg.value) {
    return Number(selectedPkg.value.points ?? 0) + bonus.value
  } else {
    const calc = calculateTotal(quantity.value)
    return Number(calc.total ?? 0)
  }
})

// 检查当前选中的套餐是否可以购买
const canPurchaseSelectedPackage = computed(() => {
  const selectedPkg = packages.value.find((pkg) => pkg.id === selectedPackage.value)
  if (!selectedPkg) return true // 自定义数量时默认允许
  return selectedPkg.can_purchase
})

// 购买按钮文本
const purchaseButtonText = computed(() => {
  if (loading.value) return '创建订单中...'

  const selectedPkg = packages.value.find((pkg) => pkg.id === selectedPackage.value)

  // 检查是否已达购买限制
  if (selectedPkg && !selectedPkg.can_purchase) {
    return '已达购买上限'
  }

  // 显示剩余购买次数
  if (selectedPkg && selectedPkg.max_purchase_count && selectedPkg.user_purchased_count > 0) {
    const remaining = selectedPkg.max_purchase_count - selectedPkg.user_purchased_count
    return `立即支付 ¥${cost.value.toFixed(2)} (还可购买${remaining}次)`
  }

  return `立即支付 ¥${cost.value.toFixed(2)}`
})

const stepItems = computed(() => [
  {
    title: '选择套餐',
    icon: h(CreditCardOutlined),
  },
  {
    title: '扫码支付',
    icon:
      paymentMethod.value === 'wechat'
        ? h(WechatOutlined)
        : paymentMethod.value === 'alipay'
          ? h(AlipayOutlined)
          : h(CreditCardOutlined),
  },
  {
    title: '支付完成',
    icon: h(CheckCircleOutlined),
  },
])

// 获取基准单价（原价单价）- 取所有套餐中单价最高的作为基准
const getBaseUnitPrice = () => {
  if (packages.value.length === 0) return 0

  // 计算每个套餐的单价，找出最高的
  const unitPrices = packages.value.map((pkg) => {
    const price = parseFloat(pkg.price || 0)
    const points = parseFloat(pkg.points || 1)
    return price / points
  })

  return Math.max(...unitPrices)
}

// 计算折扣百分比（返回整数，如 89 表示 8.9折）
const getDiscountPercentage = (pkg: any) => {
  if (!pkg.points || !pkg.price) return 100

  // 如果套餐明确提供了折扣字段，优先使用
  if (pkg.discount_rate && pkg.discount_rate < 1) {
    return Math.round(pkg.discount_rate * 100)
  }
  if (pkg.discount && pkg.discount < 100) {
    return Math.round(pkg.discount)
  }

  // 计算当前套餐的单价
  const currentUnitPrice = parseFloat(pkg.price) / parseFloat(pkg.points)

  // 获取基准单价（原价）
  const baseUnitPrice = getBaseUnitPrice()

  if (baseUnitPrice === 0) return 100

  // 计算折扣百分比
  const discountPercentage = (currentUnitPrice / baseUnitPrice) * 100

  return Math.round(discountPercentage)
}

// 根据折扣返回徽章文本
const getDiscountBadge = (pkg: any) => {
  const discount = getDiscountPercentage(pkg)

  if (discount <= 80) return '超值'
  if (discount <= 90) return '热门'
  // 9折及以上（包括原价）都显示优惠
  return ''
}

// 监听弹窗打开状态
watch(modalVisible, (visible) => {
  if (visible) {
    // 如果没有配置，先设置默认配置确保界面可用
    if (!config.value) {
      setDefaultConfig()
    }
    // 使用合并后的函数获取充值数据，避免竞态问题
    fetchRechargeData()
    fetchPaymentMethods()
  }
})

// 组件初始化时确保有默认配置
onMounted(() => {
  if (!config.value) {
    setDefaultConfig()
  }
})

onUnmounted(() => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
  }
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value)
  }
})
</script>

<style scoped>
@import './RechargeModal.css';
</style>
