import { ref } from 'vue'

export type ThemeKey = 'dream' | 'fresh' | 'water'

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
  // 游戏场景背景
  sceneTopColor: string
  sceneMidColor: string
  sceneBottomColor: string
  // logo文字渐变
  logoGradient: string
}

export const themes: Record<ThemeKey, ThemeConfig> = {
  dream: {
    key: 'dream',
    label: '梦幻紫',
    emoji: '🔮',
    loginBg: 'linear-gradient(135deg, #fcf8ff 0%, #eadcff 50%, #d6c3f5 100%)',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    primaryRgb: '124, 58, 237',
    btnGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    btnGradientHover: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    btnShadow: '0 6px 18px rgba(109, 40, 217, 0.26)',
    sceneSky: 'linear-gradient(180deg, #f2fff7 0%, #dff8e8 56%, #c9f0d6 100%)',
    sceneGround: 'linear-gradient(180deg, #b9e8bd 0%, #83c996 100%)',
    sceneGroundTop: 'rgba(77, 163, 99, 0.38)',
    navBg: 'rgba(242, 232, 255, 0.9)',
    navBgBlur: 'rgba(234, 220, 255, 0.95)',
    navBorder: 'rgba(124, 58, 237, 0.2)',
    pageBg: 'linear-gradient(135deg, #fcf9ff 0%, #f0e7ff 50%, #e5d8fa 100%)',
    cardBg: 'rgba(255, 255, 255, 0.94)',
    sceneTopColor: '#f2fff7',
    sceneMidColor: '#dff8e8',
    sceneBottomColor: '#c9f0d6',
    logoGradient: 'linear-gradient(135deg, #8b5cf6, #c084fc)',
  },
  fresh: {
    key: 'fresh',
    label: '清新黄',
    emoji: '🌼',
    loginBg: 'linear-gradient(135deg, #fffef2 0%, #fff3ad 52%, #f5e391 100%)',
    primary: '#a16207',
    primaryDark: '#854d0e',
    primaryRgb: '161, 98, 7',
    btnGradient: 'linear-gradient(135deg, #c18408 0%, #925607 100%)',
    btnGradientHover: 'linear-gradient(135deg, #a96c06 0%, #783f06 100%)',
    btnShadow: '0 6px 18px rgba(161, 98, 7, 0.25)',
    sceneSky: 'linear-gradient(180deg, #f2fff7 0%, #dff8e8 56%, #c9f0d6 100%)',
    sceneGround: 'linear-gradient(180deg, #b9e8bd 0%, #83c996 100%)',
    sceneGroundTop: 'rgba(77, 163, 99, 0.38)',
    navBg: 'rgba(255, 249, 205, 0.9)',
    navBgBlur: 'rgba(255, 244, 177, 0.95)',
    navBorder: 'rgba(161, 98, 7, 0.2)',
    pageBg: 'linear-gradient(135deg, #fffef4 0%, #fff7c9 50%, #f8eaa8 100%)',
    cardBg: 'rgba(255, 255, 255, 0.94)',
    sceneTopColor: '#f2fff7',
    sceneMidColor: '#dff8e8',
    sceneBottomColor: '#c9f0d6',
    logoGradient: 'linear-gradient(135deg, #ca8a04, #65a30d)',
  },
  water: {
    key: 'water',
    label: '清水蓝',
    emoji: '💧',
    loginBg: 'linear-gradient(135deg, #f7fdff 0%, #daf3ff 50%, #bfe7f5 100%)',
    primary: '#0369a1',
    primaryDark: '#075985',
    primaryRgb: '3, 105, 161',
    btnGradient: 'linear-gradient(135deg, #168bc4 0%, #0369a1 100%)',
    btnGradientHover: 'linear-gradient(135deg, #0878b2 0%, #075985 100%)',
    btnShadow: '0 6px 18px rgba(3, 105, 161, 0.25)',
    sceneSky: 'linear-gradient(180deg, #f2fff7 0%, #dff8e8 56%, #c9f0d6 100%)',
    sceneGround: 'linear-gradient(180deg, #b9e8bd 0%, #83c996 100%)',
    sceneGroundTop: 'rgba(77, 163, 99, 0.38)',
    navBg: 'rgba(226, 246, 255, 0.9)',
    navBgBlur: 'rgba(211, 241, 253, 0.95)',
    navBorder: 'rgba(3, 105, 161, 0.2)',
    pageBg: 'linear-gradient(135deg, #f7fdff 0%, #e4f6fd 50%, #d2eef8 100%)',
    cardBg: 'rgba(255, 255, 255, 0.94)',
    sceneTopColor: '#f2fff7',
    sceneMidColor: '#dff8e8',
    sceneBottomColor: '#c9f0d6',
    logoGradient: 'linear-gradient(135deg, #0284c7, #0e7490)',
  },
}

const legacyThemeMap: Record<string, ThemeKey> = {
  sakura: 'dream',
  garden: 'fresh',
  ocean: 'water',
  lemon: 'dream',
  mint: 'fresh',
  sky: 'water',
}

const savedTheme = localStorage.getItem('app-theme')

// 全局单例 ref
const currentTheme = ref<ThemeKey>(
  savedTheme && savedTheme in themes
    ? (savedTheme as ThemeKey)
    : legacyThemeMap[savedTheme || ''] || 'dream',
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
