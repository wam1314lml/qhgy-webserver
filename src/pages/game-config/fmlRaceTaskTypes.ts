// 此文件由 scripts/generate-qhgy-game-config-options.mjs 从奇幻果园公会竞赛导出生成，请勿手工维护。
export const fmlRaceTaskTypes: Array<{ key: string; label: string }> = [
  { key: "20003", label: "培育水果" },
  { key: "20005", label: "材料商店购买" },
  { key: "20007", label: "顾客订单" },
  { key: "20009", label: "居民订单" },
  { key: "20010", label: "珍珠采集雇佣" },
  { key: "20011", label: "特供订单" },
  { key: "20015", label: "水果升级" },
  { key: "20019", label: "上架果艺品" },
  { key: "20028", label: "藏品盲盒" },
  { key: "20036", label: "VIP商店购买" },
  { key: "20045", label: "制作果艺品" },
  { key: "20046", label: "收获指定水果" },
  { key: "20047", label: "琼宵月影抽取" },
]

export const defaultFmlRaceTaskTypePriority: Record<string, number> = {
  "20003": 0,
  "20005": 0,
  "20007": 0,
  "20009": 0,
  "20010": 0,
  "20011": 0,
  "20015": 0,
  "20019": 0,
  "20028": 0,
  "20036": 0,
  "20045": 0,
  "20046": 1,
  "20047": 0,
}
