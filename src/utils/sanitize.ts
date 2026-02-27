import DOMPurify from 'dompurify'

/**
 * XSS 防护工具函数
 * 使用 DOMPurify 清理 HTML 内容，防止 XSS 攻击
 */

/**
 * 清理 HTML 内容，允许安全的 HTML 标签
 * 适用于富文本内容（如公告）
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span', 'div', 
      'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'rel'],
    ALLOW_DATA_ATTR: false,
    // 只允许安全的 URL 协议
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // 添加 rel="noopener noreferrer" 到所有外部链接
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout']
  })
}

/**
 * 清理纯文本，移除所有 HTML 标签
 * 适用于不需要任何格式的文本
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return ''
  
  return DOMPurify.sanitize(dirty, { 
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true 
  })
}

/**
 * 清理日志内容，保留 ANSI 颜色相关的 span 标签
 * 适用于日志显示
 */
export function sanitizeLog(dirty: string): string {
  if (!dirty) return ''
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['span', 'div', 'br'],
    ALLOWED_ATTR: ['style', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'a', 'img'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'href', 'src']
  })
}

/**
 * 转义 HTML 特殊字符
 * 适用于需要显示原始 HTML 代码的场景
 */
export function escapeHtml(text: string): string {
  if (!text) return ''
  
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
