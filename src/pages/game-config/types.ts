export type BodyAttributeGroup = { main: number[]; sub: number[] }
export type BodyAttributes = Record<string, BodyAttributeGroup>

export interface GameConfig {
  basic: {
    reputation: {
      enabled: boolean
      threshold: number
    }
    reconnectInterval: number
    debug: boolean
    task: {
      daily: boolean
      weekly: boolean
      main: boolean
      story: boolean
      achieve: boolean
    }
    mail: boolean
    benefit: {
      buff: boolean
      box: boolean
      shareRwd: boolean
      antiScamBox: boolean
    }
    sign: {
      daily: boolean
      patch: boolean
    }
    pearl: {
      freePearl: boolean
      autoHire: boolean
      maxHireLevel: number
      maxHireTicketUsage: number
      autoPearlDraw: boolean
      protectEnabled: boolean
      autoBuyHireTicket: boolean
      maxSpendDmd: number
    }
    randomEvent: boolean
    feedCat: {
      enabled: boolean
      autoRecall: boolean
      autoBuyFood: boolean
      autoFeed: boolean
      autoStroke: boolean
    }
    shop: {
      videoFreeGift: boolean
      cultivateShop: {
        autoBuy: boolean
        maxSpendGold: number
      }
      floralShop: {
        enabled: boolean
        itemIds: number[]
      }
    }
  }

  plant: {
    cultivate: {
      enabled: boolean
      autoHarvestEnabled: boolean
      videoSpeedUp: boolean
      upgradeEnabled: boolean
      upgradeQualityEnabled: boolean
      upgradeQualities: number[]
      tagetLevel: number
    }
    flower: {
      autoUnlockLand: boolean
      harvestEnabled: boolean
      plantEnabled: boolean
      videoSpeedUp: boolean
      useSpeedUpTicket: boolean
      speedUpTicketScenes: Array<'normal' | 'elves'>
      speedUpTicketMode: 'dailyLimit' | 'remainingMinutes'
 | string
      speedUpTicketMinMinutes: number
      speedUpTicketReserve: number
      speedUpTicketMax: number
      waterThreshold: number
      strictLayout: boolean
      landGroupSize: number
      groupWaterEnabled: boolean
      taskMode: boolean
      taskLogEnabled: boolean
      taskPriorityConfig: Record<string, number>
      plantingMode: 'quality' | 'count' | 'specific' | 'lowStock' | 'freeStyle' | string
      lowStockThreshold: number
      freeStyleTemplate: string
      freeStyleList: Array<{
        name: string
        lands: Record<string, number | string>
      }>
      minFlowerLevel: number
      qualities: number[]
      flowerCount: number
      specificFlowerIds: Array<number | string>
      qualityExcludeEnabled: boolean
      qualityExcludeFlowerIds: Array<number | string>
      countExcludeEnabled: boolean
      countExcludeFlowerIds: Array<number | string>
      lowStockExcludeEnabled: boolean
      lowStockExcludeFlowerIds: Array<number | string>
      plantExcludeMigrated: boolean
      /** 兼容脚本端现有的当前模式排除列表。 */
      plantExcludeFlowerIds: Array<number | string>
    }
    friendSteal: {
      enabled: boolean
      stealElves: boolean
      excludeFriendsEnabled: boolean
      excludedFriendNames: string[]
      onlyStealSpecifiedFriends: boolean
      specifiedFriendNames: string[]
      onlyStealSpecifiedElves: boolean
      specifiedElvesIds: Array<number | string>
      stealMode: 'quality' | 'specific' | 'exclude' | 'excludeCultivating' | string
      stealQualities: number[]
      stealFlowerIds: Array<number | string>
      excludeFlowerIds: Array<number | string>
      buyStealEnabled: boolean
      buyStealCount: number
      noStealEnabled: boolean
      noStealStart: string
      noStealEnd: string
      lateNightConsumeEnabled: boolean
    }
    elves: {
      enabled: boolean
      selectedElvesIds: Array<number | string>
      delayedHarvestEnabled: boolean
      delayedHarvestMinutes: number
      requestAid: boolean
      recvAid: boolean
      helpFrd: boolean
      helpFrdMode: 'limit3'
      dispatch: boolean
      dispatchMode: 'doubleFirst' | 'doubleOnly'
      dispatchCount: number
      speedUpDispatch: boolean
      recvDispatch: boolean
      recvPass: boolean
      recvPassTask: boolean
      recvFlowerPass: boolean
      recvFlowerPassTask: boolean
    }
    water: {
      enabled: boolean
      timedEnabled: boolean
      minWaterThreshold: number
      forceCollectEnabled: boolean
      forceCollectTime: string
    }
    artSell: {
      autoSellArt: boolean
      artSellMode: 'vase' | 'full' | string
      specifiedArts: Array<number | string>
      specifiedArtsFull: Array<number | string>
      flowerArtPerRack: number
      rackAutoRefresh: boolean
      autoUnlockStand: boolean
      recvArtCreateRwd: boolean
      recvCollectRwd: boolean
      artFirstMake: boolean
      stockFirst: boolean
    }
    market: {
      autoUnlockShelf: boolean
      putEnabled: boolean
      putMode: 'inventory' | 'specific' | string
      specificFlowerIds: Array<number | string>
      maxSell: number
      priceIndex: number
      putFlowerPassword: string
      autoBuyPutCount: boolean
      buyPutCount: number
      autoBuyFromFriend: boolean
      buyMode: 'all' | 'specific' | 'quality' | 'exclude' | 'friend' | 'excludeFriend' | 'uncultivated' | string
      buySpecificFlowerIds: Array<number | string>
      buyQualities: number[]
      excludeFlowerIds: Array<number | string>
      buyFriendNames: string[]
      minPutTimeDiff: number
    }
  }

  order: {
    resident: {
      normalEnabled: boolean
      satinEnabled: boolean
      decorateEnabled: boolean
      normalMaxNum: number
      satinMaxNum: number
      decorateMaxNum: number
      timedEnabled: boolean
      startTime: string
      endTime: string
      qualities: number[]
    }
    customer: {
      enabled: boolean
      floralCoinEnabled: boolean
      floralCoinCount: 1 | 2 | 3
      rejectEnabled: boolean
      customerMaxNum: number
    }
    palace: {
      enabled: boolean
      qualities: number[]
      ignoreQuality: boolean
      diamondRefresh: boolean
    }
    team: {
      enabled: boolean
      oneMore: boolean
      submitOnlyCultivatedFlowers: boolean
      teamMode: 'quality' | 'exclude'
      qualities: number[]
      excludeFlowerIds: number[]
      reserveStock: number
    }
  }

  union: {
    land: {
      harvest: boolean
      autoPlant: boolean
      plantMode: 'quality' | 'specific' | 'lowStock' | string
      flowers: number[]
      specificFlowerIds: Array<number | string>
      maxFlowerLevel: number
      lowStockThreshold: number
    }
    build: {
      free: boolean
      gld: boolean
      dmd: boolean
    }
    flower: {
      share: boolean
      shareMode: 'quality' | 'specific' | string
      shareQualities: number[]
      shareFlowerIds: Array<number | string>
      take: boolean
      takeMode: 'quality' | 'specific' | string
      takeQualities: number[]
      takeFlowerIds: Array<number | string>
    }
    fmlRace: {
      enabled: boolean
      autoEnableModules: boolean
      useSpeedUpTicketInTask: boolean
      minTaskScore: number
      minUpgradeTaskScore: number
      avoidProgressTask: boolean
      onlyUpgradeTask: boolean
      othersUpgradeTaskMode: boolean
      excludeOthersUpgradeTask: boolean
      onlySpecifiedUpgradeTask: boolean
      acceptQualifiedNormalTask: boolean
      specifiedUpgradePlayers: string[]
      harvestTaskFlowerFilterEnabled: boolean
      harvestTaskFlowerIds: Array<number | string>
      taskTypePriority: Record<string, number>
      upgradeTask: boolean
      deleteTask: boolean
      deleteTaskMaxScore: number
      keepSystemUpgrade: boolean
      keepPlayerUpgrade: boolean
      deleteUnclaimedTask: boolean
      deleteUnclaimedMinutes: number
      smallAccountExclusiveEnabled: boolean
      onlyDiamondUpgradeTask: boolean
      diamondRefreshTask: boolean
      diamondRefreshBelowScore: number
      diamondRefreshTargetScore: number
      minDiamondUpgradeScore: number
      harvestUpgradeRefine: boolean
      harvestUpgradeFlowerIds: Array<number | string>
      diamondUpgradeReserve: number
    }
    redPacket: {
      enabled: boolean
    }
    fmlForest: {
      enabled: boolean
    }
  }

  activity: {
    fmlRace: {
      enabled: boolean
    }
    actFmlRedEnvelope: {
      enabled: boolean
    }
    cyclicNote: {
      enabled: boolean
      unlockSlot: boolean
      autoEnableModules: boolean
      orderGuard: {
        enabled: boolean
        timeRanges: Array<{ start: string; end: string }>
      }
    }
    actCyclicStory: {
      enabled: boolean
      refreshEnabled: boolean
      maxFinshCntPerBatch: number
    }
    fishMerge: {
      enabled: boolean
      showResult: boolean
      autoRestart: boolean
    }
    magicBubble: {
      enabled: boolean
    }
    fishFun: {
      enabled: boolean
      showResult: boolean
      autoRestart: boolean
      autoClaimEnergy: boolean
      speed: number
    }
    actElim: {
      enabled: boolean
      autoClaimEnergy: boolean
      speed: number
    }
    zooGameElim: {
      enabled: boolean
    }
    lanternFestival: {
      enabled: boolean
    }
    actDessert: {
      enabled: boolean
      autoClaimEnergy: boolean
      useItems: boolean
      openBox: boolean
      speed: number
    }
    actMerge2: {
      enabled: boolean
      autoClaimEnergy: boolean
      speed: number
    }
    actSpool: {
      enabled: boolean
      autoClaimReward: boolean
      openBox: boolean
      autoRestart: boolean
      speed: number
    }
    actDuanWu: {
      enabled: boolean
      autoSign: boolean
      autoOpenBox: boolean
      giftBuy: boolean
    }
    redPacket: {
      enabled: boolean
    }
    recvLuck: {
      enabled: boolean
    }
    yzCall: {
      enabled: boolean
    }
    actJYCALL: {
      enabled: boolean
      recvBoxes: boolean
    }
    moneyTree: {
      enabled: boolean
    }
    actHoney: {
      enabled: boolean
    }
    actCardCollect: {
      enabledCardCollect: boolean
      enabledSmoke: boolean
    }
    actAnniv26Star: {
      enabled: boolean
      lightStarsEnabled: boolean
    }
    actTwinFlight: {
      enabled: boolean
    }
  }
}
