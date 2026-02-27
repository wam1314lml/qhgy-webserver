<template>
  <div style="padding: 20px; background: #f5f5f5; min-height: 100vh">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px">
      <h2>移动端功能测试</h2>
      <p>
        当前点数: <strong>{{ points }}</strong>
      </p>

      <div style="margin-top: 20px">
        <a-button
          @click="testRefresh"
          :disabled="loading"
          :style="{
            padding: '12px 24px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }"
        >
          {{ loading ? '刷新中...' : '测试刷新' }}
        </a-button>

        <a-button
          @click="testRecharge"
          :disabled="loading"
          :style="{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }"
        >
          {{ loading ? '充值中...' : '测试充值100点' }}
        </a-button>
      </div>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px">
      <h3>调试信息</h3>
      <p>用户ID: {{ user?.id }}</p>
      <p>用户名: {{ user?.username }}</p>
      <p>初始点数: {{ user?.points }}</p>
      <p>Token: {{ token ? '已设置' : '未设置' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import axios from '../utils/axios'

interface Props {
  user: any
  token: string
}

const props = defineProps<Props>()

const points = ref(props.user?.points || 0)
const loading = ref(false)

const testRefresh = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/user/balance')
    const data = response.data
    points.value = data.balance || 0
    message.success(`刷新成功！当前点数: ${data.balance}`)
  } catch (error) {
    message.error('网络错误')
  } finally {
    loading.value = false
  }
}

const testRecharge = async () => {
  loading.value = true
  try {
    const response = await axios.post('/api/points/recharge', { amount: 100 })

    if (response.ok) {
      const data = await response.json()
      points.value = data.new_balance || points.value + 100
      message.success('充值成功！')
    } else {
      message.error('充值失败')
    }
  } catch (error) {
    message.error('充值失败')
  } finally {
    loading.value = false
  }
}
</script>
