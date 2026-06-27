import type { GameConfig } from './types'
import {
  actDessertSpeedOptions,
  actElimSpeedOptions,
  actMerge2SpeedOptions,
  actSpoolSpeedOptions,
  buyModeOptions,
  elfOptions,
  fishFunSpeedOptions,
  flowerArtOptions,
  flowerCountOptions,
  flowerQualityOptions,
  getFlowerPickerOptions,
  plantingModeOptions,
  priceIndexOptions,
  putModeOptions,
  qualitySpecificModeOptions,
  stealModeOptions,
} from './options'
import { ensureMultiSelectValue, ensureSingleSelectValue } from '../../utils/selectDefaults'

const DEFAULT_LOW_STOCK_THRESHOLD = 500
const DEFAULT_FREE_STYLE_TEMPLATE = '我的方案A'
const MAX_FREE_STYLE_TEMPLATES = 5

function normalizeThreshold(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return DEFAULT_LOW_STOCK_THRESHOLD
  return Math.min(999999, Math.max(1, Math.floor(numberValue)))
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
  flower.plantingMode = ensureSingleSelectValue(flower.plantingMode, plantingModeOptions)
  flower.lowStockThreshold = normalizeThreshold(flower.lowStockThreshold)
  if (!Array.isArray(flower.freeStyleList) || flower.freeStyleList.length === 0) {
    flower.freeStyleList = [{ name: DEFAULT_FREE_STYLE_TEMPLATE, lands: {} }]
  }
  flower.freeStyleList = flower.freeStyleList
    .slice(0, MAX_FREE_STYLE_TEMPLATES)
    .map((item, index) => ({
      name: String(item?.name || `${DEFAULT_FREE_STYLE_TEMPLATE}${index ? index + 1 : ''}`),
      lands: item?.lands && typeof item.lands === 'object' ? item.lands : {},
    }))
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

  config.plant.elves.selectedElvesIds = ensureMultiSelectValue(
    config.plant.elves.selectedElvesIds,
    elfOptions,
  )

  config.plant.artSell.specifiedArts = ensureMultiSelectValue(
    config.plant.artSell.specifiedArts,
    flowerArtOptions,
  )

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
  land.plantMode = ensureSingleSelectValue(land.plantMode, qualitySpecificModeOptions)
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
}
