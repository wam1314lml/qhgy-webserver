export type BodyAttributeGroup = { main: number[]; sub: number[] }
export type BodyAttributes = Record<string, BodyAttributeGroup>

// 游戏配置接口
export interface GameConfig {
  // 基础设置
  reconnectInterval: number
  nickName: string
  basic: {
    hasSeparation: boolean
    defaultIndex: number
    autoDuJie: boolean
    autoUpgradeCloud1: boolean
    autoUpgradeCloud2: boolean
    DivineInsight: {
      InspireUpgrade: boolean
    }
    autoXinMoJie: boolean
    autoRestoreYuanti: boolean
    autoRestoreYangshen: boolean
    autoRestoreYinshen: boolean
    defaultMagicIndex0: number
    defaultSpiritIndex0: number
    defaultMagicIndex1: number
    defaultSpiritIndex1: number
    defaultMagicIndex2: number
    defaultSpiritIndex2: number
    forceOnlineEnabled: boolean
    forceOnlineTimeRanges: string[]
    pet: {
      enabled: boolean
      autoCapture: boolean
      wishPets: string[]
    }
    specific: {
      useSendGift: boolean
      useClaimDescendPoints: boolean
      SkyWarWorship: boolean
      GatherEneryWorship: boolean
      UnionTreasureEnabled: boolean
      UnionHonorHallPeakRankEnabled: boolean
      YardEnabled: boolean
      YardLianDanEnabled: boolean
      PeachBanquetEnabled: boolean
      DreamFreeSpeedUpEnabled: boolean
      DreamFreeSpeedUpTime: string
      XianTuTreasureEnabled: boolean
    }
  }

  // 福地设置
  homeland: {
    enabled: boolean
    exclusiveMode: number
    autoHarvest: boolean
    xianYuSteal: boolean
    drainStaminaSteal: boolean
    drainStaminaStealMode: number
    xianYuNum: number
    homelandRulesByTime: Array<{
      startTime: string
      endTime: string
      rules: Array<{
        ItemId: number
        minItemLv: number
        isCheck: boolean
        description: string
      }>
    }>
    xianYuStealTimeRange: number[] // 仙玉刷新时间小时数组
    xianYuAlreadyStealNum: number // 使用位置数量
  }

  // 砍树设置
  chopTree: {
    enabled: boolean
    showResult: boolean
    primaryAttrPriority: boolean
    quality: number
    levelOffset: number
    probOffsetLowLv: number
    probOffset: number
    strictMode: boolean
    fightValuePriority: boolean
    timeRangeEnabled: boolean
    timeRange: number[]
    main: [
      {
        primaryAttribute: number[]
        secondaryAttribute: number[]
      }
    ]
    separation: {
      Conditions: Array<{
        primaryAttribute: number[]
        secondaryAttribute: number[]
      }>
    }
    stop: {
      num: number
      level: number
      dailyPeachLimit: number
      useNum: boolean
    }
  }

  // 洞天设置
  cave: {
    gatherEnergy: {
      enabled: boolean
      energyFirst: boolean
      robPos: boolean
      threshold: number
      minJoinTime: number
      randomJoinMinute: string
    }
    bag: {
      useJingPingShui: boolean
      useLingzhi: boolean
    }
    profession: {
      enabled: boolean
      index: number
      magicSwitchIndex: number
      spiritIndex: number
    }
    pupil: {
      enabled: boolean
      pushStudentToUnion: boolean
      quality?: number // 丢弃品质
      battleList?: number[] // 领悟保留配置
      fateList?: Array<{ type: number; value: number }> // 特质保留配置
    }
    DestinyFight: {
      enabled: boolean
      useItem?: boolean
      specifyTime?: boolean
      specifyTimeSetting?: string
      specifyDispatchOnEightHour?: boolean
      setEightHourTIme?: string
      challengeEnabled?: boolean
      challengeOnlyGuards: boolean
    }
    Yard: {
      YardHelpPeach: boolean
      YardSellCrop: boolean
    }
  }

  // 妖盟设置
  union: {
    unionBargainNum: number
    unionBargainPrice: number
    UnionBounty: {
      enabled: boolean
      UnionBountyRob_enabled: boolean
      UnionBountyRobUseXianYu: boolean
    }
    unionboss: {
      enabled: boolean
      index: number
      magicSwitchIndex: number
      spiritIndex: number
    }
  }

  // 挑战设置
  challenge: {
    common: {
      stage: boolean
      secretTower: boolean
      tower: boolean
      AutoSetTowerSkill: boolean
      towerSkills: number[]
      num: number
      challengeIndex: number
      magicSwitchIndex: number
      spiritIndex: number
      challengeSuccessReset: boolean
      towerWishFloor: number
      showResult: boolean
    }
    fight: {
      enabled: boolean
      robotOnly: boolean
      ticket: number
      fightIndex: number
      chaseWord?: string
      safeWord?: string
      refreshNum?: number
    }
    herorank: {
      enabled: boolean
      EnableDayOne: boolean
      RobotOnly: boolean
      BuyEnergy?: any[]
      HeroRankDays?: any[]
    }
    invade?: {
      enabled: boolean
      index: number
      magicSwitchIndex: number
      spiritIndex: number
    }
    skywar?: {
      enabled: boolean
      index: number
    }
    starTrial?: {
      enabled: boolean
      index: number
    }
    wildBoss?: {
      enabled: boolean
      index: number
    }
    caveTrial: {
      enabled: boolean
      index: number
      magicSwitchIndex: number
      spiritIndex: number
      challengeEnabled: boolean
      targetSpecificFloor?: boolean
      targetFloorNumber?: number
    }
  }

  // 活动设置
  activity: {
    autoFreePurchase: boolean
    xianyuActivityIDs?: number[]
    castSword: {
      enabled: boolean
      showResult: boolean
      useItem: boolean
    }
    composeBall: {
      enabled: boolean
      useItem: boolean
      useItemTimeHour: string
      ballNum: number
      useItemMaxNum: number
    }
    DragonHome: {
      enabled: boolean
      useItem: boolean
      energyKeepNum: number
    }
    WarSeason: {
      enabled: boolean
      BuyXianYuGoods: boolean
      RepeatBoss: boolean
      RepeatBossTimeRange?: string
      Conquered: boolean
      reconnectInterval: number
      ManorEnabled: boolean
      ManorTimeRange?: string
      EnterGhostCity: boolean
      CompoundBell: boolean // 引魂铃合成开关
      MoveCityEnabled: boolean // 迁城开关
      AttackCityEnabled: boolean // 攻城开关
      MoveCityKeywords: string
    }
    RoadDefend: {
      enabled: boolean
      stopAtBoss: boolean
      bossFloors: number[]
    }
    WeYond: {
      enabled: boolean
      energyKeepNum: number
    }
    heavenBattle: {
      enabled: boolean
      energyKeepNum: number
    }
    kunlunWar: {
      enabled: boolean
      energyKeepNum: number
    }
    HolyLand: {
      enabled: boolean
    }
    UnionBattle: {
      enabled: boolean
      BuffSelectIndex: number
      BattleStyle: number
      reserveEnergy: number
    }
    PupilExplore: {
      enabled: boolean
    }
    MonsterGo: {
      enabled: boolean
      BuyXianYuGoods: boolean
    }
    RebornTrial: {
      enabled: boolean
      useItem: boolean
      reserveStamina: number
      discr: number
      medicine: number
      eventOrder: number[]
    }
    puppet: {
      enabled: boolean
      energyKeepNum: number
    }
    monopoly: {
      enabled: boolean
      useItem: boolean
      reserveEnergy: number
    }
    UnionAreaWar: {
      enabled: boolean
      UseDragonItem: boolean
      UseDragonItemRankIds: number[]
      reserveStamina: number
    }
    Pharmacy: {
      enabled: boolean
    }
    manHuang: {
      disableAd: boolean
      enabled: boolean
      useItem: boolean
      autoRegion3: boolean
      handRegion3: boolean
      logHelp: boolean
    }
    skyTrade: {
      enabled: boolean
      useItem: boolean
    }
    xiyou: {
      enabled: boolean
      keepNum: number
      autoSettingCost: number
      multiple: number
      failureTolerance: number
      enableSecretChallenge: boolean
      enableSpecificFloor: boolean
      specificFloorNumber: number
      switchPreviewSkill: boolean
    }
    UnionPeakFight: {
      enabled: boolean
    }
    townDemon: {
      enabled: boolean
      index: number
      magicSwitchIndex: number
      spiritIndex: number
      pillageEnabled: boolean
      pillageFightValuePercent: number
    }
    unionDuel: {
      enabled: boolean
      duelValuePercent: number
      index: number
      magicSwitchIndex: number
      spiritIndex: number
    }
    BigChess: {
      enabled: boolean
    }
    bounce: {
      enabled: boolean
    }
    luckyRogue: {
      sweepEnabled: boolean
      challengeEnabled: boolean
      reserveStamina: number
      selectStyle: number
    }
    Lucky: {
      enabled: boolean
    }
  }

  // 灵脉设置
  talent: {
    enabled: boolean
    showResult: boolean
    quality: number
    stop: {
      num: number
    }
    main: [
      {
        primaryAttribute: number[]
        secondaryAttribute: number[]
      }
    ]
    separation: {
      condition: Array<{
        attribute: number[]
        skillId: number[]
        priority: number
      }>
    }
  }

  // 购物设置
  mall: {
    buyGoodLists: number[]
    popupGoodLists: number[]
  }
}
