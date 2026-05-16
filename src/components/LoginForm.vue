<template>
  <!-- 登录页 - 左右分栏布局 -->
  <div class="login-container">
    <div class="login-split-wrapper">
      <!-- 左侧：登录表单 -->
      <div class="login-form-panel">
        <div class="login-card">
          <!-- 品牌标题 -->
          <div class="login-brand">
            <h1 class="login-brand-title">
              <span class="brand-icon">🌸</span>
              花园助手
            </h1>
            <p class="login-brand-sub">Garden Assistant · 智能挂机管理平台</p>
          </div>

          <!-- 主题选择器 -->
          <div class="theme-switcher">
            <span class="theme-switcher-label">风格</span>
            <div class="theme-options">
              <button
                v-for="t in themeList"
                :key="t.key"
                class="theme-btn"
                :class="{ active: currentTheme === t.key }"
                @click="setTheme(t.key)"
                :title="t.label"
              >
                <span class="theme-btn-dot" :style="{ background: t.dotColor }"></span>
                <span class="theme-btn-label">{{ t.emoji }} {{ t.label }}</span>
              </button>
            </div>
          </div>

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

          <div class="auth-tabs" role="tablist" aria-label="账号操作">
            <button
              type="button"
              class="auth-tab"
              :class="{ active: activeAuthTab === 'login' }"
              @click="activeAuthTab = 'login'"
            >
              登录
            </button>
            <button
              type="button"
              class="auth-tab"
              :class="{ active: activeAuthTab === 'register' }"
              @click="activeAuthTab = 'register'"
            >
              注册
            </button>
          </div>

          <div v-if="activeAuthTab === 'login'" class="auth-panel">
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
                  {{ isLoading ? '登录中...' : '登 录' }}
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
              <!-- <a-button
                type="button"
                class="register-link"
                :disabled="shouldDisableFeatures"
                @click="handleSwitchToRegister"
              >
                注册新账号
              </a-button> -->
            </div>
          </div>

          <div v-else class="auth-panel login-register-panel">
            <RegisterForm @switch-to-login="handleRegisterSwitchToLogin" />
          </div>
        </div>
      </div>

      <!-- 右侧：游戏动态展示区 -->
      <div class="login-showcase-panel">
        <div class="showcase-title">
          <h2>🌺 花园世界</h2>
          <p>自动培育 · 智能挂机 · 轻松收获</p>
        </div>

        <!-- 游戏场景动画 -->
        <div class="game-scene">
          <div class="game-scene-bg"></div>

          <!-- 月亮 -->
          <div class="game-moon"></div>

          <!-- 星星 -->
          <div class="stars">
            <div v-for="star in stars" :key="star.id" class="star"
              :style="{ left: star.x + '%', top: star.y + '%', '--dur': star.dur + 's', '--delay': star.delay + 's' }"
            ></div>
          </div>

          <!-- 萤火虫 -->
          <div v-for="fly in fireflies" :key="'fly'+fly.id" class="firefly"
            :style="{
              left: fly.x + '%', top: fly.y + '%',
              '--dur': fly.dur + 's', '--delay': fly.delay + 's',
              '--tx': fly.tx + 'px', '--ty': fly.ty + 'px'
            }"
          ></div>

          <!-- 花朵 -->
          <div v-for="flower in flowers" :key="'flower'+flower.id" class="flower"
            :style="{ left: flower.x + '%', bottom: flower.bottom + 'px', '--dur': flower.dur + 's', '--delay': flower.delay + 's' }"
          >{{ flower.emoji }}</div>

          <!-- 蝴蝶 -->
          <div v-for="butterfly in butterflies" :key="'bt'+butterfly.id" class="butterfly"
            :style="{ left: butterfly.x + '%', top: butterfly.y + '%', '--dur': butterfly.dur + 's', '--delay': butterfly.delay + 's' }"
          >{{ butterfly.emoji }}</div>

          <!-- 草地 -->
          <div class="grass-line"></div>
          <div class="game-ground"></div>
        </div>

        <!-- 数据统计卡片 -->
        <div class="showcase-stats">
          <div class="stat-card">
            <span class="stat-icon">🌸</span>
            <span class="stat-value">99+</span>
            <span class="stat-label">花卉品种</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⚡</span>
            <span class="stat-value">24H</span>
            <span class="stat-label">自动挂机</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🏆</span>
            <span class="stat-value">全自动</span>
            <span class="stat-label">订单处理</span>
          </div>
        </div>

        <!-- 滚动公告 -->
        <div class="showcase-marquee">
          <div class="marquee-inner">
            <span class="marquee-badge">公告</span>
            <span class="marquee-text">欢迎使用花园助手 · 自动培育花卉 · 智能完成订单 · 轻松赚取金币 🌻</span>
          </div>
        </div>
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
import { useTheme } from '../composables/useTheme'
import RegisterForm from './RegisterForm.vue'

const { currentTheme, setTheme } = useTheme()

// 主题选项列表
const themeList = [
  { key: 'sakura' as const, label: '樱花粉', emoji: '🌸', dotColor: '#f472b6' },
  { key: 'garden' as const, label: '翠绿', emoji: '🌿', dotColor: '#22c55e' },
  { key: 'ocean' as const, label: '海蓝', emoji: '🌊', dotColor: '#38bdf8' },
]

interface LoginFormData {
  username: string
  password: string
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

// ============================
// 右侧游戏场景动画数据
// ============================
const stars = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 60,
  dur: 1.5 + Math.random() * 2.5,
  delay: Math.random() * 3,
}))

const fireflies = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 30 + Math.random() * 40,
  dur: 4 + Math.random() * 4,
  delay: Math.random() * 5,
  tx: (Math.random() - 0.5) * 60,
  ty: (Math.random() - 0.5) * 40,
}))

const flowers = [
  { id: 1, emoji: '🌸', x: 8, bottom: 78, dur: 3.2, delay: 0 },
  { id: 2, emoji: '🌺', x: 20, bottom: 80, dur: 2.8, delay: 0.5 },
  { id: 3, emoji: '🌼', x: 35, bottom: 79, dur: 3.5, delay: 1 },
  { id: 4, emoji: '🌻', x: 50, bottom: 82, dur: 3.0, delay: 0.3 },
  { id: 5, emoji: '🌷', x: 65, bottom: 78, dur: 2.6, delay: 0.8 },
  { id: 6, emoji: '🌹', x: 80, bottom: 81, dur: 3.3, delay: 1.5 },
  { id: 7, emoji: '💐', x: 92, bottom: 80, dur: 2.9, delay: 0.2 },
]

const butterflies = [
  { id: 1, emoji: '🦋', x: 15, y: 35, dur: 9, delay: 0 },
  { id: 2, emoji: '🦋', x: 60, y: 20, dur: 11, delay: 3 },
]

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
const activeAuthTab = ref<'login' | 'register'>('login')

// 表单数据
const formData = reactive<LoginFormData>({
  username: '',
  password: '',
})

// 表单验证错误
const errors = reactive({
  username: '',
  password: '',
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
  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()

  if (!isUsernameValid || !isPasswordValid) {
    return
  }

  isLoading.value = true

  try {
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
  rememberPassword.value = false

  // 重新加载保存的凭据
  loadSavedCredentials()

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
  activeAuthTab.value = 'register'
}

const handleRegisterSwitchToLogin = () => {
  activeAuthTab.value = 'login'
}

// 显示忘记密码模态框
const showForgotPasswordModal = () => {
  showForgotPassword.value = true
}

// 处理忘记密码成功
const handleForgotPasswordSuccess = () => {
  loadSavedCredentials()
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
  checkDomain()
  checkExistingLogin()
  loadSavedCredentials()

  const route = router.currentRoute.value
  if (route.query.tab === 'register' || route.query.invite) {
    activeAuthTab.value = 'register'
  }

  window.addEventListener('logout', handleGlobalLogout)
  console.log('🔔 已注册全局退出登录事件监听器')
})

onUnmounted(() => {
  isComponentDestroyed.value = true
  isHandlingLogout.value = false

  window.removeEventListener('logout', handleGlobalLogout)
})
</script>

<style scoped>
@import './LoginForm.css';
</style>

<style>
/* 登录页输入框全局穿透样式（Ant Design scoped 兼容） */
.login-form .ant-input,
.login-form .ant-input-affix-wrapper,
.login-form .ant-select-selector,
.login-form .ant-input-outlined {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.3) !important;
  border-radius: 10px !important;
  color: #ffffff !important;
}

.login-form .ant-input::placeholder,
.login-form .ant-input-affix-wrapper input::placeholder,
.login-form .ant-select-selection-placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.login-form .ant-input:focus,
.login-form .ant-input-affix-wrapper-focused,
.login-form .ant-input-affix-wrapper:focus-within,
.login-form .ant-input-outlined:focus-within {
  background: rgba(255, 255, 255, 0.18) !important;
  border-color: var(--theme-primary, #22c55e) !important;
  box-shadow: 0 0 0 3px rgba(var(--theme-primary-rgb, 34,197,94), 0.2) !important;
}

.login-form .ant-input-affix-wrapper .ant-input {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #ffffff !important;
}

.login-form .ant-input-suffix svg,
.login-form .ant-input-clear-icon svg {
  color: rgba(255, 255, 255, 0.6) !important;
}

.login-form .ant-checkbox-wrapper {
  color: rgba(255, 255, 255, 0.6) !important;
}

.login-form .ant-checkbox-checked .ant-checkbox-inner {
  background-color: var(--theme-primary, #22c55e) !important;
  border-color: var(--theme-primary, #22c55e) !important;
}

.login-register-panel .register-form .ant-input,
.login-register-panel .register-form .ant-input-affix-wrapper,
.login-register-panel .register-form .ant-input-outlined {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.3) !important;
  border-radius: 10px !important;
  color: #ffffff !important;
}

.login-register-panel .register-form .ant-input::placeholder,
.login-register-panel .register-form .ant-input-affix-wrapper input::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.login-register-panel .register-form .ant-input-affix-wrapper .ant-input {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #ffffff !important;
}

.login-register-panel .register-form .ant-input-suffix svg {
  color: rgba(255, 255, 255, 0.6) !important;
}

.login-register-panel .register-form .ant-form-item-label > label {
  color: rgba(255, 255, 255, 0.62) !important;
}

.login-register-panel .register-form .ant-form-item-explain-error {
  color: #fb7185 !important;
}
</style>
