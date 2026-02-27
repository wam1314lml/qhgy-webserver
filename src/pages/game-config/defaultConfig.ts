import type { GameConfig } from './types'

// 默认配置
export const createDefaultGameConfig = (): GameConfig => ({
  reconnectInterval: 300000,
  nickName: '徐少万天尊',
  basic: {
    hasSeparation: true,
    defaultIndex: 0,
    autoDuJie: false,
    autoUpgradeCloud1: false,
    autoUpgradeCloud2: false,
    DivineInsight: {
      InspireUpgrade: false,
    },
    autoXinMoJie: false,
    autoRestoreYuanti: false,
    autoRestoreYangshen: false,
    autoRestoreYinshen: false,
    defaultMagicIndex0: 0,
    defaultSpiritIndex0: 1,
    defaultMagicIndex1: 0,
    defaultSpiritIndex1: 1,
    defaultMagicIndex2: 0,
    defaultSpiritIndex2: 1,
    forceOnlineEnabled: false,
    forceOnlineTimeRanges: ['23:50-00:00'],
    pet: {
      enabled: true,
      autoCapture: true,
      wishPets: ['应龙', '鸾鸟', '青龙', '白虎', '朱雀', '玄武', '麒麟'],
    },
    specific: {
      useSendGift: false,
      useClaimDescendPoints: false,
      SkyWarWorship: false,
      GatherEneryWorship: false,
      UnionTreasureEnabled: false,
      UnionHonorHallPeakRankEnabled: false,
      YardEnabled: false,
      YardLianDanEnabled: false,
      PeachBanquetEnabled: false,
      DreamFreeSpeedUpEnabled: false,
      DreamFreeSpeedUpTime: '07:00-23:59',
      XianTuTreasureEnabled: false,
    },
  },
  homeland: {
    enabled: true,
    exclusiveMode: 0,
    autoHarvest: false,
    xianYuSteal: false,
    drainStaminaSteal: false,
    drainStaminaStealMode: 2,
    xianYuNum: 100000,
    homelandRulesByTime: [
      {
        startTime: '22:00',
        endTime: '01:00',
        rules: [
          { ItemId: 100004, minItemLv: 3, isCheck: true, description: '仙桃' },
          { ItemId: 100025, minItemLv: 5, isCheck: true, description: '净瓶水' },
          { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
          { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
          { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
          { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
          { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
        ],
      },
      {
        startTime: '10:00',
        endTime: '14:00',
        rules: [
          { ItemId: 100004, minItemLv: 3, isCheck: true, description: '仙桃' },
          { ItemId: 100025, minItemLv: 5, isCheck: true, description: '净瓶水' },
          { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
          { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
          { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
          { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
          { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
        ],
      },
      {
        startTime: '18:00',
        endTime: '21:30',
        rules: [
          { ItemId: 100004, minItemLv: 3, isCheck: true, description: '仙桃' },
          { ItemId: 100025, minItemLv: 5, isCheck: false, description: '净瓶水' },
          { ItemId: 100000, minItemLv: 5, isCheck: false, description: '仙玉' },
          { ItemId: 100003, minItemLv: 5, isCheck: false, description: '灵石' },
          { ItemId: 100029, minItemLv: 5, isCheck: false, description: '琉璃珠' },
          { ItemId: 100044, minItemLv: 5, isCheck: false, description: '天衍令' },
          { ItemId: 100047, minItemLv: 5, isCheck: false, description: '昆仑铁' },
        ],
      },
    ],
    xianYuStealTimeRange: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
      23,
    ], // 默认推荐时间段
    xianYuAlreadyStealNum: 3, // 默认使用3个位置
  },
  chopTree: {
    enabled: true,
    showResult: true,
    primaryAttrPriority: false,
    quality: 5,
    levelOffset: 0,
    probOffsetLowLv: 0.3,
    probOffset: 0.2,
    strictMode: true,
    fightValuePriority: false,
    timeRangeEnabled: false,
    timeRange: [],
    main: [
      {
        primaryAttribute: [],
        secondaryAttribute: [],
      },
    ],
    separation: {
      Conditions: [
        { primaryAttribute: [], secondaryAttribute: [] },
        { primaryAttribute: [], secondaryAttribute: [] },
        { primaryAttribute: [], secondaryAttribute: [] },
      ],
    },
    stop: {
      num: 0,
      level: 999999,
      dailyPeachLimit: 999999,
      useNum: false,
    },
  },
  cave: {
    gatherEnergy: {
      enabled: true,
      energyFirst: true,
      robPos: true,
      threshold: 400,
      minJoinTime: 27,
      randomJoinMinute: '21:55',
    },
    bag: {
      useJingPingShui: true,
      useLingzhi: true,
    },
    profession: {
      enabled: true,
      index: 0,
      magicSwitchIndex: 0,
      spiritIndex: 1,
    },
    pupil: {
      enabled: true,
      pushStudentToUnion: true,
      quality: 3, // 默认天纵之资
      battleList: [1018, 1017, 1021, 1022, 1023, 1024], // 默认全选
      fateList: [
        { type: 1017, value: 1.5 }, // 最终增伤
        { type: 1018, value: 2.5 }, // 最终减伤
        { type: 1021, value: 3 }, // 强化治疗
        { type: 1022, value: 4 }, // 弱化治疗
        { type: 1023, value: 5 }, // 强化灵兽
      ],
    },
    DestinyFight: {
      enabled: false,
      useItem: false,
      specifyTime: false,
      specifyTimeSetting: '23:30-23:59',
      specifyDispatchOnEightHour: false,
      setEightHourTIme: '08:30',
      challengeEnabled: false,
      challengeOnlyGuards: false,
    },
    Yard: {
      YardHelpPeach: false,
      YardSellCrop: false,
    },
  },
  union: {
    unionBargainNum: 0,
    unionBargainPrice: 0,
    UnionBounty: {
      enabled: true,
      UnionBountyRob_enabled: true,
      UnionBountyRobUseXianYu: true,
    },
    unionboss: {
      enabled: false,
      index: 0,
      magicSwitchIndex: 0,
      spiritIndex: 1,
    },
  },
  challenge: {
    common: {
      stage: true,
      secretTower: true,
      tower: false,
      AutoSetTowerSkill: true,
      towerSkills: [1017, 1023, 1001],
      num: 999,
      challengeIndex: 0,
      magicSwitchIndex: 0,
      spiritIndex: 1,
      challengeSuccessReset: false,
      towerWishFloor: 9999,
      showResult: false,
    },
    fight: {
      enabled: true,
      robotOnly: true,
      ticket: 2,
      fightIndex: 0,
      chaseWord: '',
      safeWord: '',
      refreshNum: 5,
    },
    herorank: {
      enabled: true,
      EnableDayOne: false,
      RobotOnly: false,
      BuyEnergy: [],
      HeroRankDays: [1, 2, 3, 4, 5], // 默认周一到周五
    },
    invade: {
      enabled: false,
      index: 0,
      magicSwitchIndex: 0,
      spiritIndex: 1,
    },
    skywar: {
      enabled: false,
      index: 0,
    },
    starTrial: {
      enabled: false,
      index: 0,
    },
    wildBoss: {
      enabled: false,
      index: 0,
    },
    caveTrial: {
      enabled: false,
      index: 0,
      magicSwitchIndex: 0,
      spiritIndex: 1,
      challengeEnabled: false,
      targetSpecificFloor: false,
      targetFloorNumber: 99,
    },
  },
  activity: {
    autoFreePurchase: true,
    xianyuActivityIDs: [],
    castSword: {
      enabled: true,
      showResult: true,
      useItem: false,
    },
    composeBall: {
      enabled: true,
      useItem: false,
      useItemTimeHour: '21:00',
      ballNum: 3,
      useItemMaxNum: 3,
    },
    DragonHome: {
      enabled: false,
      useItem: false,
      energyKeepNum: 0,
    },
    WarSeason: {
      enabled: false,
      BuyXianYuGoods: false,
      RepeatBoss: false,
      RepeatBossTimeRange: '23:30-23:59',
      Conquered: false,
      reconnectInterval: 0,
      ManorEnabled: false,
      ManorTimeRange: '22:00-07:00',
      EnterGhostCity: false,
      CompoundBell: false,
      MoveCityEnabled: false,
      AttackCityEnabled: false,
      MoveCityKeywords: '低战',
    },
    RoadDefend: {
      enabled: false,
      stopAtBoss: true,
      bossFloors: [49],
    },
    WeYond: {
      enabled: false,
      energyKeepNum: 0,
    },
    heavenBattle: {
      enabled: false,
      energyKeepNum: 18,
    },
    kunlunWar: {
      enabled: false,
      energyKeepNum: 0,
    },
    HolyLand: {
      enabled: false,
    },
    UnionBattle: {
      enabled: false,
      BuffSelectIndex: 0,
      BattleStyle: 1,
      reserveEnergy: 0,
    },
    PupilExplore: {
      enabled: false,
    },
    MonsterGo: {
      enabled: false,
      BuyXianYuGoods: false,
    },
    RebornTrial: {
      enabled: false,
      useItem: false,
      reserveStamina: 0,
      discr: 3,
      medicine: 3,
      eventOrder: [1, 2, 3],
    },
    puppet: {
      enabled: false,
      energyKeepNum: 0,
    },
    monopoly: {
      enabled: false,
      useItem: false,
      reserveEnergy: 0,
    },
    UnionAreaWar: {
      enabled: false,
      UseDragonItem: false,
      UseDragonItemRankIds: [],
      reserveStamina: 0,
    },
    Pharmacy: {
      enabled: false,
    },
    manHuang: {
      disableAd: false,
      enabled: false,
      useItem: false,
      autoRegion3: true,
      handRegion3: false,
      logHelp: true,
    },
    skyTrade: {
      enabled: false,
      useItem: false,
    },
    xiyou: {
      enabled: false,
      keepNum: 0,
      autoSettingCost: 1,
      multiple: 2,
      failureTolerance: 1,
      enableSecretChallenge: false,
      enableSpecificFloor: false,
      specificFloorNumber: 121,
      switchPreviewSkill: false,
    },
    UnionPeakFight: {
      enabled: false,
    },
    townDemon: {
      enabled: false,
      index: 0,
      magicSwitchIndex: 0,
      spiritIndex: 1,
      pillageEnabled: false,
      pillageFightValuePercent: 1,
    },
    unionDuel: {
      enabled: false,
      duelValuePercent: 1,
      index: 0,
      magicSwitchIndex: 0,
      spiritIndex: 0,
    },
    BigChess: {
      enabled: false,
    },
    bounce: {
      enabled: false,
    },
    luckyRogue: {
      sweepEnabled: false,
      challengeEnabled: false,
      reserveStamina: 50,
      selectStyle: 3,
    },
    Lucky: {
      enabled: false,
    },
  },
  talent: {
    enabled: false,
    showResult: false,
    quality: 5,
    stop: {
      num: 10000,
    },
    main: [
      {
        primaryAttribute: [],
        secondaryAttribute: [],
      },
    ],
    separation: {
      condition: [
        {
          attribute: [4, 14],
          skillId: [50006],
          priority: 0,
        },
        {
          attribute: [4, 11, 14],
          skillId: [50005],
          priority: 1,
        },
        {
          attribute: [4, 11, 12],
          skillId: [50004],
          priority: 2,
        },
      ],
    },
  },
  mall: {
    buyGoodLists: [],
    popupGoodLists: [],
  },
})
