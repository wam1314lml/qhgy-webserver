// WebCrypto RSA-OAEP(SHA-256) 加密工具
// 注意：需在 HTTPS 环境或 localhost 下运行

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const spki = pemToArrayBuffer(pem)
  return await crypto.subtle.importKey('spki', spki, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, [
    'encrypt',
  ])
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer
}

function arrayBufferToBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function encryptWithOaepSha256(publicKeyPem: string, data: string): Promise<string> {
  if (!publicKeyPem || publicKeyPem.length < 100) throw new Error('Invalid PUBLIC KEY')
  const key = await importPublicKey(publicKeyPem)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    stringToArrayBuffer(data),
  )
  return arrayBufferToBase64(encrypted)
}

export async function generateRequestIdOaep(seed?: string): Promise<string> {
  //old
  // const id = atob(
  //   'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5OW10MEk3eXcvMU1hZnRQUVJtdApubnpjUklLa1ZHMjhzN3Zjem1sNzZaUVNUUHIyV2I0d2dmT0NOWXdBZkxTUitjdXo0cXc4eGxHa0V1OUFyR2hrCnRMaUExUmFZM3dqclJaQkZUODhERlpoNTdLUWxPTjNMaHNpVXJkUmNBeU5qeEVTM1MxM1VCRnpQZkJOdGRLeVkKdk5wb1hUdGRGclU2c01mYVFsOG1RRVpiME9BL2dHSmhDa0J2YTZSVzZrOHZIL2hmZHY2UzF4SjNGZkl4ekMvYwpMOVY0dGNoRHc4dVQwSDRNdy9DeXRsVUEyUCtINXVqYnBvT0xnVHpIdHo1Ym1QTTJkVythQWRWc1pBMmZQTzloCkVNbGp3M2djS3lvQ0ZwcWt0di9JSVJyYVoxZlhydytrbzNGL1R6bEdvUzJRbU5ManNHRzl1TFY1MGRXVUxRWlMKNndJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t',
  // )
  const id = atob(
    'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFzdlNjNEFLTzREMHo2Z0tHVEFHbwpHSm1aMGhHOHd0REt4WkVsVjZtSC9yUUowVlYwZDAvd1h2R3lEYXd5NERZS0d4UlV0VkwzNXNHejYxN1BRTUFwCmJ0QXViNG8rRURsMVN1bFAxOFRPQUlVMmFHQkc2aHdsUWx5WHFxclRoZjlwY3lBR2EzR0NxK0RhRy9mZUdPbUUKajU2RkIwSTZiVlhQU0pFeENvZUp0aytTQmFKV2FxQ3J1dDlycFVLQ1dzWEZtWTl4NjJqTkZlYzRJTXJYS2lVNwozNHJzUWVCNy9QY0FjYXZHOHU2NTkwWS8yeGRVRFhsbUsvUk5JSUdJWE9VUUNiL0x2Tlp1amtvMkQ0S0JsWHQ5Ck4xMGRjMjhNcEN4SHhGeU1qOSszVHJDcUJGYWpXd0g0WVFyUnFqT3NTSEFGVVE5OUVMaXlKMmJrejRpd1FBbU8Kb1FJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t',
  )
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2)
  const original = seed || 'XMLHttpRequest'
  const payload = `${original}_${timestamp}_${random}`
  return await encryptWithOaepSha256(id, payload)
}
