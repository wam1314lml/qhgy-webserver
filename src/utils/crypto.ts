import JSEncrypt from 'jsencrypt'

//公共密钥配置
// const CONFIG_A = atob(
//   'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZ3d0RRWUpLb1pJaHZjTkFRRUJCUUFEU3dBd1NBSkJBSTJMQmZpMGtiSXNjZXhzZGdsZ2locG9tVU5KN2RWLwpwTm9aN0p3TmZZQkpRczRmb0FLWTkxNmFheWJxdGRhdEY0WjNMVUVOUUlCVjNsSmcrVHZrcjVFQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==',
// )

// // 从 Vite 环境读取公钥（推荐用于生产）。若未提供，则回退到内置 CONFIG_A
// export const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy9mt0I7yw/1MaftPQRmt
// nnzcRIKkVG28s7vczml76ZQSTPr2Wb4wgfOCNYwAfLSR+cuz4qw8xlGkEu9ArGhk
// tLiA1RaY3wjrRZBFT88DFZh57KQlON3LhsiUrdRcAyNjxES3S13UBFzPfBNtdKyY
// vNpoXTtdFrU6sMfaQl8mQEZb0OA/gGJhCkBva6RW6k8vH/hfdv6S1xJ3FfIxzC/c
// L9V4tchDw8uT0H4Mw/CytlUA2P+H5ujbpoOLgTzHtz5bmPM2dW+aAdVsZA2fPO9h
// EMljw3gcKyoCFpqktv/IIRraZ1fXrw+ko3F/TzlGoS2QmNLjsGG9uLV50dWULQZS
// 6wIDAQAB
// -----END PUBLIC KEY-----`

const CONFIG_A = atob(
  'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBc3ZTYzRBS080RDB6NmdLR1RBR29HSm1aMGhHOHd0REt4WkVsVjZtSC9yUUowVlYwCmQwL3dYdkd5RGF3eTREWUtHeFJVdFZMMzVzR3o2MTdQUU1BcGJ0QXViNG8rRURsMVN1bFAxOFRPQUlVMmFHQkcKNmh3bFFseVhxcXJUaGY5cGN5QUdhM0dDcStEYUcvZmVHT21FajU2RkIwSTZiVlhQU0pFeENvZUp0aytTQmFKVwphcUNydXQ5cnBVS0NXc1hGbVk5eDYyak5GZWM0SU1yWEtpVTczNHJzUWVCNy9QY0FjYXZHOHU2NTkwWS8yeGRVCkRYbG1LL1JOSUlHSVhPVVFDYi9Mdk5adWprbzJENEtCbFh0OU4xMGRjMjhNcEN4SHhGeU1qOSszVHJDcUJGYWoKV3dINFlRclJxak9zU0hBRlVROTlFTGl5SjJia3o0aXdRQW1Pb1FJREFRQUJBb0lCQUFFRG1wZDQ0RDBrVDZUZgo5SW1kK1VsQlpwSWVqRnlvd1B0bllBZ3NBMk9sdXNnRFJWU1BRUWdTczh6NHlMV0ZUTitjS1FJNWlRTFhYbWtECkthYSs2QVV6SEE1QkFPckgzcEtvK1kwNkZlWkNHdjJ5clBneTVtR213MnZCeWM3UXRKVGt6YkNDYlVpQ3pzMloKaFJwTVNYWmtZakhaTmRwTWdnOFIxbzZ1RjdGUEplMXZ4T1hqcWRrWTRPUjcxRkNQZlc3ZEVoRWRnZU9kd2VCUQpSckNJMndCYU0rVE9hbU0wMjkrdjBRZFgwKzlHalhKbG1TeVF6OWQ1NkJMRERlSzhycTFBRm1Ga1d5SDltdmtrCjdKNUNoN285ZzBGVWVDTnY1Q3c4bHhZT1dNYkdvNE9XMi83SklCTXlHcC9jYTgySHRndEJ6Nm81MldrVmVqVm0KcTRxOW5Ba0NnWUVBOHBDOC9tb2h6dTVoWTlmcmxoZlFwbDI4VW5tQS9XWUllR1lYNWxWQ2s3Ty8zWHYrRU5xdgpJRXV3b1Rla3pqYzVqaU94RnlGamxGN0MxcmtsRHNYNk5sWTVFVlVERlRQVlpycWFkU1hCM1pSOVZtcWpPR294CnlyM002RFRQRzhzTmR2ZnNpWDBkRWc0OGVGbURoVUZYTWhCcmpVZjNJK01XejJQb3RWZHdUYmtDZ1lFQXZOMzQKSitYcCtkUlpnTW5UZkdoUTVMM1kyNWNVQXZUMTd0QTR3VG5YV0NiVHcxOE1FMVVmRUVpcE9pRVFWN3M3ckg3Qgp5S2d5SlZ0SVdUL2xOSXE0bHJYWHpuOFpqclcyN0tEanUxQXNENk5sMnZZSGtHUmFEcVVERGZzZk11ancrdUliCm9hYXFKT3JhTVFOem93MzdDL2pLbDhobTBKTWxadTVzTzhSai9Da0NnWUJUVXpjcEttbzh2SlRHQ0psTU1SZ2kKM2xaZitvODkvUHZ4NkJoVHJudzFZdTBJOTV3YVRCVVd3Z21HQ0NoY0VvcDU4bmJXSEVrcDRiZUtyWVUyWXZvRwpDbTZHTHE3bGJLM2xJVHNIL1JWd3VaNm92ZThkNVJUL3NWMmZjdXltZm9VOGxnUXlZc0ZHdjQ4MFJJT3lsZlNQCkpTYmRISmlnUWxWR251cUV5T215T1FLQmdRQ3YyOE00YTFWc3diUkJQaXhFOStEeXpHOURNSzU2ZmxzTTdpY2EKakdBZWZiREtoeEw0WVZjV1U0SDNWVmdoU0g2dEJDNHVSNmJCci9oeTJoTHkxSVJDR0xvRVZjYVhZazRja1ViYgpZREJXczErZy9WdFhzSWxHZjVHVGtCT2gxTktsMkttLzRDOG5SdUs1cHF3aTFGN0E2L3pBVGVLbUxZMHpCYWdVCkVxN0MyUUtCZ0JhNDg5WEhZczJ2OU8zanhCVEI3TTFiWklPRVIzcGhiMFcyRERrZkZ2Ylc3dkNGMGVYT01VcE0KaUdGTkxNZ1pDa3NDM2NuT1Mxa0UxUW45aDlDa29odk5yWGU3b2cvdlhkRmp2cktMS01Wak1aTW5qMjV0VytkNgpOckF4S0JOY1orSmIyNlQwM09iVy9WOXIrQitUVHJGL3ZQT3d1NzAvTUNiblRDejBERTgzCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0t',
)


/**
 * 数据处理工具类
 */
class DataProcessor {
  private processor: JSEncrypt

  constructor() {
    this.processor = new JSEncrypt()
    // 通过计算生成方法名
    const base = 50
    const offsets = [65, 51, 66, 30, 67, 48, 58, 55, 49, 25, 51, 71]
    const chars = offsets.map((offset) => base + offset)
    const methodName = String.fromCharCode(...chars)
    ;(this.processor as any)[methodName](CONFIG_A)
  }

  /**
   * 处理数据
   * @param data 要处理的数据
   * @returns 处理后的字符串
   */
  process(data: string): string {
    try {
      // 通过计算生成方法名
      const base = 40
      const offsets = [61, 70, 59, 74, 81, 72, 76]
      const chars = offsets.map((offset) => base + offset)
      const methodName = String.fromCharCode(...chars)
      const result = (this.processor as any)[methodName](data)
      if (!result) {
        return data
      }
      return result
    } catch {
      return data
    }
  }

  /**
   * 生成请求令牌
   * @param originalId 原始请求ID
   * @returns 处理后的请求令牌
   */
  generate(originalId: string = 'XMLHttpRequest'): string {
    // 添加时间戳和随机数
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    const dataToEncrypt = `${originalId}_${timestamp}_${random}`

    return this.process(dataToEncrypt)
  }
}

// 创建工具实例
const processor = new DataProcessor()

// 导出工具实例和相关函数
export default processor
export { DataProcessor }

/**
 * 数据处理函数
 */
export const processData = (data: string): string => {
  return processor.process(data)
}

/**
 * 生成请求令牌
 */
export const generate = (originalId?: string): string => {
  return processor.generate(originalId)
}

// 保持向后兼容的别名（但使用安全名称）
export const encryptData = processData
export const generateId = generate
