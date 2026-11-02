// 与后端二级代理角色保持一致；界面判断只控制展示，实际授权仍由后端校验。
export const SECOND_LEVEL_AGENT_ROLES: readonly string[] = ['vip1', 'vip2', 'vip3']

export function isSecondLevelAgentRole(role: unknown): boolean {
  return typeof role === 'string' && SECOND_LEVEL_AGENT_ROLES.includes(role)
}
