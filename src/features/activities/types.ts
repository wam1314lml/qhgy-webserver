export type ActivityType = 'guild_rally' | 'sign_in'
export type RewardType = 'card' | 'points' | 'time'
export interface RewardOption { id: string; type: RewardType; value: number }
export interface ActivityReward {
  id: string
  label: string
  kind: 'guild' | 'daily' | 'cumulative'
  threshold: number
  options: RewardOption[]
}
export interface ActivityConfig {
  id: number
  type: ActivityType
  title: string
  description: string
  backgroundUrl?: string | null
  startAt: number
  endAt: number
  enabled: boolean
  quota?: { days: number; points: number; maxPerRole: number } | null
  rewards: ActivityReward[]
  hasParticipation?: boolean
  canDelete?: boolean
  status?: 'upcoming' | 'active' | 'ended' | 'disabled'
}
export interface ActivityAccount {
  id: number
  nickname: string
  serverName: string
  expireTime: string | number | null
}
export interface GuildProgress {
  accountId: number
  participationId?: number
  nickname: string
  unionId: string
  unionName: string
  participants: number
  allocationCount: number
  canAllocate: boolean
  canPrepare?: boolean
  requiresGuildSync?: boolean
  firstPoints?: number
  preparation?: AllocationPreparation
  reason?: string
}
export interface AllocationPreparation {
  id: number
  accountId: number
  firstDays: number
  paidPoints: number
  remainingDays: number
  remainingPoints: number
  createdAt: number
  completed: boolean
}
export interface AllocationSyncStatus {
  completed: boolean
  ready?: boolean
  message?: string
  guild?: { unionId: string; unionName: string }
}
export interface RewardState {
  rewardId: string
  participationId?: number
  day?: string
  accountId?: number
  eligible: boolean
  claimed: boolean
}
export interface ActivityView extends ActivityConfig {
  status: 'upcoming' | 'active' | 'ended' | 'disabled'
  guilds: GuildProgress[]
  signIn?: { signedToday: boolean; totalDays: number; canSignIn: boolean; reason?: string; days?: string[]; today?: string }
  rewardStates: RewardState[]
}
export interface ActivityData {
  activities: ActivityView[]
  accounts: ActivityAccount[]
  hasPending: boolean
}
export interface ActivityClaim {
  id: number
  activityId: number
  title: string
  rewardLabel: string
  type: RewardType
  value: number
  cardCode?: string
  targetNickname?: string
  createdAt: number | string
}
