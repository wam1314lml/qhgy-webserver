<template>
  <div class="register-container">

    <!-- 微信浏览器拦截蒙层 -->
    <div v-if="isWechat" class="wechat-block-mask">
      <div class="wechat-block-content">
        <div class="wechat-arrow-tip">
          <span class="arrow-icon">↗</span>
        </div>
        <div class="wechat-tip-box">
          <p>点击右上角选择</p>
          <p>在浏览器打开~~</p>
        </div>
        <div class="wechat-open-btn">
          <span class="globe-icon">🌐</span> 在浏览器中打开
        </div>
      </div>
    </div>

    <div class="register-card">
      <div class="register-header">
        <h1>用户注册</h1>
      </div>

      <a-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        @finish="onSubmit"
        class="register-form"
        layout="vertical"
      >
        <a-form-item label="用户名" name="username" has-feedback>
          <a-input v-model:value="formData.username" placeholder="请输入用户名" size="large" />
        </a-form-item>

        <a-form-item label="邮箱" name="email" has-feedback>
          <a-input
            v-model:value="formData.email"
            type="email"
            placeholder="请输入邮箱"
            size="large"
          />
        </a-form-item>

        <a-form-item label="邮箱验证码" name="emailCode" has-feedback>
          <div class="email-code-group">
            <a-input
              v-model:value="formData.emailCode"
              placeholder="请输入6位验证码"
              size="large"
              maxlength="6"
              :disabled="!emailCodeSent"
            />
            <a-button
              type="default"
              size="large"
              :loading="sendingCode"
              :disabled="countdown > 0 || !formData.email"
              @click="sendEmailCode"
              class="send-code-button"
            >
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </a-button>
          </div>
          <div v-if="emailCodeSent" class="code-sent-message">
            <a-typography-text type="success">
              <CheckCircleOutlined /> 验证码已发送，请查收邮件
            </a-typography-text>
          </div>
        </a-form-item>

        <a-form-item label="密码" name="password" has-feedback>
          <a-input-password
            v-model:value="formData.password"
            placeholder="请输入密码（至少6位）"
            size="large"
          />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword" has-feedback>
          <a-input-password
            v-model:value="formData.confirmPassword"
            placeholder="请再次输入密码"
            size="large"
          />
        </a-form-item>

        <a-form-item v-if="formData.inviteCode" name="inviteCode">
          <template #label>邀请码</template>
          <a-input
            v-model:value="formData.inviteCode"
            placeholder="邀请码"
            disabled
            size="large"
          />
          <div class="invite-help-text">填写邀请码，邀请人将获得配额奖励</div>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            class="register-button"
            :loading="isLoading"
            size="large"
            block
          >
            注册
          </a-button>
        </a-form-item>
      </a-form>

      <div class="register-footer">
        <a-button type="link" class="login-link" @click="$emit('switchToLogin')">
          已有账号？立即登录
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, h } from 'vue'
import RegisterSuccessContent from './RegisterSuccessContent.vue'
import { useRoute } from 'vue-router'
import { message, type FormInstance, Modal } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import type { Rule } from 'ant-design-vue/es/form'
import axios from '../utils/axios'
const route = useRoute()

const emit = defineEmits<{
  switchToLogin: []
}>()

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  emailCode: '',
  inviteCode: '',
})

const isLoading = ref(false)
const emailCodeSent = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const isWechat = ref(false)

// 倒计时定时器
let countdownTimer: number | null = null

// 表单验证规则
const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' },
    { max: 20, message: '用户名最多20个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  emailCode: [
    { required: true, message: '请输入邮箱验证码', trigger: 'blur' },
    { len: 6, message: '验证码必须是6位数字', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码必须是6位数字', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
    {
      validator: (_rule: Rule, value: string) => {
        if (value && formData.username && value === formData.username) {
          return Promise.reject(new Error('密码不能与用户名相同'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: Rule, value: string) => {
        if (value && value !== formData.password) {
          return Promise.reject(new Error('两次输入的密码不一致'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
}

// 发送邮箱验证码
const sendEmailCode = async () => {
  if (!formData.email) {
    message.error('请先输入邮箱地址')
    return
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    message.error('请输入有效的邮箱地址')
    return
  }

  try {
    sendingCode.value = true

    const response = await axios.post('/api/auth/send-verification-code', {
      email: formData.email,
    })

    if (response.data.success) {
      emailCodeSent.value = true
      message.success(response.data.message)

      // 开始60秒倒计时
      countdown.value = 60
      countdownTimer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          if (countdownTimer) {
            clearInterval(countdownTimer)
            countdownTimer = null
          }
        }
      }, 1000)
    } else {
      message.error(response.data.message)
    }
  } finally {
    sendingCode.value = false
  }
}

// 表单提交
const onSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    if (!emailCodeSent.value) {
      message.error('请先发送邮箱验证码')
      return
    }

    if (!formData.emailCode || formData.emailCode.length !== 6) {
      message.error('请输入6位邮箱验证码')
      return
    }

    isLoading.value = true

    const response = await axios.post('/api/auth/register', {
      username: formData.username,
      email: formData.email,
      emailCode: formData.emailCode,
      password: formData.password,
      inviteCode: formData.inviteCode || undefined,
    })

    if (response.data.success) {
      Modal.success({
        title: '注册成功',
        content: h(RegisterSuccessContent, {
          email: formData.email,
          username: formData.username,
          password: formData.password,
        }),
        centered: true,
        onOk() {
          emit('switchToLogin')
        },
      })
    } else {
      message.error(response.data.message)
    }
  } catch (error: any) {
    if (typeof error === 'object' && error !== null && 'errorFields' in error) {
      // 表单验证失败
      return
    }

    console.error('注册错误:', error)

    // 处理API错误响应
    if (error.response?.data) {
      const { message: errorMessage, code } = error.response.data

      // 如果是验证码相关错误，重置验证码状态
      if (code === 'EMAIL_CODE_INVALID') {
        emailCodeSent.value = false
        countdown.value = 0
        if (countdownTimer) {
          clearInterval(countdownTimer)
          countdownTimer = null
        }
        message.error(errorMessage + '，请重新发送验证码')
      } else {
        message.error(errorMessage)
      }
    } else {
      message.error('网络错误，请稍后重试')
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // 检测微信浏览器
  isWechat.value = /MicroMessenger/i.test(navigator.userAgent)

  // 从路由查询参数中获取邀请码
  const inviteCodeFromRoute = route.query.invite

  if (typeof inviteCodeFromRoute === 'string' && /^[0-9A-Z]+$/.test(inviteCodeFromRoute)) {
    formData.inviteCode = inviteCodeFromRoute
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
@import './RegisterForm.css';

/* 微信浏览器拦截蒙层 */
.wechat-block-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wechat-block-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
  padding: 0 32px;
}

/* 右上角箭头提示 */
.wechat-arrow-tip {
  position: fixed;
  top: 16px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.arrow-icon {
  font-size: 48px;
  color: #fff;
  font-weight: bold;
  transform: rotate(-20deg);
  display: inline-block;
}

/* 虚线文字框 */
.wechat-tip-box {
  border: 2px dashed rgba(255, 255, 255, 0.7);
  border-radius: 50px;
  padding: 20px 36px;
  text-align: center;
}

.wechat-tip-box p {
  color: #fff;
  font-size: 22px;
  margin: 4px 0;
  letter-spacing: 2px;
}

/* 在浏览器中打开按钮 */
.wechat-open-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  color: #fff;
  font-size: 17px;
  padding: 12px 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 1px;
}

.globe-icon {
  font-size: 20px;
}
</style>
