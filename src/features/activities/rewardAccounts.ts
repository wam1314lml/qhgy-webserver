import type { ActivityAccount } from './types'

/** 仅用于页面提示；领奖接口仍会锁定目标角色，重新校验归属及有效期。 */
export function canReceiveTimeReward(account: Pick<ActivityAccount, 'expireTime'> | undefined, now = Date.now()): boolean {
  if (account?.expireTime == null) return false
  const expires = typeof account.expireTime === 'number' ? account.expireTime : Date.parse(account.expireTime)
  return Number.isFinite(expires) && expires > now
}
