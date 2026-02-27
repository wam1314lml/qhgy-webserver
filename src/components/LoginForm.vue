<template>
  <!-- 登录表单 -->
  <div class="login-container">
    <div class="login-card">
      <a-alert
        v-if="shouldDisableFeatures"
        type="warning"
        class="mb-4"
        style="padding-block: 8px; padding-inline: 8px"
      >
        <template #description>
          <div style="line-height: 1.8">
            <p style="margin-bottom: 8px; font-weight: 500">老网址域名已到期，请各位前往新网址</p>
            <p style="margin-bottom: 8px">
              所有东西都不变，把 <strong>.cn</strong> 改成 <strong>.com</strong> 即可
            </p>
            <p style="margin-bottom: 0; color: #ff4d4f">请记住自己的网页登录账号和密码，就在下方</p>
          </div>
        </template>
      </a-alert>

      <a-form
        :model="formData"
        class="login-form"
        layout="vertical"
        :rules="formRules"
        ref="loginFormRef"
        autocomplete="off"
      >
        <a-form-item
          name="username"
          :validate-status="errors.username ? 'error' : ''"
          :help="errors.username"
        >
          <a-auto-complete
            v-model:value="formData.username"
            :options="accountOptions"
            placeholder="请输入账号"
            @blur="validateUsername"
            @select="onAccountSelect"
            @focus="showAccountDropdown = true"
            autocomplete="off"
            size="large"
            :dropdown-match-select-width="true"
            :allow-clear="true"
          >
          </a-auto-complete>
        </a-form-item>

        <a-form-item
          name="password"
          :validate-status="errors.password ? 'error' : ''"
          :help="errors.password"
        >
          <a-input-password
            v-model:value="formData.password"
            placeholder="请输入密码"
            @blur="validatePassword"
            autocomplete="new-password"
            size="large"
          />
        </a-form-item>

        <a-form-item
          name="captcha"
          :validate-status="errors.captcha ? 'error' : ''"
          :help="errors.captcha"
          class="mb-3!"
        >
          <div class="captcha-container">
            <a-input
              v-model:value="formData.captcha"
              placeholder="请输入验证码"
              :maxlength="4"
              @blur="validateCaptcha"
            />
            <div
              class="captcha-display h[40px] w[112px]"
              @click="generateCaptcha"
              title="点击刷新验证码"
            >
              <img
                v-if="captchaImage"
                :src="`data:image/png;base64,${captchaImage}`"
                alt="验证码"
                class="captcha-image"
                width="120"
                height="40"
              />
              <div v-else class="captcha-loading">加载中...</div>
            </div>
          </div>
          <div class="captcha-hint">验证码 {{ captchaCountdown }} 秒后自动刷新，点击可手动刷新</div>
        </a-form-item>

        <a-form-item class="mb-1!">
          <a-checkbox v-model:checked="rememberPassword" class="remember-password">
            记住密码
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            class="login-button"
            size="large"
            block
            :loading="isLoading"
            :disabled="shouldDisableFeatures"
            @click="onSubmit"
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </a-button>
        </a-form-item>
      </a-form>

      <div class="login-footer">
        <a-button
          type="button"
          class="forgot-password"
          :disabled="shouldDisableFeatures"
          @click="showForgotPasswordModal"
        >
          忘记密码？
        </a-button>
        <a-button
          type="button"
          class="register-link"
          :disabled="shouldDisableFeatures"
          @click="handleSwitchToRegister"
        >
          注册新账号
        </a-button>
      </div>
    </div>

    <!-- 忘记密码模态框 -->
    <ForgotPasswordModal v-model:open="showForgotPassword" @success="handleForgotPasswordSuccess" />

    <!-- 公告弹窗 -->
    <a-modal
      v-model:open="showAnnouncementModal"
      title="系统公告"
      width="600px"
      :style="{ top: '50px' }"
      @cancel="closeAnnouncementModal"
    >
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>系统公告</span>
          <span v-if="announcements.length > 0" style="font-size: 14px; color: #666">
            {{ currentAnnouncementIndex + 1 }} / {{ announcements.length }}
          </span>
        </div>
      </template>

      <div v-if="announcements.length > 0">
        <h3 style="margin-bottom: 16px; color: #333">
          {{ announcements[currentAnnouncementIndex]?.title }}
        </h3>
        <div
          style="line-height: 1.6; color: #666; min-height: 100px"
          v-html="safeAnnouncementContent"
        />
        <div style="margin-top: 16px; font-size: 12px; color: #999; text-align: right">
          发布时间: {{ formatDate(announcements[currentAnnouncementIndex]?.created_at) }}
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%">
          <div>
            <a-button
              v-if="announcements.length > 1 && currentAnnouncementIndex > 0"
              @click="showPreviousAnnouncement"
            >
              上一个
            </a-button>
          </div>
          <div style="display: flex; gap: 8px">
            <a-button
              v-if="announcements.length > 1 && currentAnnouncementIndex < announcements.length - 1"
              type="primary"
              @click="showNextAnnouncement"
            >
              下一个
            </a-button>
            <a-button v-else type="primary" @click="closeAnnouncementModal"> 我知道了 </a-button>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { notification } from 'ant-design-vue'
import { h } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import axios from '../utils/axios'
import ForgotPasswordModal from './ForgotPasswordModal.vue'
import { sanitizeHtml } from '../utils/sanitize'

interface LoginFormData {
  username: string
  password: string
  captcha: string
}

interface User {
  id: number
  username: string
  email: string
  role: string
  points: number
  permissions?: Record<string, boolean>
  role_level?: number
  permission_level?: number
}

interface Announcement {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
  display_duration: number
}

const router = useRouter()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 域名检测 - 通过API检查是否需要禁用功能
const shouldDisableFeatures = ref(false)
const checkDomain = async () => {
  try {
    const response = await axios.get('/api/domain-redirect/status')
    const result = response.data

    if (result.success && result.data.enabled) {
      const currentHostname = window.location.hostname
      const sourceDomain = result.data.sourceDomain

      // 如果当前域名是源域名，则禁用功能
      if (currentHostname === sourceDomain) {
        shouldDisableFeatures.value = true
        console.log('检测到需要迁移的域名，已禁用登录功能')
      } else {
        shouldDisableFeatures.value = false
      }
    } else {
      console.log('域名跳转未启用')
      shouldDisableFeatures.value = false
    }
  } catch (error) {
    console.error('获取域名跳转状态失败:', error)
    // 如果接口调用失败，不影响正常使用
    shouldDisableFeatures.value = false
  }
}

// 计算属性 - 生成下拉选项
const accountOptions = computed(() => {
  return savedAccounts.value.map((account) => ({
    value: account.username,
    username: account.username,
  }))
})

// 响应式数据
const captchaImage = ref('')
const captchaId = ref('')
const captchaCountdown = ref(60)
// autoLogoutTimer 已移至全局 main.ts 管理
const isLoading = ref(false)
const isLoggedIn = ref(false)
const user = ref<User | null>(null)
const token = ref<string>('')
const showForgotPassword = ref(false)
const announcements = ref<Announcement[]>([])
const showAnnouncementModal = ref(false)
const currentAnnouncementIndex = ref(0)
const isComponentDestroyed = ref(false)
const rememberPassword = ref(false)
const savedAccounts = ref<Array<{ username: string; password: string }>>([])
const showAccountDropdown = ref(false)
const isHandlingLogout = ref(false) // 防止重复处理退出登录

// 表单数据
const formData = reactive<LoginFormData>({
  username: '',
  password: '',
  captcha: '',
})

// 表单验证错误
const errors = reactive({
  username: '',
  password: '',
  captcha: '',
})

// 表单验证规则
const formRules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, message: '账号至少3个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' },
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^[0-9A-Za-z]{4}$/, message: '验证码格式不正确', trigger: 'blur' },
  ],
}

// 验证函数
const validateUsername = () => {
  if (!formData.username) {
    errors.username = '请输入账号'
    return false
  }
  if (formData.username.length < 3) {
    errors.username = '账号至少3个字符'
    return false
  }
  errors.username = ''
  return true
}

const validatePassword = () => {
  if (!formData.password) {
    errors.password = '请输入密码'
    return false
  }
  if (formData.password.length < 6) {
    errors.password = '密码至少6个字符'
    return false
  }
  errors.password = ''
  return true
}

const validateCaptcha = () => {
  if (!formData.captcha) {
    errors.captcha = '请输入验证码'
    return false
  }
  if (!/^[0-9A-Za-z]{4}$/.test(formData.captcha)) {
    errors.captcha = '验证码格式不正确'
    return false
  }
  errors.captcha = ''
  return true
}

// 从服务器获取验证码图片
const generateCaptcha = async () => {
  // 检查组件是否已销毁，防止内存泄漏
  if (isComponentDestroyed.value) {
    console.log('组件已销毁，跳过验证码生成')
    return
  }

  try {
    const response = await axios.post('/api/captcha/generate')
    const result = response.data
    console.log('验证码响应:', result)
    if (result.success && result.data) {
      // 再次检查组件状态，防止异步操作完成时组件已销毁
      if (!isComponentDestroyed.value) {
        captchaImage.value = result.data.image
        captchaId.value = result.data.id
        formData.captcha = ''
      }
    } else {
      console.error('验证码响应格式错误:', result)
      if (!isComponentDestroyed.value) {
        message.error('获取验证码失败，请刷新网页')
      }
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
    if (!isComponentDestroyed.value) {
      message.error('获取验证码失败，请刷新网页')
    }
  }
  // 注意：不在这里重置倒计时，让倒计时独立运行
}

// 倒计时和自动刷新验证码
let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  // 如果组件已销毁，不启动倒计时
  if (isComponentDestroyed.value) {
    return
  }

  // 清理之前的定时器
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }

  countdownInterval = setInterval(() => {
    // 检查组件是否已销毁
    if (isComponentDestroyed.value) {
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
      return
    }

    captchaCountdown.value--

    // 当倒计时到0时，重置为60并触发获取验证码
    if (captchaCountdown.value <= 0) {
      captchaCountdown.value = 60
      generateCaptcha()
    }
  }, 1000)
}

// 检查是否已经登录
const checkExistingLogin = () => {
  const savedToken = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')

  if (savedToken && savedUser) {
    try {
      const userData = JSON.parse(savedUser)
      user.value = userData
      token.value = savedToken
      isLoggedIn.value = true
      // 触发登录成功事件，启动全局自动登出定时器
      window.dispatchEvent(new CustomEvent('loginSuccess'))
    } catch (error) {
      console.error('解析保存的用户数据失败:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
}

// 保存账号凭据函数
const saveAccountCredentials = (username: string, password: string) => {
  // 检查是否已存在相同的账号
  const existingIndex = savedAccounts.value.findIndex((account) => account.username === username)

  const newAccount = { username, password }

  if (existingIndex !== -1) {
    // 如果已存在，更新密码并移动到最后
    savedAccounts.value.splice(existingIndex, 1)
  }

  // 添加到最后（表示最近使用）
  savedAccounts.value.push(newAccount)

  // 限制保存的账号数量（最多5个）
  if (savedAccounts.value.length > 5) {
    savedAccounts.value.shift() // 删除最老的账号
  }

  // 保存到本地存储
  localStorage.setItem('saved_accounts', JSON.stringify(savedAccounts.value))
  console.log('已保存账号凭据:', username)
}

// 账号选择处理函数
const onAccountSelect = (value: string) => {
  const selectedAccount = savedAccounts.value.find((account) => account.username === value)
  if (selectedAccount) {
    formData.username = selectedAccount.username
    formData.password = selectedAccount.password
    rememberPassword.value = true
    showAccountDropdown.value = false
    console.log('已选择账号并填充密码:', selectedAccount.username)
  }
}

// 加载已保存的账号密码
const loadSavedCredentials = () => {
  const savedCredentials = localStorage.getItem('saved_accounts')
  if (savedCredentials) {
    try {
      const accountsList = JSON.parse(savedCredentials)
      if (Array.isArray(accountsList) && accountsList.length > 0) {
        savedAccounts.value = accountsList
        // 自动填充最后一个账号
        const lastAccount = accountsList[accountsList.length - 1]
        formData.username = lastAccount.username || ''
        formData.password = lastAccount.password || ''
        rememberPassword.value = true
        console.log('已自动填充最近的账号密码')
      }
    } catch (error) {
      console.error('解析保存的凭据失败:', error)
      localStorage.removeItem('saved_accounts')
    }
  }

  // 兼容旧的单个凭据格式
  const oldCredentials = localStorage.getItem('remembered_credentials')
  if (oldCredentials && savedAccounts.value.length === 0) {
    try {
      const credentials = JSON.parse(oldCredentials)
      if (credentials && credentials.rememberPassword) {
        savedAccounts.value = [
          {
            username: credentials.username || '',
            password: credentials.password || '',
          },
        ]
        formData.username = credentials.username || ''
        formData.password = credentials.password || ''
        rememberPassword.value = true
        // 迁移到新格式
        localStorage.setItem('saved_accounts', JSON.stringify(savedAccounts.value))
        localStorage.removeItem('remembered_credentials')
        console.log('已迁移旧格式凭据到新格式')
      }
    } catch (error) {
      console.error('解析旧格式凭据失败:', error)
      localStorage.removeItem('remembered_credentials')
    }
  }
}

// 表单提交
const onSubmit = async () => {
  // 验证表单
  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()
  const isCaptchaValid = validateCaptcha()

  if (!isUsernameValid || !isPasswordValid || !isCaptchaValid) {
    return
  }

  isLoading.value = true

  try {
    // 先验证验证码
    try {
      await axios.post('/api/captcha/verify', {
        id: captchaId.value,
        answer: formData.captcha,
      })
    } catch {
      formData.captcha = ''
      // 只有在组件未销毁时才生成新验证码
      if (!isComponentDestroyed.value) {
        generateCaptcha()
      }
      return
    }

    // 验证码正确，进行登录验证
    const response = await axios.post('/api/auth/login', {
      username: formData.username,
      password: formData.password,
    })
    const result = response.data
    console.log('登录响应:', result)

    if (!result.user || !result.token) {
      message.error('登录响应数据不完整')
      return
    }

    const userData = {
      id: result.user.id,
      username: result.user.username || '',
      email: result.user.email || '',
      role: result.user.role || 'user',
      role_level: result.user.role_level || 1,
      points: typeof result.user.points === 'number' ? result.user.points : 0,
      permissions: result.user.permissions || {},
      permission_level: result.user.permission_level || 1,
    }

    console.log('处理后的用户数据:', userData)

    message.success('登录成功！')

    user.value = userData
    token.value = result.token
    isLoggedIn.value = true

    localStorage.setItem('token', result.token)
    localStorage.setItem('user', JSON.stringify(userData))

    // 如果勾选了记住密码，保存账号密码到本地存储
    if (rememberPassword.value) {
      saveAccountCredentials(formData.username, formData.password)
    }

    // 触发登录成功事件，启动全局自动登出定时器
    window.dispatchEvent(new CustomEvent('loginSuccess'))

    console.log('准备调用fetchAndShowAnnouncements函数')
    fetchAndShowAnnouncements()

    console.log('登录成功，状态已更新')

    // 登录成功后跳转到仪表板
    router.push('/')
  } finally {
    isLoading.value = false
  }
}

// 退出登录逻辑已移至 main.ts 全局管理

// 监听来自 axios 拦截器的退出登录事件
const handleGlobalLogout = () => {
  console.log('🔔 收到全局退出登录事件')

  // 如果正在处理退出登录，直接返回，避免重复执行
  if (isHandlingLogout.value) {
    return
  }

  isHandlingLogout.value = true

  // 全局自动登出定时器会通过监听 logout 事件自动清理

  // 更新组件状态
  isLoggedIn.value = false
  user.value = null
  token.value = ''

  // 清理表单数据
  formData.username = ''
  formData.password = ''
  formData.captcha = ''
  rememberPassword.value = false

  // 重新加载保存的凭据
  loadSavedCredentials()

  // 只有在组件未销毁时才重新生成验证码
  if (!isComponentDestroyed.value) {
    generateCaptcha()
  }

  console.log('✅ 组件状态已重置')

  // 3秒后重置标志，允许下次退出登录处理
  setTimeout(() => {
    isHandlingLogout.value = false
  }, 3000)
}

// 获取并显示公告
const fetchAndShowAnnouncements = async () => {
  console.log('🎯 fetchAndShowAnnouncements函数被调用了！')
  try {
    console.log('开始获取公告...')
    const response = await axios.get('/api/admin/announcements/active')
    console.log('公告接口响应状态:', response.status)

    if (response.status === 200) {
      const result = response.data
      console.log('公告接口返回数据:', result)

      if (result.success && result.data && result.data.length > 0) {
        console.log('找到公告，准备显示通知:', result.data.length, '条公告')

        result.data.forEach((announcement: Announcement, index: number) => {
          setTimeout(() => {
            notification.open({
              message: `📢 ${announcement.title}`,
              description: h('div', {
                innerHTML: sanitizeHtml(announcement.content),
                style: { maxHeight: '200px', overflow: 'auto' },
              }),
              duration: announcement.display_duration,
              placement: 'top',
              top: '40px',
              style: {
                width: '400px',
              },
              onClick: () => {
                console.log('公告通知被点击')
              },
            })
          }, index * 1000)
        })

        console.log('公告通知已显示')
      } else {
        console.log('没有启用的公告或数据为空')
      }
    } else {
      console.error('获取公告失败，状态码:', response.status)
    }
  } catch (error) {
    console.error('获取公告失败:', error)
  }
}

// 显示下一个公告
const showNextAnnouncement = () => {
  if (currentAnnouncementIndex.value < announcements.value.length - 1) {
    currentAnnouncementIndex.value++
  } else {
    showAnnouncementModal.value = false
  }
}

// 显示上一个公告
const showPreviousAnnouncement = () => {
  if (currentAnnouncementIndex.value > 0) {
    currentAnnouncementIndex.value--
  }
}

// 关闭公告弹窗
const closeAnnouncementModal = () => {
  showAnnouncementModal.value = false
}

// 自动超时计时器逻辑已移至 main.ts 进行全局管理
// 通过 window.startGlobalAutoLogoutTimer() 和自定义事件来控制

// 切换到注册页面
const handleSwitchToRegister = () => {
  // 保留 invite 参数
  const route = router.currentRoute.value
  const inviteCode = route.query.invite
  if (inviteCode) {
    router.push({ path: '/register', query: { invite: inviteCode } })
  } else {
    router.push('/register')
  }
}

// 显示忘记密码模态框
const showForgotPasswordModal = () => {
  showForgotPassword.value = true
}

// 处理忘记密码成功
const handleForgotPasswordSuccess = () => {
  // 重新加载保存的凭据以便用户使用新密码登录
  loadSavedCredentials()
  // 生成新的验证码
  if (!isComponentDestroyed.value) {
    generateCaptcha()
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 安全的公告内容（防止 XSS）
const safeAnnouncementContent = computed(() => {
  const content = announcements.value[currentAnnouncementIndex.value]?.content || ''
  return sanitizeHtml(content)
})

// 生命周期钩子
onMounted(() => {
  // 首先检查域名
  checkDomain()

  checkExistingLogin()
  // 只有在没有已登录的情况下才加载保存的凭据
  loadSavedCredentials()
  generateCaptcha()
  startCountdown()

  // 监听全局退出登录事件
  window.addEventListener('logout', handleGlobalLogout)
  console.log('🔔 已注册全局退出登录事件监听器')
})

onUnmounted(() => {
  // 标记组件已销毁
  isComponentDestroyed.value = true

  // 重置退出登录处理标志
  isHandlingLogout.value = false

  // 清理验证码倒计时定时器
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }

  // 全局自动登出定时器会在页面卸载时自动清理

  // 移除全局退出登录事件监听器
  window.removeEventListener('logout', handleGlobalLogout)
  console.log('🔔 已移除全局退出登录事件监听器和所有定时器')
})
</script>

<style scoped>
@import './LoginForm.css';
</style>
