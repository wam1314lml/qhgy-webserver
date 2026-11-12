import type { ShareSection } from './sectionSelection'
import type { SharePayload, ShareProject } from './core'

export interface ConfigShareAdapter<T> {
  sections: readonly ShareSection[]
  project: ShareProject
  privacyNotice: string
  applyNotice: string
  exportConfig(current: T, selectedSections?: readonly string[]): SharePayload
  preview(current: T, payload: unknown): { config: T; groups: Array<{ name: string; count: number }>; count: number; ignored: number }
}
