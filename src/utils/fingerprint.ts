/**
 * 浏览器指纹生成工具
 * 用于生成唯一的浏览器指纹，防止脚本攻击
 */

/**
 * 生成 Canvas 指纹
 */
export function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // 绘制一些图形和文字
    ctx.textBaseline = 'top'
    ctx.font = '14px "Arial"'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('🎮 XDDQ Browser Check', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('Canvas Fingerprint 🔒', 4, 17)

    // 转换为 Data URL 并计算哈希
    const dataURL = canvas.toDataURL()
    return simpleHash(dataURL)
  } catch (e) {
    return ''
  }
}

/**
 * 生成 WebGL 指纹
 */
export function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return ''

    // 获取 WebGL 参数
    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info')
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''

    return simpleHash(`${vendor}|${renderer}`)
  } catch (e) {
    return ''
  }
}

/**
 * 获取屏幕分辨率
 */
export function getScreenResolution(): string {
  return `${window.screen.width}x${window.screen.height}`
}

/**
 * 获取时区偏移（分钟）
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset()
}

/**
 * 获取平台信息
 */
export function getPlatform(): string {
  return navigator.platform
}

/**
 * 生成完整的浏览器指纹
 */
export async function generateBrowserFingerprint() {
  // 延迟生成，确保 Canvas/WebGL 可用
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    userAgent: navigator.userAgent,
    acceptLanguage: navigator.language || (navigator as any).userLanguage,
    acceptEncoding: 'gzip, deflate, br',
    accept: 'application/json, text/plain, */*',
    canvasHash: getCanvasFingerprint(),
    webglHash: getWebGLFingerprint(),
    screenResolution: getScreenResolution(),
    timezone: getTimezoneOffset(),
    platform: getPlatform()
  }
}

/**
 * 简单哈希函数（用于生成指纹）
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
