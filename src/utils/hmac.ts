/**
 * HMAC-SHA256 签名工具
 * 使用 Web Crypto API 实现
 */

// 默认客户端密钥（与后端保持一致）
const DEFAULT_CLIENT_SECRET = 'xddq-default-secret-2025'

/**
 * 计算 HMAC-SHA256 签名
 * @param data 要签名的数据
 * @param key 密钥
 * @returns 十六进制签名字符串
 */
export async function hmacSha256(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  
  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // 计算签名
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(data)
  )
  
  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 获取客户端密钥
 * TODO: 从 localStorage 获取登录后服务器下发的专属密钥
 */
export function getClientSecret(): string {
  // 未来可以从 localStorage 获取用户专属密钥
  // const userSecret = localStorage.getItem('clientSecret')
  // return userSecret || DEFAULT_CLIENT_SECRET
  return DEFAULT_CLIENT_SECRET
}

/**
 * 为请求生成签名
 * @param url 请求 URL
 * @param body 请求体（对象）
 * @param timestamp 时间戳
 * @param challenge 挑战码
 * @returns HMAC-SHA256 签名
 */
export async function signRequest(
  url: string,
  body: any,
  timestamp: number,
  challenge: string
): Promise<string> {
  const clientSecret = getClientSecret()
  const bodyStr = JSON.stringify(body || {})
  const signData = `${url}|${bodyStr}|${timestamp}|${challenge}`
  
  return await hmacSha256(signData, clientSecret)
}
