"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import {
  MODULE_PREFERENCES_KEY,
  parseModulePreferences,
  type ModulePreferences,
} from "@/lib/processing-preferences"

const PREFERENCES_EVENT = "png-edit:module-preferences"
let fallbackPreferences: string | null | undefined

const readPreferences = () => {
  if (fallbackPreferences !== undefined) return fallbackPreferences
  try {
    return window.localStorage.getItem(MODULE_PREFERENCES_KEY)
  } catch {
    return null
  }
}

const subscribe = (onStoreChange: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== MODULE_PREFERENCES_KEY) return
    fallbackPreferences = event.newValue
    onStoreChange()
  }
  window.addEventListener("storage", handleStorage)
  window.addEventListener(PREFERENCES_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(PREFERENCES_EVENT, onStoreChange)
  }
}

export const useModulePreferences = () => {
  const storedValue = useSyncExternalStore(subscribe, readPreferences, () => null)
  const preferences = useMemo(
    () => parseModulePreferences(storedValue),
    [storedValue],
  )

  const setModuleEnabled = useCallback(
    (module: keyof ModulePreferences, enabled: boolean) => {
      const nextValue = JSON.stringify({
        ...parseModulePreferences(readPreferences()),
        [module]: enabled,
      })
      fallbackPreferences = nextValue
      try {
        window.localStorage.setItem(MODULE_PREFERENCES_KEY, nextValue)
      } catch {
        // 本地偏好写入失败
      }
      window.dispatchEvent(new Event(PREFERENCES_EVENT))
    },
    [],
  )

  return { preferences, setModuleEnabled }
}
