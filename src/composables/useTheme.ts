import { ref, watch } from 'vue'

export type ThemeKey = 'sakura' | 'garden' | 'ocean'

export interface ThemeConfig {
  key: ThemeKey
  label: string
  emoji: string
  // 登录页背景渐变
  loginBg: string
  // 主色调（按钮、聚焦、高亮）
  primary: string
  primaryDark: string
  primaryRgb: string
  // 登录按钮渐变
  btnGradient: string
  btnGradientHover: string
  btnShadow: string
  // 场景天空渐变
  sceneSky: string
  sceneGround: string
  sceneGroundTop: string
  // 导航栏背景（登录后）
  navBg: string
  navBgBlur: string
  navBorder: string
  // 页面主背景（登录后）
  pageBg: string
  // 卡片背景
  cardBg: string
  // 萤火虫颜色
  fireflyColor: string
  fireflyGlow: string
  // 游戏场景背景
  sceneTopColor: string
  sceneMidColor: string
  sceneBottomColor: string
  // logo文字渐变
  logoGradient: string
}

export const themes: Record<ThemeKey, ThemeConfig> = {
  sakura: {
    key: 'sakura',
    label: '樱花粉',
    emoji: '🌸',
    loginBg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #3d1a3a 100%)',
    primary: '#f472b6',
    primaryDark: '#ec4899',
    primaryRgb: '244, 114, 182',
    btnGradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
    btnGradientHover: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    btnShadow: '0 4px 16px rgba(244, 114, 182, 0.4)',
    sceneSky: 'linear-gradient(180deg, #1a0530 0%, #2d1050 40%, #3d1a3a 80%, #4a1a35 100%)',
    sceneGround: 'linear-gradient(180deg, #4a1535 0%, #2d0f22 100%)',
    sceneGroundTop: 'rgba(244, 114, 182, 0.25)',
    navBg: 'rgba(255, 245, 250, 0.97)',
    navBgBlur: 'rgba(255, 240, 248, 0.95)',
    navBorder: 'rgba(244, 114, 182, 0.15)',
    pageBg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 50%, #f3e5f5 100%)',
    cardBg: 'rgba(255, 255, 255, 0.92)',
    fireflyColor: '#f9a8d4',
    fireflyGlow: 'rgba(249, 168, 212, 0.8)',
    sceneTopColor: '#1a0530',
    sceneMidColor: '#2d1050',
    sceneBottomColor: '#4a1a35',
    logoGradient: 'linear-gradient(135deg, #f472b6, #a855f7)',
  },
  garden: {
    key: 'garden',
    label: '翠绿',
    emoji: '🌿',
    loginBg: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    primary: '#22c55e',
    primaryDark: '#16a34a',
    primaryRgb: '34, 197, 94',
    btnGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    btnGradientHover: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    btnShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
    sceneSky: 'linear-gradient(180deg, #0a1628 0%, #0d2137 40%, #0a2e1a 80%, #0f3d1f 100%)',
    sceneGround: 'linear-gradient(180deg, #1a4a2e 0%, #0f3320 100%)',
    sceneGroundTop: 'rgba(34, 197, 94, 0.25)',
    navBg: 'rgba(255, 255, 255, 0.97)',
    navBgBlur: 'rgba(255, 255, 255, 0.95)',
    navBorder: 'rgba(34, 197, 94, 0.15)',
    pageBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    fireflyColor: '#22c55e',
    fireflyGlow: 'rgba(34, 197, 94, 0.8)',
    sceneTopColor: '#0a1628',
    sceneMidColor: '#0d2137',
    sceneBottomColor: '#0f3d1f',
    logoGradient: 'linear-gradient(135deg, #22c55e, #059669)',
  },
  ocean: {
    key: 'ocean',
    label: '海蓝',
    emoji: '🌊',
    loginBg: 'linear-gradient(135deg, #0a0e27 0%, #0d1b3e 50%, #0a2540 100%)',
    primary: '#38bdf8',
    primaryDark: '#0ea5e9',
    primaryRgb: '56, 189, 248',
    btnGradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    btnGradientHover: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    btnShadow: '0 4px 16px rgba(56, 189, 248, 0.4)',
    sceneSky: 'linear-gradient(180deg, #050d1a 0%, #091525 40%, #0a1e35 80%, #0d2545 100%)',
    sceneGround: 'linear-gradient(180deg, #0a2540 0%, #061828 100%)',
    sceneGroundTop: 'rgba(56, 189, 248, 0.25)',
    navBg: 'rgba(245, 250, 255, 0.97)',
    navBgBlur: 'rgba(240, 248, 255, 0.95)',
    navBorder: 'rgba(56, 189, 248, 0.15)',
    pageBg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #e0f7fa 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    fireflyColor: '#7dd3fc',
    fireflyGlow: 'rgba(125, 211, 252, 0.8)',
    sceneTopColor: '#050d1a',
    sceneMidColor: '#091525',
    sceneBottomColor: '#0d2545',
    logoGradient: 'linear-gradient(135deg, #38bdf8, #818cf8)',
  },
}

// 全局单例 ref
const currentTheme = ref<ThemeKey>(
  (localStorage.getItem('app-theme') as ThemeKey) || 'garden'
)

// 将主题变量注入到 :root CSS 变量
function applyTheme(key: ThemeKey) {
  const t = themes[key]
  const root = document.documentElement
  root.setAttribute('data-theme', key)
  root.style.setProperty('--theme-primary', t.primary)
  root.style.setProperty('--theme-primary-dark', t.primaryDark)
  root.style.setProperty('--theme-primary-rgb', t.primaryRgb)
  root.style.setProperty('--theme-btn-gradient', t.btnGradient)
  root.style.setProperty('--theme-btn-gradient-hover', t.btnGradientHover)
  root.style.setProperty('--theme-btn-shadow', t.btnShadow)
  root.style.setProperty('--theme-login-bg', t.loginBg)
  root.style.setProperty('--theme-scene-sky', t.sceneSky)
  root.style.setProperty('--theme-scene-ground', t.sceneGround)
  root.style.setProperty('--theme-scene-ground-top', t.sceneGroundTop)
  root.style.setProperty('--theme-nav-bg', t.navBg)
  root.style.setProperty('--theme-nav-border', t.navBorder)
  root.style.setProperty('--theme-page-bg', t.pageBg)
  root.style.setProperty('--theme-card-bg', t.cardBg)
  root.style.setProperty('--theme-firefly-color', t.fireflyColor)
  root.style.setProperty('--theme-firefly-glow', t.fireflyGlow)
  root.style.setProperty('--theme-logo-gradient', t.logoGradient)
}

export function useTheme() {
  function setTheme(key: ThemeKey) {
    currentTheme.value = key
    localStorage.setItem('app-theme', key)
    applyTheme(key)
  }

  function initTheme() {
    applyTheme(currentTheme.value)
  }

  return {
    currentTheme,
    themes,
    setTheme,
    initTheme,
  }
}
