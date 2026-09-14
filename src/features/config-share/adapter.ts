import type { SharePayload, ShareProject } from './core'

export interface ConfigShareAdapter<T> {
  project: ShareProject
  privacyNotice: string
  applyNotice: string
  exportConfig(current: T): SharePayload
  preview(current: T, payload: unknown): { config: T; groups: Array<{ name: string; count: number }>; count: number; ignored: number }
}
