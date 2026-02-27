const sourceData = [
  {
    id: 110000010,
    name: '道书x1',
    group: '坊市商店',
  },
  {
    id: 110000013,
    name: '五色石x1',
    group: '坊市商店',
  },
  {
    id: 110000007,
    name: '净瓶水x1',
    group: '坊市商店',
  },
  {
    id: 110000020,
    name: '玄黄果x50',
    group: '坊市商店',
  },
  {
    id: 110000026,
    name: '神衍符x1',
    group: '坊市商店',
  },
  {
    id: 110000027,
    name: '天道古籍x1',
    group: '坊市商店',
  },
  {
    id: 110000022,
    name: '天工图纸x1',
    group: '坊市商店',
  },
  {
    id: 110000019,
    name: '本源丹x1',
    group: '坊市商店',
  },
  {
    id: 110000021,
    name: '太虚元石x1',
    group: '坊市商店',
  },
  {
    id: 110000024,
    name: '引灵灯x1',
    group: '坊市商店',
  },
  {
    id: 110000016,
    name: '腾蛇信物x1',
    group: '坊市商店',
  },
  {
    id: 110000025,
    name: '凡品聚灵瓶x1',
    group: '坊市商店',
  },
  {
    id: 250000004,
    name: '1级印记礼包x1',
    group: '群英商店',
  },
  {
    id: 250000003,
    name: '道书x1',
    group: '群英商店',
  },
  {
    id: 250000001,
    name: '仙桃x50',
    group: '群英商店',
  },
  {
    id: 230000005,
    name: '净瓶水x5',
    group: '妖盟商店',
  },
  {
    id: 230000007,
    name: '道书x3',
    group: '妖盟商店',
  },
  {
    id: 230000006,
    name: '净瓶水x10',
    group: '妖盟商店',
  },
  {
    id: 230000016,
    name: '净瓶水x10',
    group: '妖盟商店',
  },
  {
    id: 230000017,
    name: '仙桃x100',
    group: '妖盟商店',
  },
  {
    id: 230000018,
    name: '悟道石头x100',
    group: '妖盟商店',
  },
  {
    id: 230000001,
    name: '仙桃x50',
    group: '妖盟商店',
  },
  {
    id: 230000002,
    name: '仙桃x100',
    group: '妖盟商店',
  },
  {
    id: 230000014,
    name: '玄黄果x200',
    group: '妖盟商店',
  },
  {
    id: 230000008,
    name: '传说随机精怪碎片x1',
    group: '妖盟商店',
  },
  {
    id: 230000011,
    name: '仙桃x10',
    group: '妖盟商店',
  },
  {
    id: 230000012,
    name: '腾蛇信物x1',
    group: '妖盟商店',
  },
  {
    id: 230000013,
    name: '玄黄果x100',
    group: '妖盟商店',
  },
  {
    id: 230000015,
    name: '玄黄果x200',
    group: '妖盟商店',
  },
  {
    id: 450000001,
    name: '传说自选精怪碎片x1',
    group: '荣誉商店',
  },
  {
    id: 450000002,
    name: '自选传说法宝碎片x1',
    group: '荣誉商店',
  },
  {
    id: 450000003,
    name: '天衍令x20',
    group: '荣誉商店',
  },
  {
    id: 450000004,
    name: '寻宝罗盘x1',
    group: '荣誉商店',
  },
  {
    id: 450000005,
    name: '召唤令x1',
    group: '荣誉商店',
  },
  {
    id: 450000006,
    name: '随机炼化宝箱x5',
    group: '荣誉商店',
  },
  {
    id: 450000007,
    name: '召唤令x1',
    group: '荣誉商店',
  },
  {
    id: 450000008,
    name: '昆仑铁x20',
    group: '荣誉商店',
  },
  {
    id: 450000009,
    name: '灵兽果x200',
    group: '荣誉商店',
  },
  {
    id: 450000010,
    name: '庚金x10',
    group: '荣誉商店',
  },
  {
    id: 450000011,
    name: '道书x1',
    group: '荣誉商店',
  },
  {
    id: 450000012,
    name: '先天灵草x10',
    group: '荣誉商店',
  },
  {
    id: 590000001,
    name: '自选神话灵兽碎片x1',
    group: '九幽秘宝',
  },
  {
    id: 590000002,
    name: '随机传说法宝碎片x1',
    group: '九幽秘宝',
  },
  {
    id: 590000003,
    name: '悟道石x10',
    group: '九幽秘宝',
  },
  {
    id: 590000004,
    name: '天衍令x20',
    group: '九幽秘宝',
  },
  {
    id: 590000005,
    name: '寻宝罗盘x1',
    group: '九幽秘宝',
  },
  {
    id: 590000006,
    name: '召唤令x1',
    group: '九幽秘宝',
  },
  {
    id: 590000007,
    name: '随机炼化宝箱x5',
    group: '九幽秘宝',
  },
  {
    id: 590000008,
    name: '昆仑铁x10',
    group: '九幽秘宝',
  },
  {
    id: 590000009,
    name: '灵兽果x100',
    group: '九幽秘宝',
  },
  {
    id: 590000010,
    name: '道书x1',
    group: '九幽秘宝',
  },
  {
    id: 590000101,
    name: '免费礼包仙桃x20',
    group: '九幽礼包',
  },
  {
    id: 590000102,
    name: '九幽宝珠仙玉礼包x1',
    group: '九幽礼包',
  },
  {
    id: 590000105,
    name: '免费礼包仙桃x20（九幽决赛）',
    group: '九幽礼包',
  },
  {
    id: 590000106,
    name: '九幽宝珠仙玉礼包x1（九幽决赛）',
    group: '九幽礼包',
  },
  {
    id: 920000001,
    name: '随机传说法宝碎片x25',
    group: '三界商店',
  },
  {
    id: 920000002,
    name: '仙桃x300',
    group: '三界商店',
  },
  {
    id: 920000003,
    name: '悟道石x10',
    group: '三界商店',
  },
  {
    id: 920000004,
    name: '悟道石x10',
    group: '三界商店',
  },
  {
    id: 920000005,
    name: '悟道石x10',
    group: '三界商店',
  },
  {
    id: 920000006,
    name: '寻宝罗盘x1',
    group: '三界商店',
  },
  {
    id: 920000007,
    name: '御灵石x10',
    group: '三界商店',
  },
  {
    id: 920000008,
    name: '召唤令x1',
    group: '三界商店',
  },
  {
    id: 920000009,
    name: '天衍令x20',
    group: '三界商店',
  },
  {
    id: 920000010,
    name: '灵兽果x500',
    group: '三界商店',
  },
  {
    id: 920000011,
    name: '道书x10',
    group: '三界商店',
  },
  {
    id: 980000004,
    name: '免费仙桃x20',
    group: '玄尘忆梦',
  },
  {
    id: 980000005,
    name: '视频激励绘卷x1',
    group: '玄尘忆梦',
  },
  {
    id: 980000006,
    name: '仙玉*128礼包x1',
    group: '玄尘忆梦',
  },
  {
    id: 1020000043,
    name: '福利宝箱x1',
    group: '寻道夺魁',
  },
  {
    id: 400000025,
    name: '小妖免费礼包',
    group: '小妖快跑',
  },
  {
    id: 410000055,
    name: '小妖视频激励',
    group: '小妖快跑',
  },
  {
    id: 350000081,
    name: '小妖仙玉*158礼包x3',
    group: '小妖快跑',
  },

  {
    id: 1230000001,
    name: '神脊破境丹x1',
    group: '神躯商店',
  },
  {
    id: 1230000002,
    name: '天道古籍x1',
    group: '神躯商店',
  },
  {
    id: 1230000003,
    name: '天道古籍x1',
    group: '神躯商店',
  },
  {
    id: 1230000004,
    name: '天道古籍x1',
    group: '神躯商店',
  },
  {
    id: 1230000005,
    name: '真元x1',
    group: '神躯商店',
  },
  {
    id: 1230000006,
    name: '先天神水x1',
    group: '神躯商店',
  },
  {
    id: 1230000007,
    name: '御灵石x1',
    group: '神躯商店',
  },
  {
    id: 1230000008,
    name: '召唤令x1',
    group: '神躯商店',
  },
  {
    id: 1230000009,
    name: '天衍令x1',
    group: '神躯商店',
  },
  {
    id: 12300000010,
    name: '灵兽果x1',
    group: '神躯商店',
  },
  {
    id: 12300000011,
    name: '道书x1',
    group: '神躯商店',
  },
]

// 把 souceData 转换为树形结构
const treeData = sourceData.reduce(
  (acc, item) => {
    acc[item.group] = acc[item.group] || []
    acc[item.group].push(item)
    return acc
  },
  {} as Record<string, typeof sourceData>,
)

console.log(treeData)

export { treeData }
