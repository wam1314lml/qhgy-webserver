import { shareProject } from './project'
import {
  SHARE_FORMAT, mergeConfig, projectPatch, sanitizeConfig, validatePayload,
  type ConfigObject, type SharePayload,
} from './core'
import type { ConfigShareAdapter } from './adapter'
const groupNames: Record<string, string> = {"basic":"基础","plant":"种植","order":"订单","union":"公会","activity":"活动","chopTree":"砍树","cave":"洞府","challenge":"挑战","mall":"商城","guild":"公会","outskirts":"城郊","jiangning":"江宁","xiancheng":"县城","others":"其他","largeCity":"大都市","daily":"日常","base":"基础","homeland":"家园","talent":"天赋","wild":"野外","reconnectInterval":"重连设置"}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
export function createProjectShareAdapter<T>(normalize: (config: T) => T,
  migratePatch?: (config: unknown) => void): ConfigShareAdapter<T> {
  return {
    project: shareProject,
    privacyNotice: '不包含账号登录信息和密码。好友、成员名单及高级设置会随配置分享，请仅发给需要的人。',
    applyNotice: '请核对资源消耗、自动购买等设置。应用后仍需点击页面“保存”，不会自动启动账号。',
    exportConfig(current) {
      const config = sanitizeConfig(normalize(clone(current)), shareProject.schema).config
      return { format: SHARE_FORMAT, project: shareProject.id, schemaVersion: shareProject.schemaVersion, config }
    },
    preview(current, input) {
      // 旧字段须在白名单过滤和合并前迁移；只处理码中实际存在的字段，不补默认值。
      if (migratePatch && input !== null && typeof input === 'object' && !Array.isArray(input)) {
        input = clone(input)
        migratePatch((input as SharePayload).config)
      }
      const payload = validatePayload(input, shareProject)
      const ignored = sanitizeConfig((input as SharePayload).config, shareProject.schema).ignored
      const currentObject = current as unknown as ConfigObject
      const merged = mergeConfig(currentObject, payload.config, shareProject.schema)
      const normalized = normalize(clone(merged.config) as unknown as T) as unknown as ConfigObject
      const normalizedBase = normalize(clone(current)) as unknown as ConfigObject
      const importedPaths = new Set(mergeConfig({}, payload.config, shareProject.schema).changes.map(item => item.path))
      const effects = mergeConfig(normalizedBase, sanitizeConfig(normalized, shareProject.schema).config, shareProject.schema)
      if (effects.changes.some(change => !importedPaths.has(change.path))) {
        throw new Error('此分享配置与当前设置存在关联冲突，会影响码中未包含的选项；请先调整相关设置后再导入')
      }
      const final = mergeConfig(currentObject, projectPatch(payload.config, normalized, shareProject.schema), shareProject.schema)
      const groups = Object.keys(shareProject.schema.type === 'object' ? shareProject.schema.properties : {}).map(key => ({
        name: groupNames[key] || key, count: final.changes.filter(change => change.path === key || change.path.startsWith(`${key}.`)).length,
      })).filter(group => group.count > 0)
      return { config: final.config as unknown as T, groups, count: final.changes.length, ignored }
    },
  }

}
