<template>
  <div style="padding: 24px; max-width: 800px; margin: 0 auto">
    <a-card>
      <a-typography-title :level="2" style="text-align: center">
        支付方式测试页面
      </a-typography-title>

      <a-typography-text
        type="secondary"
        style="display: block; text-align: center; margin-bottom: 32px"
      >
        测试支付方式的动态获取和订单创建功能
      </a-typography-text>

      <a-divider />

      <div style="margin-bottom: 24px">
        <PaymentMethodSelector
          :key="refreshKey"
          @payment-method-change="handlePaymentMethodChange"
          :selected-method="selectedPaymentMethod"
        />
      </div>

      <a-divider />

      <div style="text-align: center">
        <a-space direction="vertical" size="large">
          <div>
            <a-typography-text strong>当前选择的支付方式: </a-typography-text>
            <a-typography-text :type="selectedPaymentMethod ? 'success' : 'secondary'">
              {{ getPaymentMethodName(selectedPaymentMethod) }}
            </a-typography-text>
          </div>

          <a-space>
            <a-button
              type="primary"
              size="large"
              @click="simulateCreateOrder"
              :disabled="!selectedPaymentMethod"
            >
              创建测试订单 (30点)
            </a-button>

            <a-button @click="handleRefreshPaymentMethods"> 刷新支付方式 </a-button>
          </a-space>
        </a-space>
      </div>

      <a-divider />

      <a-card size="small" style="background-color: #f6ffed">
        <a-typography-title :level="4">测试说明</a-typography-title>
        <div style="line-height: 1.8">
          <a-typography-text>
            <strong>1. 测试步骤：</strong>
            <br />
            • 在管理后台的"支付设置"中禁用某个支付方式
            <br />
            • 点击"刷新支付方式"按钮
            <br />
            • 观察支付选项是否相应更新
            <br />
            • 选择可用的支付方式并创建测试订单
            <br />
            <br />
            <strong>2. 预期结果：</strong>
            <br />
            • 禁用的支付方式不会在选项中显示
            <br />
            • 创建订单时会验证支付方式是否可用
            <br />
            • 如果支付方式被禁用，订单创建会失败
          </a-typography-text>
        </div>
      </a-card>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PaymentMethodSelector from './PaymentMethodSelector.vue'
import { message } from 'ant-design-vue'
import axios from '../utils/axios'

const selectedPaymentMethod = ref<string>('')
const refreshKey = ref(0)

const handlePaymentMethodChange = (method: string) => {
  selectedPaymentMethod.value = method
  console.log('选择的支付方式:', method)
}

const handleRefreshPaymentMethods = () => {
  refreshKey.value++
  message.info('正在刷新支付方式...')
}

const getPaymentMethodName = (method: string) => {
  if (!method) return '未选择'
  return method === 'wechat' ? '微信支付' : '支付宝'
}

const simulateCreateOrder = async () => {
  if (!selectedPaymentMethod.value) {
    message.warning('请先选择支付方式')
    return
  }

  try {
    const response = await axios.post('/api/payment/create-order', {
      quantity: 30,
      payment_method: selectedPaymentMethod.value,
    })

    const data = response.data

    if (data.success) {
      message.success(`订单创建成功！订单号: ${data.order_id}`)
      console.log('订单详情:', data)
    } else {
      message.error(data.message || '订单创建失败')
    }
  } catch (error) {
    console.error('创建订单失败:', error)
    message.error('网络错误')
  }
}
</script>
