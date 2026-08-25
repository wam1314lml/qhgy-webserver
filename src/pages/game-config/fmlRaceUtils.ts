export const DEFAULT_MIN_TASK_SCORE = 25
export const DEFAULT_MIN_UPGRADE_TASK_SCORE = 50

type FmlRaceScoreConfig = {
  minTaskScore: number
  minUpgradeTaskScore: number
  upgradeTask: boolean
  giveuplowscoretask: boolean
}

export function getMinTaskScoreFloor(minUpgradeTaskScore: number): number {
  return Math.floor(Number(minUpgradeTaskScore) / 2)
}

/** 开启放弃低分时校正未升级分数，避免升级后的任务因分数条件被立即放弃 */
export function syncMinTaskScoreForAutoUpgrade(fmlRace: FmlRaceScoreConfig): void {
  if (!fmlRace.giveuplowscoretask) return
  const floor = getMinTaskScoreFloor(fmlRace.minUpgradeTaskScore)
  if (Number(fmlRace.minTaskScore) < floor) {
    fmlRace.minTaskScore = floor
  }
}
