import { addListener, launch, stop } from 'devtools-detector'

/**
 * 处理页面可见性变化
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    // 页面不可见时停止检测
    stop()
  } else {
    // 页面可见时重新开始检测
    launch()
  }
}

/**
 * 初始化一个全局监听器，用于检测开发者工具并自动跳转到空白页。
 */
export function initDevToolsProtection(): void {
  // 确保只在浏览器环境中执行
  if (typeof window === 'undefined') {
    return
  }

  // 添加监听器，监听开发者工具打开/关闭状态
  addListener((isOpen: boolean) => {
    if (isOpen) {
      window.location.href = 'about:blank'
    }
  })

  // 添加页面可见性变化监听
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 启动检测
  launch()
}
