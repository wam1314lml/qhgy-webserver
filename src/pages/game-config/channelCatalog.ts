import { flowerOptions } from './flowerOptions'
import { flowerArtOptions } from './flowerArtOptions'
import { specifiedArtsFullOptions } from './specifiedArtsFullOptions'
import { elfOptions, ELVES, ELF_IDENTITIES } from './elfOptions'
import { elfPlantOptions } from './elfPlantOptions'
import { floralShopAllOptions } from './shopItem6Options'
import { fmlRaceTaskTypes, defaultFmlRaceTaskTypePriority } from './fmlRaceTaskTypes'
import { flowerOptions as zfbFlowers } from './zfb/flowerOptions'
import { flowerArtOptions as zfbVases } from './zfb/flowerArtOptions'
import { specifiedArtsFullOptions as zfbArts } from './zfb/specifiedArtsFullOptions'
import { elfOptions as zfbElves, ELVES as zfbNames, ELF_IDENTITIES as zfbIdentities } from './zfb/elfOptions'
import { elfPlantOptions as zfbPlants } from './zfb/elfPlantOptions'
import { floralShopAllOptions as zfbShop } from './zfb/shopItem6Options'
import { fmlRaceTaskTypes as zfbRace, defaultFmlRaceTaskTypePriority as zfbPriority } from './zfb/fmlRaceTaskTypes'

const wxCatalog = { flowerOptions, flowerArtOptions, specifiedArtsFullOptions, elfOptions,
  ELVES, ELF_IDENTITIES, elfPlantOptions, floralShopAllOptions, fmlRaceTaskTypes, defaultFmlRaceTaskTypePriority }
const zfbCatalog: typeof wxCatalog = {
  flowerOptions: zfbFlowers, flowerArtOptions: zfbVases, specifiedArtsFullOptions: zfbArts,
  elfOptions: zfbElves, ELVES: zfbNames, ELF_IDENTITIES: zfbIdentities, elfPlantOptions: zfbPlants,
  floralShopAllOptions: zfbShop, fmlRaceTaskTypes: zfbRace, defaultFmlRaceTaskTypePriority: zfbPriority,
}

/** 只有支付宝渠道使用独立数据库；密码、微信及其他渠道保持微信库兼容行为。 */
export const isAlipayPlatform = (platform: unknown): boolean => platform === 1 || platform === '1'
export const getGameCatalog = (platform?: unknown) => isAlipayPlatform(platform) ? zfbCatalog : wxCatalog
