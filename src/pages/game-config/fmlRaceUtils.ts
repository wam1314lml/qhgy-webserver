export const DEFAULT_MIN_TASK_SCORE = 25
export const DEFAULT_MIN_UPGRADE_TASK_SCORE = 50

type FmlRaceScoreConfig = {
  minTaskScore: number
  minUpgradeTaskScore: number
  upgradeTask: boolean
}

export function syncMinTaskScoreForAutoUpgrade(fmlRace: FmlRaceScoreConfig): void {
  if (!fmlRace.upgradeTask) return
  fmlRace.minTaskScore = Math.floor(Number(fmlRace.minUpgradeTaskScore) / 2)
}
