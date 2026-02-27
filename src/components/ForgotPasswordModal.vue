<template>
  <a-modal
    v-model:open="visible"
    :title="props.title"
    width="500px"
    :maskClosable="false"
    centered
    @cancel="handleCancel"
  >
    <a-form
      :model="formData"
      @submit.prevent="handleSubmit"
      class="forgot-password-form"
      layout="vertical"
      ref="formRef"
    >
      <a-form-item
        v-if="!props.hideUsername"
        name="username"
        :rules="[{ required: true, message: '请输入用户名' }]"
      >
        <a-input v-model:value="formData.username" placeholder="请输入用户名" size="large" />
      </a-form-item>

      <a-form-item
        name="email"
        :rules="[{ required: true, type: 'email', message: '请输入正确的邮箱地址' }]"
      >
        <a-input
          v-model:value="formData.email"
          type="email"
          placeholder="请输入注册时使用的邮箱"
          size="large"
        />
      </a-form-item>

      <a-form-item name="emailCode" :rules="[{ required: true, message: '请输入邮箱验证码' }]">
        <div class="email-code-group">
          <a-input
            v-model:value="formData.emailCode"
            placeholder="请输入6位验证码"
            size="large"
            maxlength="6"
            class="email-code-input"
          />
          <a-button
            @click="sendEmailCode"
            :disabled="
              countdown > 0 ||
              !(props.hideUsername ? props.username : formData.username) ||
              !formData.email
            "
            :loading="sendingCode"
            size="large"
            class="send-code-btn"
          >
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </a-button>
        </div>
        <div v-if="emailCodeSent" class="info-message">验证码已发送，请查收邮件</div>
      </a-form-item>

      <a-form-item
        name="newPassword"
        :rules="[{ required: true, min: 6, message: '新密码至少需要6位' }]"
      >
        <a-input-password
          v-model:value="formData.newPassword"
          placeholder="请输入新密码（至少6位）"
          size="large"
        />
      </a-form-item>

      <a-form-item
        name="confirmPassword"
        :rules="[
          { required: true, message: '请确认新密码' },
          { validator: validateConfirmPassword },
        ]"
      >
        <a-input-password
          v-model:value="formData.confirmPassword"
          placeholder="请再次输入新密码"
          size="large"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <div class="modal-actions">
        <a-button @click="handleCancel"> 取消 </a-button>
        <a-button type="primary" @click="handleSubmit" :loading="loading"> 重置密码 </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, withDefaults } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import axios from '../utils/axios'

// Props
interface Props {
  open: boolean
  username?: string // 预填用户名
  title?: string // 模态框标题
  hideUsername?: boolean // 是否隐藏用户名输入框
}

const props = withDefaults(defineProps<Props>(), {
  title: '找回账号',
  hideUsername: false,
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

// 表单引用
const formRef = ref<FormInstance>()

// 响应式数据
const loading = ref(false)
const sendingCode = ref(false)
const emailCodeSent = ref(false)
const countdown = ref(0)

// 表单数据
const formData = reactive({
  username: props.username || '',
  email: '',
  emailCode: '',
  newPassword: '',
  confirmPassword: '',
})

// 计算属性 - 控制模态框显示
const visible = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

// 确认密码验证器
const validateConfirmPassword = (_rule: object, value: string) => {
  if (value !== formData.newPassword) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

// 处理取消
const handleCancel = () => {
  resetForm()
  visible.value = false
}

// 重置表单
const resetForm = () => {
  formData.username = props.username || '' // 保持预填的用户名
  formData.email = ''
  formData.emailCode = ''
  formData.newPassword = ''
  formData.confirmPassword = ''

  // 重置验证码状态
  emailCodeSent.value = false
  countdown.value = 0

  // 清除表单验证状态
  formRef.value?.resetFields()
}

// 发送邮箱验证码
const sendEmailCode = async () => {
  const username = props.hideUsername ? props.username : formData.username
  if (!username || !formData.email) {
    message.error('请先输入用户名和邮箱地址')
    return
  }

  sendingCode.value = true
  try {
    const response = await axios.post('/api/auth/send-reset-password-code', {
      username: username,
      email: formData.email,
    })
    const result = response.data

    if (result.success) {
      emailCodeSent.value = true
      countdown.value = 60
      message.success(result.message)

      // 开始倒计时
      startCountdown()
    } else {
      message.error(result.message)
    }
  } finally {
    sendingCode.value = false
  }
}

// 倒计时
const startCountdown = () => {
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

// 处理提交
const handleSubmit = async () => {
  try {
    // 验证表单
    await formRef.value?.validate()
  } catch {
    return
  }

  if (!emailCodeSent.value) {
    message.error('请先发送验证码')
    return
  }

  if (!formData.emailCode || formData.emailCode.length !== 6) {
    message.error('请输入6位邮箱验证码')
    return
  }

  if (formData.newPassword !== formData.confirmPassword) {
    message.error('两次输入的密码不一致')
    return
  }

  if (formData.newPassword.length < 6) {
    message.error('新密码至少需要6位')
    return
  }

  loading.value = true
  try {
    const username = props.hideUsername ? props.username : formData.username
    const response = await axios.post('/api/auth/reset-password', {
      username: username,
      email: formData.email,
      emailCode: formData.emailCode,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    })
    const result = response.data

    if (result.success) {
      message.success('密码重置成功，请使用新密码登录')
      resetForm()
      visible.value = false
      emit('success')
    } else {
      // 如果是验证码相关错误，重置验证码状态
      if (result.code === 'EMAIL_CODE_INVALID') {
        emailCodeSent.value = false
        countdown.value = 0
        message.error(result.message + '，请重新发送验证码')
      } else {
        message.error(result.message || '密码重置失败')
      }
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-password-form {
  margin-top: 16px;
}

.email-code-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.email-code-input {
  flex: 1;
}

.send-code-btn {
  width: 120px;
  flex-shrink: 0;
}

.info-message {
  margin-top: 4px;
  font-size: 12px;
  color: #52c41a;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
