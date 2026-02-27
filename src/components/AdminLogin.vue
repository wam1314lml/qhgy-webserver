<template>
  <div class="admin-login-container">
    <a-card class="admin-login-card" title="管理员登录">
      <a-form
        ref="formRef"
        :model="formData"
        name="adminLogin"
        @finish="onFinish"
        autocomplete="off"
        size="large"
      >
        <a-form-item name="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model:value="formData.username" placeholder="用户名">
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formData.password" placeholder="密码">
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading" block> 登录 </a-button>
        </a-form-item>
      </a-form>

      <div class="admin-login-tips">
        <p>默认管理员账户：</p>
        <p>用户名: admin</p>
        <p>密码: admin123</p>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import axios from '../utils/axios'

const emit = defineEmits<{
  loginSuccess: [token: string, admin: any]
}>()

const loading = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive({
  username: '',
  password: '',
})

const onFinish = async (values: { username: string; password: string }) => {
  loading.value = true
  try {
    const response = await axios.post('/api/admin/login', values)
    const { token, admin } = response.data

    // 保存token到localStorage
    localStorage.setItem('adminToken', token)
    localStorage.setItem('adminInfo', JSON.stringify(admin))

    message.success('登录成功')
    emit('loginSuccess', token, admin)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import './AdminLogin.css';
</style>
