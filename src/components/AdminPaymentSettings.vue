<template>
  <a-card>
    <template #title>
      <SettingOutlined /> 支付方式设置
    </template>
    
    <a-typography-text type="secondary">
      管理系统支持的支付方式，禁用的支付方式将不会在前端显示
    </a-typography-text>
    
    <a-divider />

    <div style="margin-bottom: 24px">
      <a-space direction="vertical" size="large" style="width: 100%">
        <a-card 
          v-for="method in paymentMethods"
          :key="method.id"
          size="small" 
          :style="{ 
            border: method.enabled ? '1px solid #d9d9d9' : '1px solid #f0f0f0',
            backgroundColor: method.enabled ? '#ffffff' : '#fafafa'
          }"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <a-space size="middle">
              <component :is="getPaymentIcon(method.payment_method)" />
              <div>
                <a-typography-text strong style="font-size: 16px">
                  {{ method.display_name }}
                </a-typography-text>
                <br />
                <a-typography-text type="secondary" style="font-size: 12px">
                  {{ method.payment_method === 'wechat' ? '微信扫码支付' : '支付宝扫码支付' }}
                </a-typography-text>
              </div>
            </a-space>
            
            <a-space>
              <a-typography-text :type="method.enabled ? 'success' : 'secondary'">
                {{ method.enabled ? '已启用' : '已禁用' }}
              </a-typography-text>
              <a-switch
                v-model:checked="method.enabled"
                :loading="saving"
                @change="(checked) => updatePaymentMethod(method.id, checked as number)"
                checked-children="启用"
                un-checked-children="禁用"
                :checkedValue="1"
                :unCheckedValue="0"
              />
            </a-space>
          </div>
        </a-card>
      </a-space>
    </div>

    <a-divider />

    <a-space>
      <a-button 
        type="primary" 
        :loading="loading"
        @click="fetchPaymentSettings"
      >
        <template #icon>
          <SettingOutlined />
        </template>
        刷新设置
      </a-button>
      
      <a-typography-text type="secondary" style="font-size: 12px">
        * 支付方式的启用/禁用会立即生效，影响用户端的支付选项显示
      </a-typography-text>
    </a-space>
  </a-card>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { Card, Switch, Button, message, Space, Typography, Divider } from 'ant-design-vue'
import { WechatOutlined, AlipayOutlined, SettingOutlined } from '@ant-design/icons-vue'
import axios from '../utils/axios'

// 组件注册
const ACard = Card
const ASwitch = Switch
const AButton = Button
const ASpace = Space
const ATypographyText = Typography.Text
const ADivider = Divider

interface PaymentMethod {
  id: number;
  payment_method: string;
  enabled: number;
  display_name: string;
  display_order: number;
  config: any;
}

// 删除未使用的props定义

const paymentMethods = ref<PaymentMethod[]>([])
const loading = ref(false)
const saving = ref(false)

// 获取支付方式设置
const fetchPaymentSettings = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/payment/admin/payment-settings', {
    })
    
    if (response.data.success) {
      paymentMethods.value = response.data.data
    } else {
      message.error('获取支付设置失败')
    }
  } catch (error: any) {
    console.error('获取支付设置失败:', error)
    if (error.response?.status === 403) {
      message.error('需要管理员权限')
    } else {
      message.error('获取支付设置失败')
    }
  } finally {
    loading.value = false
  }
}

// 更新支付方式状态
const updatePaymentMethod = async (id: number, enabled: number) => {
  saving.value = true
  try {
    const response = await axios.put(`/api/payment/admin/payment-settings/${id}`, {
      enabled
    }, {
    })

    if (response.data.success) {
      message.success('支付方式状态更新成功')
      // 更新本地状态
      paymentMethods.value = paymentMethods.value.map((method: PaymentMethod) => 
        method.id === id ? { ...method, enabled } : method
      )
    } else {
      message.error('更新失败')
    }
  } catch (error: any) {
    console.error('更新支付设置失败:', error)
    if (error.response?.status === 403) {
      message.error('需要管理员权限')
    } else {
      message.error('更新支付设置失败')
    }
  } finally {
    saving.value = false
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
      return h(SettingOutlined, { style: { fontSize: '20px' } })
  }
}

onMounted(() => {
  fetchPaymentSettings()
})
</script>