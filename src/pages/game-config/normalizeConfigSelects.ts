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

function normalizeDiamondUpgradeReserve(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return 0
  return Math.min(9999999, Math.max(0, Math.floor(numberValue)))
}

function normalizeGuildRaceTaskPriority(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return 3
  return Math.min(10, Math.max(1, Math.floor(numberValue)))
}

function normalizeSpeedUpTicketMode(value: unknown): 'dailyLimit' | 'remainingMinutes' {
  return value === 'remainingMinutes' ? 'remainingMinutes' : 'dailyLimit'
}

function normalizeSpeedUpTicketNumber(
  value: unknown,
  fallback: number,
  max: number,
): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return fallback
  return Math.min(max, Math.max(0, Math.floor(numberValue)))
}

function normalizeFlowerQualities(value: unknown): number[] {
  const allowedValues = new Set(flowerQualityOptions.map((option) => Number(option.value)))
  const normalized = Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && allowedValues.has(item))
    : []
  const uniqueValues = Array.from(new Set(normalized))
  return uniqueValues.length > 0
    ? uniqueValues
    : [Number(flowerQualityOptions[0]?.value ?? 1)]
}

function normalizeArtOptionValues(
  value: unknown,
  options: Array<{ value: string | number }>,
): string[] {
  const allowedValues = new Set(options.map((option) => String(option.value)))
  const normalized = Array.isArray(value)
    ? value
        .map((item) => String(item))
        .filter((item) => allowedValues.has(item))
    : []
  const uniqueValues = Array.from(new Set(normalized))
  if (uniqueValues.length > 0) return uniqueValues
  return options[0] ? [String(options[0].value)] : []
}

/** 配置页所有单选/多选为空时，补齐为对应选项列表的第一项 */
export function normalizeGameConfigSelects(config: GameConfig): void {
  // VIP 商店功能已下线，清理服务端遗留字段，避免旧配置继续生效。
  delete (config.basic.shop as unknown as Record<string, unknown>).vipShop

  const cultivate = config.plant.cultivate
  cultivate.upgradeQualityEnabled = !!cultivate.upgradeQualityEnabled
  cultivate.upgradeQualities = normalizeFlowerQualities(cultivate.upgradeQualities)

  const flower = config.plant.flower
  flower.speedUpTicketMode = normalizeSpeedUpTicketMode(flower.speedUpTicketMode)
  flower.speedUpTicketMinMinutes = normalizeSpeedUpTicketNumber(
    flower.speedUpTicketMinMinutes,
    33,
    99,
  )
  flower.speedUpTicketReserve = normalizeSpeedUpTicketNumber(
    flower.speedUpTicketReserve,
    0,
    99999,
  )
  flower.qualities = normalizeFlowerQualities(flower.qualities)
  flower.specificFlowerIds = ensureMultiSelectValue(
    flower.specificFlowerIds,
    getFlowerPickerOptions(flower.specificFlowerIds),
  )
  flower.plantExcludeFlowerIds = Array.isArray(flower.plantExcludeFlowerIds)
    ? Array.from(new Set(flower.plantExcludeFlowerIds.map((item) => String(item)).filter(Boolean)))
    : []
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
  friendSteal.stealQualities = normalizeFlowerQualities(friendSteal.stealQualities)
  friendSteal.stealFlowerIds = ensureMultiSelectValue(
    friendSteal.stealFlowerIds,
    getFlowerPickerOptions(friendSteal.stealFlowerIds),
  )
  friendSteal.excludeFlowerIds = ensureMultiSelectValue(
    friendSteal.excludeFlowerIds,
    getFlowerPickerOptions(friendSteal.excludeFlowerIds),
  )
  const rawSpecifiedFriendNames = Array.isArray(friendSteal.specifiedFriendNames)
    ? friendSteal.specifiedFriendNames
    : String(friendSteal.specifiedFriendNames || '').split(/[,，]/)
  friendSteal.specifiedFriendNames = rawSpecifiedFriendNames
    .flatMap((name: unknown) => String(name || '').split(/[,，]/))
    .map((name: string) => name.trim().replace(/[。．]/g, '.'))
    .filter(Boolean)
  friendSteal.excludeFriendsEnabled = !!friendSteal.excludeFriendsEnabled
  const rawExcludedFriendNames = Array.isArray(friendSteal.excludedFriendNames)
    ? friendSteal.excludedFriendNames
    : String(friendSteal.excludedFriendNames || '').split(/[,，]/)
  friendSteal.excludedFriendNames = rawExcludedFriendNames
    .flatMap((name: unknown) => String(name || '').split(/[,，]/))
    .map((name: string) => name.trim().replace(/[。．]/g, '.'))
    .filter(Boolean)
  friendSteal.specifiedElvesIds = ensureMultiSelectValue(
    friendSteal.specifiedElvesIds,
    elfOptions,
  )
  friendSteal.stealMode = ensureSingleSelectValue(friendSteal.stealMode, stealModeOptions)
  const buyStealCount = Number(friendSteal.buyStealCount)
  friendSteal.buyStealCount = Number.isFinite(buyStealCount)
    ? Math.min(10, Math.max(1, Math.floor(buyStealCount)))
    : 10

  // 时间格式校验（HH:mm），格式不合法则恢复默认
  const HHmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!HHmmRegex.test(friendSteal.noStealStart as string)) friendSteal.noStealStart = '01:00'
  if (!HHmmRegex.test(friendSteal.noStealEnd as string))   friendSteal.noStealEnd   = '07:00'

  config.plant.elves.selectedElvesIds = ensureMultiSelectValue(
    config.plant.elves.selectedElvesIds,
    elfOptions,
  )
  const delayedHarvestMinutes = Number(config.plant.elves.delayedHarvestMinutes)
  config.plant.elves.delayedHarvestMinutes = Number.isFinite(delayedHarvestMinutes)
    ? Math.min(999, Math.max(10, Math.floor(delayedHarvestMinutes)))
    : 10
  config.plant.elves.helpFrdMode = 'limit3'

  config.plant.artSell.artSellMode = ensureSingleSelectValue(
    config.plant.artSell.artSellMode ||
      (config.plant.artSell.specifiedArtsFull?.length ? 'full' : 'vase'),
    artSellModeOptions,
  )
  config.plant.artSell.specifiedArts = normalizeArtOptionValues(
    config.plant.artSell.specifiedArts,
    flowerArtOptions,
  )
  config.plant.artSell.specifiedArtsFull = normalizeArtOptionValues(
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
  market.buyQualities = normalizeFlowerQualities(market.buyQualities)
  market.excludeFlowerIds = Array.isArray(market.excludeFlowerIds)
    ? market.excludeFlowerIds
    : []
  const rawBuyFriendNames = Array.isArray(market.buyFriendNames)
    ? market.buyFriendNames
    : String(market.buyFriendNames || '').split(/[,，]/)
  market.buyFriendNames = [...new Set(rawBuyFriendNames
    .flatMap((name: unknown) => String(name || '').split(/[,，]/))
    .map((name: string) => name.trim().replace(/[。．]/g, '.'))
    .filter(Boolean))]

  config.order.resident.qualities = normalizeFlowerQualities(
    config.order.resident.qualities,
  )
  config.order.palace.qualities = normalizeFlowerQualities(
    config.order.palace.qualities,
  )
  config.order.palace.diamondRefresh = !!config.order.palace.diamondRefresh
  config.order.palace.ignoreQuality = config.order.palace.diamondRefresh
    ? false
    : !!config.order.palace.ignoreQuality
  config.order.team.qualities = normalizeFlowerQualities(config.order.team.qualities)

  const land = config.union.land
  land.plantMode = ensureSingleSelectValue(land.plantMode, unionLandPlantModeOptions)
  land.lowStockThreshold = normalizeUnionLandLowStockThreshold(land.lowStockThreshold)
  land.flowers = normalizeFlowerQualities(land.flowers)
  land.specificFlowerIds = ensureMultiSelectValue(
    land.specificFlowerIds,
    getFlowerPickerOptions(land.specificFlowerIds),
  )

  const unionFlower = config.union.flower
  unionFlower.shareMode = ensureSingleSelectValue(unionFlower.shareMode, qualitySpecificModeOptions)
  unionFlower.takeMode = ensureSingleSelectValue(unionFlower.takeMode, qualitySpecificModeOptions)
  unionFlower.shareQualities = normalizeFlowerQualities(unionFlower.shareQualities)
  unionFlower.shareFlowerIds = ensureMultiSelectValue(
    unionFlower.shareFlowerIds,
    getFlowerPickerOptions(unionFlower.shareFlowerIds),
  )
  unionFlower.takeQualities = normalizeFlowerQualities(unionFlower.takeQualities)
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
  config.activity.actDessert.openBox = !!config.activity.actDessert.openBox
  config.activity.actMerge2.speed = ensureSingleSelectValue(
    config.activity.actMerge2.speed,
    actMerge2SpeedOptions,
  )
  config.activity.actSpool.speed = ensureSingleSelectValue(
    config.activity.actSpool.speed,
    actSpoolSpeedOptions,
  )

  const fmlRace = config.union.fmlRace
  fmlRace.avoidProgressTask = !!fmlRace.avoidProgressTask
  fmlRace.othersUpgradeTaskMode = !!fmlRace.othersUpgradeTaskMode
  fmlRace.onlySpecifiedUpgradeTask = !!fmlRace.onlySpecifiedUpgradeTask
  fmlRace.excludeOthersUpgradeTask = !fmlRace.onlySpecifiedUpgradeTask
  fmlRace.specifiedUpgradePlayers = normalizePlayerNames(fmlRace.specifiedUpgradePlayers)
  fmlRace.harvestTaskFlowerFilterEnabled = !!fmlRace.harvestTaskFlowerFilterEnabled
  fmlRace.harvestTaskFlowerIds = Array.isArray(fmlRace.harvestTaskFlowerIds)
    ? fmlRace.harvestTaskFlowerIds
    : []
  fmlRace.deleteUnclaimedTask = !!fmlRace.deleteUnclaimedTask
  fmlRace.deleteUnclaimedMinutes = normalizeDeleteUnclaimedMinutes(
    fmlRace.deleteUnclaimedMinutes,
  )
  fmlRace.onlyDiamondUpgradeTask = !!fmlRace.onlyDiamondUpgradeTask
  fmlRace.diamondRefreshTask = !!fmlRace.diamondRefreshTask
  fmlRace.diamondRefreshBelowScore = Math.min(
    99,
    Math.max(1, Math.floor(Number(fmlRace.diamondRefreshBelowScore) || 14)),
  )
  fmlRace.diamondRefreshTargetScore = Math.min(
    99,
    Math.max(1, Math.floor(Number(fmlRace.diamondRefreshTargetScore) || 24)),
  )
  fmlRace.minDiamondUpgradeScore = Math.min(
    99,
    Math.max(1, Math.floor(Number(fmlRace.minDiamondUpgradeScore) || 24)),
  )
  fmlRace.harvestUpgradeRefine = !!fmlRace.harvestUpgradeRefine
  fmlRace.harvestUpgradeFlowerIds = Array.isArray(fmlRace.harvestUpgradeFlowerIds)
    ? fmlRace.harvestUpgradeFlowerIds
    : []
  fmlRace.diamondUpgradeReserve = normalizeDiamondUpgradeReserve(
    fmlRace.diamondUpgradeReserve,
  )
  config.activity.fmlRace.enabled = !!config.activity.fmlRace.enabled
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
