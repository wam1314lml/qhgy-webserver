import type { GameConfig } from './types'
import {
  actDessertSpeedOptions,
  actElimSpeedOptions,
  actMerge2SpeedOptions,
  actSpoolSpeedOptions,
  artSellModeOptions,
  buyModeOptions,
  elfOptions,
  fishFunSpeedOptions,
  flowerArtOptions,
  flowerCountOptions,
  flowerQualityOptions,
  landGroupSizeOptions,
  getFlowerPickerOptions,
  getSpecifiedArtsFullPickerOptions,
  plantingModeOptions,
  priceIndexOptions,
  putModeOptions,
  qualitySpecificModeOptions,
  stealModeOptions,
  unionLandPlantModeOptions,
} from './options'
import { ensureMultiSelectValue, ensureSingleSelectValue } from '../../utils/selectDefaults'
import { syncMinTaskScoreForAutoUpgrade } from './fmlRaceUtils'

const DEFAULT_LOW_STOCK_THRESHOLD = 500
const DEFAULT_UNION_LAND_LOW_STOCK_THRESHOLD = 1000
const DEFAULT_FREE_STYLE_TEMPLATE = '我的方案A'
const MAX_FREE_STYLE_TEMPLATES = 5
const FIXED_FREE_STYLE_TEMPLATE_NAMES = [
  '我的方案A',
  '我的方案B',
  '我的方案C',
  '我的方案D',
  '我的方案E',
]

function normalizeThreshold(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return DEFAULT_LOW_STOCK_THRESHOLD
  return Math.min(999999, Math.max(1, Math.floor(numberValue)))
}

function normalizeUnionLandLowStockThreshold(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return DEFAULT_UNION_LAND_LOW_STOCK_THRESHOLD
  return Math.min(9999999, Math.max(1, Math.floor(numberValue)))
}

function normalizePlayerNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(value.map((item) => String(item).trim()).filter(Boolean)),
  )
}

function normalizeDeleteUnclaimedMinutes(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return 60
  return Math.min(999, Math.max(1, Math.floor(numberValue)))
}

function normalizeGuildRaceTaskPriority(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return 3
  return Math.min(10, Math.max(1, Math.floor(numberValue)))
}

/** 配置页所有单选/多选为空时，补齐为对应选项列表的第一项 */
export function normalizeGameConfigSelects(config: GameConfig): void {
  const flower = config.plant.flower
  flower.qualities = ensureMultiSelectValue(flower.qualities, flowerQualityOptions)
  flower.specificFlowerIds = ensureMultiSelectValue(
    flower.specificFlowerIds,
    getFlowerPickerOptions(flower.specificFlowerIds),
  )
  flower.flowerCount = ensureSingleSelectValue(flower.flowerCount, flowerCountOptions)
  flower.landGroupSize = ensureSingleSelectValue(flower.landGroupSize, landGroupSizeOptions)
  if (flower.groupWaterEnabled === undefined && (flower as { groupWater?: boolean }).groupWater !== undefined) {
    flower.groupWaterEnabled = !!(flower as { groupWater?: boolean }).groupWater
    delete (flower as { groupWater?: boolean }).groupWater
  }
  flower.plantingMode = ensureSingleSelectValue(flower.plantingMode, plantingModeOptions)
  flower.taskPriorityConfig['公会竞赛'] = normalizeGuildRaceTaskPriority(
    flower.taskPriorityConfig['公会竞赛'],
  )
  flower.lowStockThreshold = normalizeThreshold(flower.lowStockThreshold)
  if (!Array.isArray(flower.freeStyleList) || flower.freeStyleList.length === 0) {
    flower.freeStyleList = [{ name: DEFAULT_FREE_STYLE_TEMPLATE, lands: {} }]
  }
  flower.freeStyleList = flower.freeStyleList
    .slice(0, MAX_FREE_STYLE_TEMPLATES)
    .map((item, index) => ({
      name: String(item?.name || FIXED_FREE_STYLE_TEMPLATE_NAMES[index]),
      lands: item?.lands && typeof item.lands === 'object' ? item.lands : {},
    }))
  while (flower.freeStyleList.length < MAX_FREE_STYLE_TEMPLATES) {
    const index = flower.freeStyleList.length
    flower.freeStyleList.push({
      name: FIXED_FREE_STYLE_TEMPLATE_NAMES[index],
      lands: {},
    })
  }
  const currentTemplate = flower.freeStyleTemplate || flower.freeStyleList[0]?.name
  const matchedTemplate = flower.freeStyleList.find((item) => item.name === currentTemplate)
  flower.freeStyleTemplate = matchedTemplate?.name || flower.freeStyleList[0].name

  const friendSteal = config.plant.friendSteal
  friendSteal.stealQualities = ensureMultiSelectValue(friendSteal.stealQualities, flowerQualityOptions)
  friendSteal.stealFlowerIds = ensureMultiSelectValue(
    friendSteal.stealFlowerIds,
    getFlowerPickerOptions(friendSteal.stealFlowerIds),
  )
  friendSteal.excludeFlowerIds = ensureMultiSelectValue(
    friendSteal.excludeFlowerIds,
    getFlowerPickerOptions(friendSteal.excludeFlowerIds),
  )
  friendSteal.stealMode = ensureSingleSelectValue(friendSteal.stealMode, stealModeOptions)
  const buyStealCount = Number(friendSteal.buyStealCount)
  friendSteal.buyStealCount = Number.isFinite(buyStealCount)
    ? Math.min(10, Math.max(1, Math.floor(buyStealCount)))
    : 10

  config.plant.elves.selectedElvesIds = ensureMultiSelectValue(
    config.plant.elves.selectedElvesIds,
    elfOptions,
  )
  config.plant.elves.helpFrdMode = 'limit3'

  config.plant.artSell.artSellMode = ensureSingleSelectValue(
    config.plant.artSell.artSellMode ||
      (config.plant.artSell.specifiedArtsFull?.length ? 'full' : 'vase'),
    artSellModeOptions,
  )
  config.plant.artSell.specifiedArts = ensureMultiSelectValue(
    config.plant.artSell.specifiedArts,
    flowerArtOptions,
  )
  config.plant.artSell.specifiedArtsFull = ensureMultiSelectValue(
    config.plant.artSell.specifiedArtsFull,
    getSpecifiedArtsFullPickerOptions(config.plant.artSell.specifiedArtsFull),
  )
  config.plant.artSell.artFirstMake = !!config.plant.artSell.artFirstMake

  const market = config.plant.market
  market.putMode = ensureSingleSelectValue(market.putMode, putModeOptions)
  market.priceIndex = ensureSingleSelectValue(market.priceIndex, priceIndexOptions)
  market.buyMode = ensureSingleSelectValue(market.buyMode, buyModeOptions)
  market.specificFlowerIds = ensureMultiSelectValue(
    market.specificFlowerIds,
    getFlowerPickerOptions(market.specificFlowerIds),
  )
  market.buySpecificFlowerIds = ensureMultiSelectValue(
    market.buySpecificFlowerIds,
    getFlowerPickerOptions(market.buySpecificFlowerIds),
  )
  market.buyQualities = ensureMultiSelectValue(market.buyQualities, flowerQualityOptions)
  market.excludeFlowerIds = Array.isArray(market.excludeFlowerIds)
    ? market.excludeFlowerIds
    : []

  config.order.resident.qualities = ensureMultiSelectValue(
    config.order.resident.qualities,
    flowerQualityOptions,
  )
  config.order.palace.qualities = ensureMultiSelectValue(
    config.order.palace.qualities,
    flowerQualityOptions,
  )
  config.order.team.qualities = ensureMultiSelectValue(
    config.order.team.qualities,
    flowerQualityOptions,
  )

  const land = config.union.land
  land.plantMode = ensureSingleSelectValue(land.plantMode, unionLandPlantModeOptions)
  land.lowStockThreshold = normalizeUnionLandLowStockThreshold(land.lowStockThreshold)
  land.flowers = ensureMultiSelectValue(land.flowers, flowerQualityOptions)
  land.specificFlowerIds = ensureMultiSelectValue(
    land.specificFlowerIds,
    getFlowerPickerOptions(land.specificFlowerIds),
  )

  const unionFlower = config.union.flower
  unionFlower.shareMode = ensureSingleSelectValue(unionFlower.shareMode, qualitySpecificModeOptions)
  unionFlower.takeMode = ensureSingleSelectValue(unionFlower.takeMode, qualitySpecificModeOptions)
  unionFlower.shareQualities = ensureMultiSelectValue(
    unionFlower.shareQualities,
    flowerQualityOptions,
  )
  unionFlower.shareFlowerIds = ensureMultiSelectValue(
    unionFlower.shareFlowerIds,
    getFlowerPickerOptions(unionFlower.shareFlowerIds),
  )
  unionFlower.takeQualities = ensureMultiSelectValue(
    unionFlower.takeQualities,
    flowerQualityOptions,
  )
  unionFlower.takeFlowerIds = ensureMultiSelectValue(
    unionFlower.takeFlowerIds,
    getFlowerPickerOptions(unionFlower.takeFlowerIds),
  )

  config.activity.fishFun.speed = ensureSingleSelectValue(
    config.activity.fishFun.speed,
    fishFunSpeedOptions,
  )
  config.activity.actElim.speed = ensureSingleSelectValue(
    config.activity.actElim.speed,
    actElimSpeedOptions,
  )
  config.activity.actDessert.speed = ensureSingleSelectValue(
    config.activity.actDessert.speed,
    actDessertSpeedOptions,
  )
  config.activity.actMerge2.speed = ensureSingleSelectValue(
    config.activity.actMerge2.speed,
    actMerge2SpeedOptions,
  )
  config.activity.actSpool.speed = ensureSingleSelectValue(
    config.activity.actSpool.speed,
    actSpoolSpeedOptions,
  )

  const fmlRace = config.union.fmlRace
  fmlRace.othersUpgradeTaskMode = !!fmlRace.othersUpgradeTaskMode
  fmlRace.onlySpecifiedUpgradeTask = !!fmlRace.onlySpecifiedUpgradeTask
  fmlRace.excludeOthersUpgradeTask = !fmlRace.onlySpecifiedUpgradeTask
  fmlRace.specifiedUpgradePlayers = normalizePlayerNames(fmlRace.specifiedUpgradePlayers)
  fmlRace.deleteUnclaimedTask = !!fmlRace.deleteUnclaimedTask
  fmlRace.deleteUnclaimedMinutes = normalizeDeleteUnclaimedMinutes(
    fmlRace.deleteUnclaimedMinutes,
  )
  syncMinTaskScoreForAutoUpgrade(config.union.fmlRace)
  normalizeCyclicNoteOrderGuard(config.activity.cyclicNote)
}

function normalizeTimeHM(
  value: unknown,
  fallbackHour: number,
  fallbackMinute: number,
): string {
  const parts = String(value ?? '').split(':')
  let hour = Number(parts[0])
  let minute = Number(parts[1])
  if (!Number.isFinite(hour)) hour = fallbackHour
  if (!Number.isFinite(minute)) minute = fallbackMinute
  hour = Math.min(23, Math.max(0, Math.floor(hour)))
  minute = Math.min(59, Math.max(0, Math.floor(minute)))
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizeCyclicNoteOrderGuard(
  cyclicNote: GameConfig['activity']['cyclicNote'],
): void {
  if (!cyclicNote.orderGuard) {
    cyclicNote.orderGuard = { enabled: false, timeRanges: [{ start: '00:00', end: '21:00' }] }
  }
  cyclicNote.orderGuard.enabled = !!cyclicNote.orderGuard.enabled
  if (
    !Array.isArray(cyclicNote.orderGuard.timeRanges) ||
    cyclicNote.orderGuard.timeRanges.length === 0
  ) {
    cyclicNote.orderGuard.timeRanges = [{ start: '00:00', end: '21:00' }]
  }
  const range = cyclicNote.orderGuard.timeRanges[0]
  cyclicNote.orderGuard.timeRanges[0] = {
    start: normalizeTimeHM(range.start, 0, 0),
    end: normalizeTimeHM(range.end, 21, 0),
  }
}
