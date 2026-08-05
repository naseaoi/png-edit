export interface ModulePreferences {
  background: boolean
  resize: boolean
  margin: boolean
  transparency: boolean
  compression: boolean
}

export const MODULE_PREFERENCES_KEY = "png-edit.module-preferences.v1"

export const DEFAULT_MODULE_PREFERENCES: ModulePreferences = {
  background: false,
  resize: false,
  margin: false,
  transparency: false,
  compression: false,
}

export const parseModulePreferences = (value: string | null): ModulePreferences => {
  if (!value) return DEFAULT_MODULE_PREFERENCES

  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_MODULE_PREFERENCES
    }

    const candidate = parsed as Record<string, unknown>
    return {
      background:
        typeof candidate.background === "boolean" ? candidate.background : false,
      resize: typeof candidate.resize === "boolean" ? candidate.resize : false,
      margin: typeof candidate.margin === "boolean" ? candidate.margin : false,
      transparency:
        typeof candidate.transparency === "boolean"
          ? candidate.transparency
          : false,
      compression:
        typeof candidate.compression === "boolean"
          ? candidate.compression
          : false,
    }
  } catch {
    return DEFAULT_MODULE_PREFERENCES
  }
}
