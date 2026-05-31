import { createRouter, createWebHistory } from 'vue-router'
import LoginForm from '../components/LoginForm.vue'
import Dashboard from '../components/Dashboard.vue'
import PaymentSuccess from '../components/PaymentSuccess.vue'
import GameConfigPage from '../pages/GameConfigPage.vue'
import Help from '../components/HelpPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import AgentManagement from '../components/AgentManagement.vue'
import { updateUserBalance } from '@/utils/userUtils'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginForm,
  },
  {
    path: '/register',
    name: 'Register',
    redirect: (to) => ({
      path: '/login',
      query: {
        ...to.query,
        tab: 'register',
      },
    }),
  },
  {
    path: '/payment/success',
    name: 'PaymentSuccess',
    component: PaymentSuccess,
  },
  {
    path: '/game-config/:accountId',
    name: 'GameConfig',
    component: GameConfigPage,
    props: true,
  },
  {
    path: '/help',
    name: 'Help',
    component: Help,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage,
  },
  {
    path: '/agent',
    name: 'AgentManagement',
    component: AgentManagement,
    meta: { requiresSubadmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的位置（浏览器前进/后退），则滚动到保存的位置
    if (savedPosition) {
      return savedPosition
    }
    // 否则滚动到页面顶部
    return { top: 0, left: 0 }
  },
})

// 全局导航守卫 - 记录路由历史用于检测从登录页进入
router.beforeEach((to, from, next) => {
  // 记录当前路由名称，供下一个页面使用
  if (from.name) {
    sessionStorage.setItem('previousRoute', from.name as string)
  }
  if (!['Login', 'Register'].includes(to.name as string) && localStorage.token) {
    updateUserBalance()
  }
  // 二级代理专属页面权限守卫
  if (to.meta?.requiresSubadmin) {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      if (userInfo.role !== 'subadmin') {
        return next({ name: 'Dashboard' })
      }
    } catch {
      return next({ name: 'Login' })
    }
  }
  next()
})

export default router
