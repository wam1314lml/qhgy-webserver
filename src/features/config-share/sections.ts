import type { ShareSection } from './sectionSelection'

// 与实际配置页签一致；更细的路径覆盖上层分类。
export const shareSections: readonly ShareSection[] = [
  {
    "key": "basic",
    "label": "基础",
    "paths": [
      "basic"
    ]
  },
  {
    "key": "plant",
    "label": "种植",
    "paths": [
      "plant"
    ]
  },
  {
    "key": "order",
    "label": "订单",
    "paths": [
      "order",
      "basic.hasSeparation"
    ]
  },
  {
    "key": "union",
    "label": "公会",
    "paths": [
      "union"
    ]
  },
  {
    "key": "activity",
    "label": "活动",
    "paths": [
      "activity"
    ]
  }
]
