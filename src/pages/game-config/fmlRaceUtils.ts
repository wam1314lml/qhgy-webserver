export const DEFAULT_MIN_TASK_SCORE = 25
export const DEFAULT_MIN_UPGRADE_TASK_SCORE = 50

type FmlRaceScoreConfig = {
  minTaskScore: number
  minUpgradeTaskScore: number
  upgradeTask: boolean
}

export function getMinTaskScoreFloor(minUpgradeTaskScore: number): number {
  return Math.floor(Number(minUpgradeTaskScore) / 2)
}

/** 开启自动升级时，仅当未升级分数低于升级后/2 才自动抬高，否则保留玩家设置 */
export function syncMinTaskScoreForAutoUpgrade(fmlRace: FmlRaceScoreConfig): void {
  if (!fmlRace.upgradeTask) return
  const floor = getMinTaskScoreFloor(fmlRace.minUpgradeTaskScore)
  if (Number(fmlRace.minTaskScore) < floor) {
    fmlRace.minTaskScore = floor
  }
}
