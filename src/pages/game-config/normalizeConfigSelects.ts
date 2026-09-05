import type { GameConfig } from './types'
import {
  actDessertSpeedOptions,
  actElimSpeedOptions,
  actMerge2SpeedOptions,
  actSpoolSpeedOptions,
  artSellModeOptions,
  buyModeOptions,
  defaultFmlRaceTaskTypePriority,
  elfOptions,
  fishFunSpeedOptions,
  flowerArtOptions,
  flowerCountOptions,
  flowerQualityOptions,
  fmlRaceTaskTypes,
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
import { floralShopAllOptions } from './shopItem6Options'
import { QHGY_FLORAL_SHOP_CATALOG_VERSION } from './migrationVersions'
import { normalizeFmlRaceAcceptRules } from './fmlRaceAcceptRules'

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
const QHGY_FLOWER_OPTIONS = getFlowerPickerOptions()
const QHGY_FLOWER_ID_SET = new Set(QHGY_FLOWER_OPTIONS.map((option) => String(option.value)))
const QHGY_ELF_ID_SET = new Set(elfOptions.map((option) => String(option.value)))
const QHGY_VASE_ID_SET = new Set(flowerArtOptions.map((option) => String(option.value)))
const QHGY_ART_OPTIONS = getSpecifiedArtsFullPickerOptions()
const QHGY_ART_ID_SET = new Set(QHGY_ART_OPTIONS.map((option) => String(option.value)))
const QHGY_FLORAL_SHOP_ID_SET = new Set(
  floralShopAllOptions.flatMap((group) => group.options).map((option) => String(option.value)),
)
const QHGY_FREE_STYLE_LAND_ID_SET = new Set(
  Array.from({ length: 64 }, (_, index) => String(1001 + index)),
)

const LEGACY_FML_RACE_TASK_TYPE_MAP: Record<string, string> = {
  '2004': '20036',
  '3006': '20009',
  '3016': '20007',
  '3017': '20005',
  '3018': '20011',
  '3023': '20010',
  '3030': '20019',
  '3034': '20045',
  '3035': '20015',
  '3036': '20046',
  '3044': '20003',
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

/** 在默认配置参与深度合并前迁移旧花园世界任务 type，避免默认新键掩盖旧自定义值。 */
export function migrateLegacyFmlRaceTaskPriority(config: unknown): void {
  const root = asRecord(config)
  const union = asRecord(root?.union)
  const fmlRace = asRecord(union?.fmlRace)
  const priority = asRecord(fmlRace?.taskTypePriority)
  if (!fmlRace || !priority) return

  for (const [legacyKey, qhgyKey] of Object.entries(LEGACY_FML_RACE_TASK_TYPE_MAP)) {
    if (priority[qhgyKey] === undefined && priority[legacyKey] !== undefined) {
      priority[qhgyKey] = priority[legacyKey]
    }
  }
}

/**
 * 必须在默认配置深度合并前调用：旧花园世界 Shop6 与奇幻果园百果园存在重叠 ID，
 * 未带本目录标记的 itemIds 无法安全判别，只能清空后让用户重新选择。
 */
export function migrateLegacyFloralShopCatalog(config: unknown): void {
  const root = asRecord(config)
  const basic = asRecord(root?.basic)
  const shop = asRecord(basic?.shop)
  const floralShop = asRecord(shop?.floralShop)
  if (!floralShop) return

  if (floralShop.catalogVersion !== QHGY_FLORAL_SHOP_CATALOG_VERSION) {
    floralShop.itemIds = []
  }
  floralShop.catalogVersion = QHGY_FLORAL_SHOP_CATALOG_VERSION
}

function normalizeAllowedStringIds(value: unknown, allowedValues: Set<string>): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .map((item) => String(item).trim())
      .filter((item) => item && allowedValues.has(item)),
  ))
}

function normalizeAllowedNumberIds(value: unknown, allowedValues: Set<string>): number[] {
  return normalizeAllowedStringIds(value, allowedValues).map(Number)
}

function normalizeAllowedMultiSelect(
  value: unknown,
  options: Array<{ value: string | number; disabled?: boolean }>,
  allowedValues: Set<string>,
): string[] {
  return ensureMultiSelectValue(normalizeAllowedStringIds(value, allowedValues), options)
}

function normalizeFreeStyleLands(value: unknown): Record<string, number | string> {
  const source = asRecord(value)
  if (!source) return {}

  const lands: Record<string, number | string> = {}
  for (const [landId, flowerId] of Object.entries(source)) {
    const normalizedFlowerId = String(flowerId ?? '').trim()
    if (!QHGY_FREE_STYLE_LAND_ID_SET.has(landId) || !QHGY_FLOWER_ID_SET.has(normalizedFlowerId)) {
      continue
    }
    lands[landId] = Number(normalizedFlowerId)
  }
  return lands
}

function normalizeFmlRaceTaskTypePriority(value: unknown): Record<string, number> {
  const source = asRecord(value) ?? {}
  const normalized = Object.fromEntries(fmlRaceTaskTypes.map(({ key }) => {
    const numberValue = Number(source[key])
    const fallback = Number(defaultFmlRaceTaskTypePriority[key] ?? 0)
    const priority = Number.isFinite(numberValue)
      ? Math.min(99, Math.max(0, Math.floor(numberValue)))
      : fallback
    return [key, priority]
  }))

  // 保留未来静态表 type 与 default 等用户自定义键；旧花园 type 已在前置迁移中
  // 转换为 QHGY type，本身不再写回，避免继续污染配置。
  for (const [key, rawValue] of Object.entries(source)) {
    if (Object.hasOwn(LEGACY_FML_RACE_TASK_TYPE_MAP, key)) continue
    if (Object.hasOwn(normalized, key)) continue
    if (key !== 'default' && !/^\d+$/.test(key)) continue
    const numberValue = Number(rawValue)
    if (!Number.isFinite(numberValue)) continue
    normalized[key] = Math.min(99, Math.max(0, Math.floor(numberValue)))
  }
  return normalized
}

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

function normalizeSpeedUpTicketScenes(value: unknown): Array<'normal' | 'elves'> {
  if (!Array.isArray(value)) return ['normal', 'elves']
  return Array.from(
    new Set(value.filter((scene): scene is 'normal' | 'elves' => scene === 'normal' || scene === 'elves')),
  )
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
  migrateLegacyFmlRaceTaskPriority(config)
  migrateLegacyFloralShopCatalog(config)

  // VIP 商店功能已下线，清理服务端遗留字段，避免旧配置继续生效。
  delete (config.basic.shop as unknown as Record<string, unknown>).vipShop
  const floralShop = config.basic.shop.floralShop
  floralShop.claimTasks = !!floralShop.claimTasks
  floralShop.itemIds = normalizeAllowedNumberIds(floralShop.itemIds, QHGY_FLORAL_SHOP_ID_SET)
  floralShop.catalogVersion = QHGY_FLORAL_SHOP_CATALOG_VERSION

  const cultivate = config.plant.cultivate
  cultivate.autoHarvestEnabled = cultivate.enabled && !!cultivate.autoHarvestEnabled
  cultivate.upgradeQualityEnabled = !!cultivate.upgradeQualityEnabled
  cultivate.upgradeQualities = normalizeFlowerQualities(cultivate.upgradeQualities)

  const flower = config.plant.flower
  flower.speedUpTicketScenes = normalizeSpeedUpTicketScenes(flower.speedUpTicketScenes)
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
  flower.specificFlowerIds = normalizeAllowedMultiSelect(
    flower.specificFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
  )
  const normalizePlantExcludeIds = (value: unknown): Array<number | string> =>
    normalizeAllowedStringIds(value, QHGY_FLOWER_ID_SET)
  const legacyPlantExcludeFlowerIds = normalizePlantExcludeIds(flower.plantExcludeFlowerIds)
  flower.qualityExcludeFlowerIds = normalizePlantExcludeIds(flower.qualityExcludeFlowerIds)
  flower.countExcludeFlowerIds = normalizePlantExcludeIds(flower.countExcludeFlowerIds)
  flower.lowStockExcludeFlowerIds = normalizePlantExcludeIds(flower.lowStockExcludeFlowerIds)
  flower.qualityExcludeEnabled = !!flower.qualityExcludeEnabled
  flower.countExcludeEnabled = !!flower.countExcludeEnabled
  flower.lowStockExcludeEnabled = !!flower.lowStockExcludeEnabled
  if (!flower.plantExcludeMigrated && legacyPlantExcludeFlowerIds.length > 0) {
    flower.qualityExcludeEnabled = true
    flower.countExcludeEnabled = true
    flower.lowStockExcludeEnabled = true
    flower.qualityExcludeFlowerIds = [...legacyPlantExcludeFlowerIds]
    flower.countExcludeFlowerIds = [...legacyPlantExcludeFlowerIds]
    flower.lowStockExcludeFlowerIds = [...legacyPlantExcludeFlowerIds]
  }
  flower.plantExcludeMigrated = true
  flower.flowerCount = ensureSingleSelectValue(flower.flowerCount, flowerCountOptions)
  flower.landGroupSize = ensureSingleSelectValue(flower.landGroupSize, landGroupSizeOptions)
  if (flower.groupWaterEnabled === undefined && (flower as { groupWater?: boolean }).groupWater !== undefined) {
    flower.groupWaterEnabled = !!(flower as { groupWater?: boolean }).groupWater
    delete (flower as { groupWater?: boolean }).groupWater
  }
  flower.plantingMode = ensureSingleSelectValue(flower.plantingMode, plantingModeOptions)
  const activeExcludeConfig = {
    quality: {
      enabled: flower.qualityExcludeEnabled,
      ids: flower.qualityExcludeFlowerIds,
    },
    count: {
      enabled: flower.countExcludeEnabled,
      ids: flower.countExcludeFlowerIds,
    },
    lowStock: {
      enabled: flower.lowStockExcludeEnabled,
      ids: flower.lowStockExcludeFlowerIds,
    },
  }[flower.plantingMode]
  flower.plantExcludeFlowerIds = activeExcludeConfig?.enabled ? [...activeExcludeConfig.ids] : []
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
      lands: normalizeFreeStyleLands(item?.lands),
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
  friendSteal.stealFlowerIds = normalizeAllowedMultiSelect(
    friendSteal.stealFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
  )
  friendSteal.excludeFlowerIds = normalizeAllowedMultiSelect(
    friendSteal.excludeFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
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
  friendSteal.specifiedElvesIds = normalizeAllowedMultiSelect(
    friendSteal.specifiedElvesIds,
    elfOptions,
    QHGY_ELF_ID_SET,
  )
  friendSteal.stealMode = ensureSingleSelectValue(friendSteal.stealMode, stealModeOptions)
  const buyStealCount = Number(friendSteal.buyStealCount)
  friendSteal.buyStealCount = Number.isFinite(buyStealCount)
    ? Math.min(99, Math.max(1, Math.floor(buyStealCount)))
    : 10

  // 时间格式校验（HH:mm），格式不合法则恢复默认
  const HHmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!HHmmRegex.test(friendSteal.noStealStart as string)) friendSteal.noStealStart = '01:00'
  if (!HHmmRegex.test(friendSteal.noStealEnd as string))   friendSteal.noStealEnd   = '07:00'

  config.plant.elves.selectedElvesIds = normalizeAllowedMultiSelect(
    config.plant.elves.selectedElvesIds,
    elfOptions,
    QHGY_ELF_ID_SET,
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
    flowerArtOptions.filter((option) => QHGY_VASE_ID_SET.has(String(option.value))),
  )
  config.plant.artSell.specifiedArtsFull = normalizeArtOptionValues(
    config.plant.artSell.specifiedArtsFull,
    QHGY_ART_OPTIONS.filter((option) => QHGY_ART_ID_SET.has(String(option.value))),
  )
  config.plant.artSell.artFirstMake = !!config.plant.artSell.artFirstMake

  const market = config.plant.market
  market.putMode = ensureSingleSelectValue(market.putMode, putModeOptions)
  market.priceIndex = ensureSingleSelectValue(market.priceIndex, priceIndexOptions)
  market.buyMode = ensureSingleSelectValue(market.buyMode, buyModeOptions)
  market.specificFlowerIds = normalizeAllowedMultiSelect(
    market.specificFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
  )
  market.buySpecificFlowerIds = normalizeAllowedMultiSelect(
    market.buySpecificFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
  )
  market.buyQualities = normalizeFlowerQualities(market.buyQualities)
  market.excludeFlowerIds = normalizeAllowedStringIds(
    market.excludeFlowerIds,
    QHGY_FLOWER_ID_SET,
  )
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
  config.order.resident.timedEnabled = !!config.order.resident.timedEnabled
  config.order.resident.startTime = normalizeTimeHM(config.order.resident.startTime, 0, 0)
  config.order.resident.endTime = normalizeTimeHM(config.order.resident.endTime, 0, 0)
  config.order.customer.floralCoinEnabled = !!config.order.customer.floralCoinEnabled
  const floralCoinCount = Number(config.order.customer.floralCoinCount)
  config.order.customer.floralCoinCount = ([1, 2, 3].includes(floralCoinCount)
    ? floralCoinCount
    : 2) as 1 | 2 | 3
  config.order.palace.qualities = normalizeFlowerQualities(
    config.order.palace.qualities,
  )
  config.order.palace.diamondRefresh = !!config.order.palace.diamondRefresh
  config.order.palace.ignoreQuality = config.order.palace.diamondRefresh
    ? false
    : !!config.order.palace.ignoreQuality
  config.order.team.qualities = normalizeFlowerQualities(config.order.team.qualities)
  config.order.team.excludeFlowerIds = normalizeAllowedStringIds(
    config.order.team.excludeFlowerIds,
    QHGY_FLOWER_ID_SET,
  )
  config.order.team.reserveStock = normalizeDiamondUpgradeReserve(config.order.team.reserveStock)

  const land = config.union.land
  land.plantMode = ensureSingleSelectValue(land.plantMode, unionLandPlantModeOptions)
  land.lowStockThreshold = normalizeUnionLandLowStockThreshold(land.lowStockThreshold)
  land.flowers = normalizeFlowerQualities(land.flowers)
  land.specificFlowerIds = normalizeAllowedMultiSelect(
    land.specificFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
  )

  const unionFlower = config.union.flower
  unionFlower.shareMode = ensureSingleSelectValue(unionFlower.shareMode, qualitySpecificModeOptions)
  unionFlower.takeMode = ensureSingleSelectValue(unionFlower.takeMode, qualitySpecificModeOptions)
  unionFlower.shareQualities = normalizeFlowerQualities(unionFlower.shareQualities)
  unionFlower.shareFlowerIds = normalizeAllowedMultiSelect(
    unionFlower.shareFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
  )
  unionFlower.takeQualities = normalizeFlowerQualities(unionFlower.takeQualities)
  unionFlower.takeFlowerIds = normalizeAllowedMultiSelect(
    unionFlower.takeFlowerIds,
    QHGY_FLOWER_OPTIONS,
    QHGY_FLOWER_ID_SET,
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
  delete (fmlRace as unknown as Record<string, unknown>).giveuplowscoretask
  for (const key of [
    'minTaskScore', 'minUpgradeTaskScore', 'onlyUpgradeTask', 'othersUpgradeTaskMode',
    'excludeOthersUpgradeTask', 'onlySpecifiedUpgradeTask', 'acceptQualifiedNormalTask',
  ]) {
    delete (fmlRace as unknown as Record<string, unknown>)[key]
  }
  fmlRace.acceptRules = normalizeFmlRaceAcceptRules(fmlRace.acceptRules)
  fmlRace.completeTakenTask = fmlRace.completeTakenTask === true
  fmlRace.avoidProgressTask = !!fmlRace.avoidProgressTask
  fmlRace.specifiedUpgradePlayers = normalizePlayerNames(fmlRace.specifiedUpgradePlayers)
  fmlRace.taskTypePriority = normalizeFmlRaceTaskTypePriority(fmlRace.taskTypePriority)
  fmlRace.harvestTaskFlowerFilterEnabled = !!fmlRace.harvestTaskFlowerFilterEnabled
  fmlRace.harvestTaskFlowerIds = normalizeAllowedStringIds(
    fmlRace.harvestTaskFlowerIds,
    QHGY_FLOWER_ID_SET,
  )
  fmlRace.deleteUnclaimedTask = !!fmlRace.deleteUnclaimedTask
  fmlRace.deleteUnclaimedMinutes = normalizeDeleteUnclaimedMinutes(
    fmlRace.deleteUnclaimedMinutes,
  )
  fmlRace.smallAccountExclusiveEnabled =
    fmlRace.smallAccountExclusiveEnabled === undefined
      ? !!fmlRace.onlyDiamondUpgradeTask
      : !!fmlRace.smallAccountExclusiveEnabled
  fmlRace.onlyDiamondUpgradeTask = !!fmlRace.onlyDiamondUpgradeTask
  fmlRace.diamondRefreshTask = !!fmlRace.diamondRefreshTask
  if (!fmlRace.smallAccountExclusiveEnabled) {
    fmlRace.onlyDiamondUpgradeTask = false
    fmlRace.diamondRefreshTask = false
  }
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
  fmlRace.harvestUpgradeFlowerIds = normalizeAllowedStringIds(
    fmlRace.harvestUpgradeFlowerIds,
    QHGY_FLOWER_ID_SET,
  )
  fmlRace.diamondUpgradeReserve = normalizeDiamondUpgradeReserve(
    fmlRace.diamondUpgradeReserve,
  )
  config.activity.fmlRace.enabled = !!config.activity.fmlRace.enabled
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
