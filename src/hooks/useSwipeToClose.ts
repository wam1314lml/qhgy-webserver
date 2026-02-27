import { ref, onMounted, onUnmounted } from 'vue'

interface UseSwipeToCloseOptions {
  onClose: () => void
  threshold?: number // 滑动距离阈值，默认100px
  enabled?: boolean // 是否启用，默认true
  edgeThreshold?: number // 仅当从屏幕左侧多少像素内起手才触发，默认24
  ignoreSelectors?: string[] // 这些区域内的手势不触发关闭
}

export const useSwipeToClose = ({ 
  onClose, 
  threshold = 100, 
  enabled = true,
  edgeThreshold = 24,
}: UseSwipeToCloseOptions) => {
  const elementRef = ref<HTMLDivElement>()
  const touchStartRef = ref<{ x: number; y: number; time: number } | null>(null)
  const ignoreSwipeRef = ref<boolean>(false)

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    const startX = touch.clientX

    // 默认仅左侧边缘起手才允许触发关闭
    const isFromLeftEdge = startX <= edgeThreshold

    // 只有当触摸开始时就在标签区域内才忽略，其他情况允许滑动
    const target = e.target as Element | null
    const isStartingInTabArea = target && (
      target.closest('.config-sidebar') || 
      target.closest('.tab-button') ||
      target.closest('.log-categories') ||
      target.closest('.category-tab')
    )

    ignoreSwipeRef.value = !isFromLeftEdge || !!isStartingInTabArea

    touchStartRef.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.value || ignoreSwipeRef.value || !elementRef.value) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.value.x
    const deltaY = touch.clientY - touchStartRef.value.y

    // 如果是垂直滑动，不处理
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return
    }

    // 如果是向右滑动且距离足够，添加视觉反馈
    if (deltaX > 20) {
      elementRef.value.style.transform = `translateX(${Math.min(deltaX * 0.3, 50)}px)`
      elementRef.value.style.opacity = `${Math.max(1 - deltaX / 300, 0.7)}`
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.value || ignoreSwipeRef.value || !elementRef.value) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.value.x
    const deltaY = touch.clientY - touchStartRef.value.y
    const deltaTime = Date.now() - touchStartRef.value.time

    // 重置样式
    elementRef.value.style.transform = ''
    elementRef.value.style.opacity = ''

    // 判断是否为有效的左滑手势
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
    const isRightSwipe = deltaX > threshold
    const isFastSwipe = deltaTime < 300 && deltaX > 50

    if (isHorizontalSwipe && (isRightSwipe || isFastSwipe)) {
      // 移动端调试：显示一个简短的提示
      const toast = document.createElement('div')
      toast.textContent = '左滑关闭触发！'
      toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: #10b981; color: white; padding: 8px 16px;
        border-radius: 6px; z-index: 99999; font-size: 14px;
      `
      document.body.appendChild(toast)
      setTimeout(() => document.body.removeChild(toast), 1500)
      
      onClose()
    }

    touchStartRef.value = null
  }

  const handleTouchCancel = () => {
    if (!elementRef.value) return
    // 重置样式
    elementRef.value.style.transform = ''
    elementRef.value.style.opacity = ''
    touchStartRef.value = null
    ignoreSwipeRef.value = false
  }

  onMounted(() => {
    if (!enabled || !elementRef.value) return

    const element = elementRef.value
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true })
  })

  onUnmounted(() => {
    if (!elementRef.value) return

    const element = elementRef.value
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchcancel', handleTouchCancel)
  })

  return elementRef
}