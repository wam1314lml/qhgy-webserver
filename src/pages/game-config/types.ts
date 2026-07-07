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
      vipShop: {
        autoBuy: boolean
        maxSpendDmd: number
        maxSpendFloralCoin: number
      }
    }
  }

  plant: {
    cultivate: {
      enabled: boolean
      videoSpeedUp: boolean
      upgradeEnabled: boolean
      tagetLevel: number
    }
    flower: {
      autoUnlockLand: boolean
      harvestEnabled: boolean
      plantEnabled: boolean
      videoSpeedUp: boolean
      useSpeedUpTicket: boolean
      speedUpTicketMax: number
      waterThreshold: number
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
    }
    friendSteal: {
      enabled: boolean
      stealElves: boolean
      stealMode: 'quality' | 'specific' | 'exclude' | string
      stealQualities: number[]
      stealFlowerIds: Array<number | string>
      excludeFlowerIds: Array<number | string>
      buyStealEnabled: boolean
      buyStealCount: number
    }
    elves: {
      enabled: boolean
      selectedElvesIds: Array<number | string>
      requestAid: boolean
      recvAid: boolean
      helpFrd: boolean
      dispatch: boolean
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
      buyMode: 'all' | 'specific' | 'quality' | string
      buySpecificFlowerIds: Array<number | string>
      buyQualities: number[]
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
      qualities: number[]
    }
    customer: {
      enabled: boolean
      rejectEnabled: boolean
    }
    palace: {
      enabled: boolean
      qualities: number[]
      ignoreQuality: boolean
    }
    team: {
      enabled: boolean
      oneMore: boolean
      submitOnlyCultivatedFlowers: boolean
      qualities: number[]
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
      giveuplowscoretask: boolean
      onlyUpgradeTask: boolean
      excludeOthersUpgradeTask: boolean
      taskTypePriority: Record<string, number>
      upgradeTask: boolean
      deleteTask: boolean
      deleteTaskMaxScore: number
      keepSystemUpgrade: boolean
      keepPlayerUpgrade: boolean
    }
    redPacket: {
      enabled: boolean
    }
    fmlForest: {
      enabled: boolean
    }
  }

  activity: {
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
  }
}
