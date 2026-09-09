import {
  DEFAULT_MODULE_ORDER,
  normalizeModuleOrder,
} from "@/lib/image-processing"
import type { ProcessingModule } from "@/types"

export interface ModulePreferences {
  background: boolean
  resize: boolean
  margin: boolean
  transparency: boolean
  compression: boolean
  moduleOrder: ProcessingModule[]
}

export const MODULE_PREFERENCES_KEY = "png-edit.module-preferences.v1"

export const DEFAULT_MODULE_PREFERENCES: ModulePreferences = {
  background: false,
  resize: false,
  margin: false,
  transparency: false,
  compression: false,
  moduleOrder: DEFAULT_MODULE_ORDER,
}

const MODULE_FLAGS: Array<{
  key: string
  field: "background" | "resize" | "margin" | "transparency" | "compression"
}> = [
  { key: "background", field: "background" },
  { key: "resize", field: "resize" },
  { key: "margin", field: "margin" },
  { key: "transparency", field: "transparency" },
  { key: "compression", field: "compression" },
]

export const parseModulePreferences = (value: string | null): ModulePreferences => {
  if (!value) return DEFAULT_MODULE_PREFERENCES

  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_MODULE_PREFERENCES
    }

    const candidate = parsed as Record<string, unknown>
    const preferences = {
      ...DEFAULT_MODULE_PREFERENCES,
    } as ModulePreferences
    MODULE_FLAGS.forEach(({ key, field }) => {
      if (typeof candidate[key] === "boolean") {
        preferences[field] = candidate[key] as boolean
      }
    })
    preferences.moduleOrder = normalizeModuleOrder(candidate.moduleOrder)
    return preferences
  } catch {
    return DEFAULT_MODULE_PREFERENCES
  }
}
