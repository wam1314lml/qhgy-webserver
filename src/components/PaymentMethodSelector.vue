<template>
  <a-card>
    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 20px">
      <a-spin size="large" />
      <div style="margin-top: 12px">
        <a-typography-text>正在加载支付方式...</a-typography-text>
      </div>
    </div>

    <!-- 无支付方式 -->
    <div v-else-if="paymentMethods.length === 0" style="text-align: center; padding: 20px">
      <a-typography-text type="secondary">暂无可用的支付方式</a-typography-text>
      <div style="margin-top: 12px">
        <a-button @click="fetchPaymentMethods">
          重新加载
        </a-button>
      </div>
    </div>

    <!-- 支付方式选择 -->
    <template v-else>
      <a-typography-title :level="4">选择支付方式</a-typography-title>
      
      <a-radio-group 
        v-model:value="selectedPaymentMethod" 
        @change="handlePaymentMethodChange"
        style="width: 100%"
      >
        <a-space direction="vertical" style="width: 100%">
          <a-radio 
            v-for="method in paymentMethods"
            :key="method.payment_method" 
            :value="method.payment_method"
            :style="{ 
              width: '100%',
              padding: '12px',
              border: selectedPaymentMethod === method.payment_method ? '2px solid #1677ff' : '1px solid #d9d9d9',
              borderRadius: '8px',
              margin: '4px 0'
            }"
          >
            <div style="display: flex; align-items: center; gap: 12px; padding: 4px 0">
              <component :is="getPaymentIcon(method.payment_method)" />
              <div>
                <div style="font-weight: bold; font-size: 16px">
                  {{ method.display_name }}
                </div>
                <div style="color: #666; font-size: 12px">
                  {{ method.config?.description || `使用${method.display_name}进行支付` }}
                </div>
              </div>
            </div>
          </a-radio>
        </a-space>
      </a-radio-group>

      <div style="margin-top: 16px; text-align: center">
        <a-button 
          type="link" 
          size="small"
          @click="fetchPaymentMethods"
        >
          刷新支付方式
        </a-button>
      </div>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, h } from 'vue'
import { WechatOutlined, AlipayOutlined } from '@ant-design/icons-vue'
import axios from '../utils/axios'
import { message } from 'ant-design-vue'


interface PaymentMethod {
  payment_method: string;
  display_name: string;
  display_order: number;
  config: any;
}

interface Props {
  selectedMethod?: string;
}

const props = defineProps<Props>()
const emit = defineEmits<{
  paymentMethodChange: [method: string]
}>()

const paymentMethods = ref<PaymentMethod[]>([])
const loading = ref(false)
const selectedPaymentMethod = ref<string>(props.selectedMethod || '')

// 获取可用的支付方式
const fetchPaymentMethods = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/payment/payment-methods', {
    })
    
    if (response.data.success) {
      const methods = response.data.data
      paymentMethods.value = methods
      
      // 如果没有选中的支付方式，默认选择第一个可用的
      if (!selectedPaymentMethod.value && methods.length > 0) {
        const defaultMethod = methods[0].payment_method
        selectedPaymentMethod.value = defaultMethod
        emit('paymentMethodChange', defaultMethod)
      }
    } else {
      message.error('获取支付方式失败')
    }
  } catch (error: any) {
    console.error('获取支付方式失败:', error)
    message.error('获取支付方式失败')
  } finally {
    loading.value = false
  }
}

// 获取支付方式图标
const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'wechat':
      return h(WechatOutlined, { style: { color: '#07C160', fontSize: '20px' } })
    case 'alipay':
      return h(AlipayOutlined, { style: { color: '#1677FF', fontSize: '20px' } })
    default:
      return null
  }
}

// 处理支付方式选择
const handlePaymentMethodChange = (e: any) => {
  const method = e.target.value
  selectedPaymentMethod.value = method
  emit('paymentMethodChange', method)
}

// 监听外部传入的选中方法变化
watch(() => props.selectedMethod, (newMethod) => {
  if (newMethod) {
    selectedPaymentMethod.value = newMethod
  }
})

onMounted(() => {
  fetchPaymentMethods()
})
</script>