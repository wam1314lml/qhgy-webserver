import { ref } from 'vue'

export type ThemeKey = 'lemon' | 'mint' | 'sky'

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
  lemon: {
    key: 'lemon',
    label: '柠檬黄',
    emoji: '🍋',
    loginBg: 'linear-gradient(135deg, #fffde7 0%, #fff3a6 52%, #eaf8c9 100%)',
    primary: '#a16207',
    primaryDark: '#854d0e',
    primaryRgb: '161, 98, 7',
    btnGradient: 'linear-gradient(135deg, #d49b08 0%, #a16207 100%)',
    btnGradientHover: 'linear-gradient(135deg, #b77906 0%, #854d0e 100%)',
    btnShadow: '0 6px 18px rgba(161, 98, 7, 0.28)',
    sceneSky: 'linear-gradient(180deg, #bfe9ff 0%, #eaf8ff 52%, #fff6ad 100%)',
    sceneGround: 'linear-gradient(180deg, #a9df71 0%, #6fbd51 100%)',
    sceneGroundTop: 'rgba(91, 154, 54, 0.55)',
    navBg: 'rgba(255, 251, 214, 0.9)',
    navBgBlur: 'rgba(255, 248, 196, 0.94)',
    navBorder: 'rgba(202, 138, 4, 0.24)',
    pageBg: 'linear-gradient(135deg, #fffef0 0%, #fff8c5 52%, #f2fad7 100%)',
    cardBg: 'rgba(255, 255, 255, 0.94)',
    sceneTopColor: '#bfe9ff',
    sceneMidColor: '#eaf8ff',
    sceneBottomColor: '#fff6ad',
    logoGradient: 'linear-gradient(135deg, #ca8a04, #65a30d)',
  },
  mint: {
    key: 'mint',
    label: '薄荷绿',
    emoji: '🌱',
    loginBg: 'linear-gradient(135deg, #effff9 0%, #c9f7e7 50%, #afead7 100%)',
    primary: '#047857',
    primaryDark: '#065f46',
    primaryRgb: '4, 120, 87',
    btnGradient: 'linear-gradient(135deg, #10a77b 0%, #047857 100%)',
    btnGradientHover: 'linear-gradient(135deg, #078f69 0%, #065f46 100%)',
    btnShadow: '0 6px 18px rgba(4, 120, 87, 0.25)',
    sceneSky: 'linear-gradient(180deg, #bcecff 0%, #e8fbff 55%, #d9f7ce 100%)',
    sceneGround: 'linear-gradient(180deg, #91dfa0 0%, #4dbd79 100%)',
    sceneGroundTop: 'rgba(35, 145, 88, 0.5)',
    navBg: 'rgba(220, 252, 239, 0.9)',
    navBgBlur: 'rgba(204, 248, 230, 0.94)',
    navBorder: 'rgba(4, 120, 87, 0.22)',
    pageBg: 'linear-gradient(135deg, #f3fff9 0%, #ddfaed 50%, #ccf4e5 100%)',
    cardBg: 'rgba(255, 255, 255, 0.94)',
    sceneTopColor: '#bcecff',
    sceneMidColor: '#e8fbff',
    sceneBottomColor: '#d9f7ce',
    logoGradient: 'linear-gradient(135deg, #0f9f76, #0e7490)',
  },
  sky: {
    key: 'sky',
    label: '浅蓝',
    emoji: '☁️',
    loginBg: 'linear-gradient(135deg, #f4fbff 0%, #d5efff 50%, #bcdfff 100%)',
    primary: '#0369a1',
    primaryDark: '#075985',
    primaryRgb: '3, 105, 161',
    btnGradient: 'linear-gradient(135deg, #168bc4 0%, #0369a1 100%)',
    btnGradientHover: 'linear-gradient(135deg, #0878b2 0%, #075985 100%)',
    btnShadow: '0 6px 18px rgba(3, 105, 161, 0.25)',
    sceneSky: 'linear-gradient(180deg, #9edcff 0%, #d9f2ff 58%, #ecfbd9 100%)',
    sceneGround: 'linear-gradient(180deg, #9bdc91 0%, #59b976 100%)',
    sceneGroundTop: 'rgba(47, 142, 81, 0.48)',
    navBg: 'rgba(224, 244, 255, 0.9)',
    navBgBlur: 'rgba(207, 237, 255, 0.94)',
    navBorder: 'rgba(3, 105, 161, 0.2)',
    pageBg: 'linear-gradient(135deg, #f5fbff 0%, #e1f3ff 50%, #d4edff 100%)',
    cardBg: 'rgba(255, 255, 255, 0.94)',
    sceneTopColor: '#9edcff',
    sceneMidColor: '#d9f2ff',
    sceneBottomColor: '#ecfbd9',
    logoGradient: 'linear-gradient(135deg, #0284c7, #0e7490)',
  },
}

const legacyThemeMap: Record<string, ThemeKey> = {
  sakura: 'lemon',
  garden: 'mint',
  ocean: 'sky',
}

const savedTheme = localStorage.getItem('app-theme')

// 全局单例 ref
const currentTheme = ref<ThemeKey>(
  savedTheme && savedTheme in themes
    ? (savedTheme as ThemeKey)
    : legacyThemeMap[savedTheme || ''] || 'mint',
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
