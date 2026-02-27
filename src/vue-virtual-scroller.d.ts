declare module 'vue-virtual-scroller' {
  import { DefineComponent } from 'vue'

  export const RecycleScroller: DefineComponent<{
    items: any[]
    itemSize: number | string
    keyField?: string
    direction?: 'vertical' | 'horizontal'
    buffer?: number
    pageMode?: boolean
    prerender?: number
    emitUpdate?: boolean
  }>

  export const DynamicScroller: DefineComponent<{
    items: any[]
    minItemSize: number | string
    keyField?: string
    direction?: 'vertical' | 'horizontal'
    buffer?: number
    pageMode?: boolean
    prerender?: number
    emitUpdate?: boolean
  }>

  export const DynamicScrollerItem: DefineComponent<{
    item: any
    active: boolean
    sizeDependencies?: any[]
    watchData?: boolean
    tag?: string
    emitResize?: boolean
  }>

  const plugin: {
    install: (app: any) => void
  }

  export default plugin
}

