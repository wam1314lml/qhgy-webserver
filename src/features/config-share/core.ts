/** 可跨项目复制的纯配置协议；禁止依赖 Vue、账号信息或网络连接。 */
export const SHARE_FORMAT = 1
export const SHARE_TTL_SECONDS = 86400
export const MAX_CONFIG_BYTES = 48 * 1024
export const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{16}$/

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type ConfigObject = { [key: string]: Json }
export type Schema =
  | { type: 'boolean' | 'number' | 'string' | 'id' | 'scalar' | 'json' }
  | { type: 'array'; item: Schema }
  | { type: 'record'; value: Schema; keyPattern: string }
  | { type: 'object'; properties: Record<string, Schema> }
export interface ShareProject { id: string; name: string; schemaVersion: number; schema: Schema }
export interface SharePayload { format: number; project: string; schemaVersion: number; config: ConfigObject }
export interface ShareResult extends SharePayload { code: string; createdAt: number; expiresAt: number }
export interface ConfigChange { path: string; before: Json | undefined; after: Json }

const blockedKeys = new Set(['__proto__', 'prototype', 'constructor'])
export const sensitiveKey = /password|passwd|(?:access|refresh|auth|login|api)?token$|(?:client|app|api)?secret$|cookie|openid|authorization|session|deviceid|apikey/i
export const isObject = (value: unknown): value is ConfigObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

/** 先检查所有键（含未知字段），再执行白名单过滤。 */
export function assertSafeJson(value: unknown): asserts value is Json {
  let nodes = 0
  function visit(item: unknown, depth: number): void {
    if (++nodes > 12000 || depth > 12) throw new Error('配置层级或项目数量超过限制')
    if (item === null || typeof item === 'boolean') return
    if (typeof item === 'number' && Number.isFinite(item) && Math.abs(item) <= 1e12) return
    if (typeof item === 'string' && item.length <= 256) return
    if (Array.isArray(item)) {
      if (item.length > 1024) throw new Error('单个配置列表最多支持 1024 项')
      for (const entry of item) visit(entry, depth + 1)
      return
    }
    if (isObject(item)) {
      if (Object.keys(item).length > 512) throw new Error('配置对象项目过多')
      for (const [key, entry] of Object.entries(item)) {
        if (blockedKeys.has(key) || key.length > 100) throw new Error('配置含有不允许的字段')
        visit(entry, depth + 1)
      }
      return
    }
    throw new Error('配置含有不支持的值或过长文本')
  }
  visit(value, 0)
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_CONFIG_BYTES) {
    throw new Error('配置超过 48 KB，请缩短自定义列表')
  }
}

/** 新增普通字段会自动进入 schema；空数组、动态对象必须显式描述。 */
export function buildSchema(template: unknown, overrides: Record<string, Schema>, path = ''): Schema {
  if (overrides[path]) return overrides[path]
  if (Array.isArray(template)) {
    if (!template.length) throw new Error(`请为新列表声明分享类型：${path}`)
    return { type: 'array', item: buildSchema(template[0], overrides, `${path}[]`) }
  }
  if (isObject(template)) {
    if (!Object.keys(template).length) throw new Error(`请为动态配置对象声明分享类型：${path}`)
    const properties: Record<string, Schema> = {}
    for (const [key, value] of Object.entries(template)) {
      if (blockedKeys.has(key) || sensitiveKey.test(key)) continue
      properties[key] = buildSchema(value, overrides, path ? `${path}.${key}` : key)
    }
    return { type: 'object', properties }
  }
  if (typeof template === 'boolean' || typeof template === 'number' || typeof template === 'string') {
    return { type: typeof template as 'boolean' | 'number' | 'string' }
  }
  throw new Error(`请为配置声明分享类型：${path}`)
}

export function sanitizeConfig(source: unknown, schema: Schema): { config: ConfigObject; ignored: number } {
  assertSafeJson(source)
  if (!isObject(source)) throw new Error('分享配置必须是对象')
  let ignored = 0
  function read(value: Json, rule: Schema, path: string): Json {
    const invalid = () => { throw new Error(`配置类型不正确：${path}`) }
    switch (rule.type) {
      case 'object': {
        if (!isObject(value)) return invalid()
        const result: ConfigObject = {}
        for (const [key, entry] of Object.entries(value)) {
          if (sensitiveKey.test(key) || !Object.prototype.hasOwnProperty.call(rule.properties, key)) { ignored++; continue }
          result[key] = read(entry, rule.properties[key], path ? `${path}.${key}` : key)
        }
        return result
      }
      case 'record': {
        if (!isObject(value)) return invalid()
        const result: ConfigObject = {}
        for (const [key, entry] of Object.entries(value)) {
          if (sensitiveKey.test(key)) { ignored++; continue }
          if (!new RegExp(rule.keyPattern).test(key)) return invalid()
          result[key] = read(entry, rule.value, `${path}.${key}`)
        }
        return result
      }
      case 'array':
        if (!Array.isArray(value)) return invalid()
        return value.map((entry, index) => read(entry, rule.item, `${path}[${index}]`))
      // 部分项目的高级配置允许 JSON，仍受全局大小/深度/原型检查及递归凭据过滤约束。
      case 'json': {
        if (Array.isArray(value)) return value.map((entry, index) => read(entry, rule, `${path}[${index}]`))
        if (!isObject(value)) return value
        const result: ConfigObject = {}
        for (const [key, entry] of Object.entries(value)) {
          if (sensitiveKey.test(key)) { ignored++; continue }
          result[key] = read(entry, rule, `${path}.${key}`)
        }
        return result
      }
      case 'scalar':
        if (typeof value === 'string' || typeof value === 'number') return value
        return invalid()
      case 'id':
        if ((typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) ||
            (typeof value === 'string' && /^\d{1,15}$/.test(value))) return value
        return invalid()
      default:
        if (typeof value !== rule.type) return invalid()
        return value
    }
  }
  return { config: read(source, schema, '') as ConfigObject, ignored }
}

export function validatePayload(value: unknown, project: ShareProject): SharePayload {
  if (!isObject(value) || value.format !== SHARE_FORMAT) throw new Error('分享码版本不支持，请更新页面')
  if (value.project !== project.id) throw new Error('分享码所属项目不匹配')
  if (value.schemaVersion !== project.schemaVersion) throw new Error('配置版本不支持，请更新页面')
  const { config } = sanitizeConfig(value.config, project.schema)
  if (!countFields(config, project.schema)) throw new Error('没有可分享或导入的配置项')
  return { format: SHARE_FORMAT, project: project.id, schemaVersion: project.schemaVersion, config }
}

export function countFields(config: ConfigObject, schema: Schema): number {
  if (schema.type !== 'object') return 1
  return Object.entries(config).reduce((sum, [key, value]) => sum +
    (schema.properties[key]?.type === 'object' && isObject(value)
      ? countFields(value, schema.properties[key]) : 1), 0)
}

/** 固定对象按叶子覆盖，列表/动态映射整体替换；旧码缺少的字段原样保留。 */
export function mergeConfig(current: ConfigObject, patch: ConfigObject, schema: Schema):
  { config: ConfigObject; changes: ConfigChange[] } {
  const changes: ConfigChange[] = []
  function merge(base: ConfigObject, source: ConfigObject, rule: Schema, path: string): ConfigObject {
    const result = { ...base }
    if (rule.type !== 'object') throw new Error('根配置类型不正确')
    for (const [key, value] of Object.entries(source)) {
      const child = rule.properties[key]
      if (!child || blockedKeys.has(key) || sensitiveKey.test(key)) continue
      const fullPath = path ? `${path}.${key}` : key
      if (child.type === 'object' && isObject(value)) {
        result[key] = merge(isObject(base[key]) ? base[key] as ConfigObject : {}, value, child, fullPath)
      } else if (JSON.stringify(base[key]) !== JSON.stringify(value)) {
        result[key] = JSON.parse(JSON.stringify(value)) as Json
        changes.push({ path: fullPath, before: base[key], after: result[key] })
      }
    }
    return result
  }
  return { config: merge(current, patch, schema, ''), changes }
}

/** 只取码中已有字段，归一化不能通过这里增加后来的设置。 */
export function projectPatch(mask: ConfigObject, source: ConfigObject, schema: Schema): ConfigObject {
  const result: ConfigObject = {}
  if (schema.type !== 'object') return result
  for (const key of Object.keys(mask)) {
    const child = schema.properties[key]
    if (!child || !Object.prototype.hasOwnProperty.call(source, key)) continue
    result[key] = child.type === 'object' && isObject(mask[key]) && isObject(source[key])
      ? projectPatch(mask[key] as ConfigObject, source[key] as ConfigObject, child) : source[key]
  }
  return result
}

export function formatShareDate(time: number): string {
  return new Date(time + 8 * 3600000).toISOString().slice(0, 19).replace('T', ' ')
}
export function formatShareText(result: Pick<ShareResult, 'code' | 'createdAt' | 'expiresAt'>, project: ShareProject): string {
  return `杰尼龟~${project.name}~生成:${formatShareDate(result.createdAt)}~有效期:24小时~到期:${formatShareDate(result.expiresAt)}(UTC+8)~${result.code}`
}
export function parseShareText(text: string, project: ShareProject): string {
  if (text.length > 512) throw new Error('分享码文本过长')
  const trimmed = text.trim()
  if (SHORT_CODE_PATTERN.test(trimmed)) return trimmed
  const parts = trimmed.split('~')
  if (parts[0] !== '杰尼龟' || parts[1] !== project.name) throw new Error('请粘贴本项目完整分享文本或 16 位短码')
  const code = parts[parts.length - 1].trim()
  if (parts.length !== 6 || !SHORT_CODE_PATTERN.test(code)) throw new Error('分享码格式不正确')
  // 文本中的时间只供阅读；真实到期时间由服务端 Redis 记录决定。
  return code
}
