"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import {
  MODULE_PREFERENCES_KEY,
  parseModulePreferences,
  type ModulePreferences,
} from "@/lib/processing-preferences"
import type { ProcessingModule } from "@/types"

const PREFERENCES_EVENT = "png-edit:module-preferences"
let fallbackPreferences: string | null | undefined

const persistPreferences = (nextValue: string) => {
  fallbackPreferences = nextValue
  try {
    window.localStorage.setItem(MODULE_PREFERENCES_KEY, nextValue)
  } catch {
    // 本地偏好写入失败
  }
  window.dispatchEvent(new Event(PREFERENCES_EVENT))
}

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
    (module: Exclude<keyof ModulePreferences, "moduleOrder">, enabled: boolean) => {
      const next = {
        ...parseModulePreferences(readPreferences()),
        [module]: enabled,
      }
      persistPreferences(JSON.stringify(next))
    },
    [],
  )

  const setModuleOrder = useCallback((order: ProcessingModule[]) => {
    const next = {
      ...parseModulePreferences(readPreferences()),
      moduleOrder: order,
    }
    persistPreferences(JSON.stringify(next))
  }, [])

  return { preferences, setModuleEnabled, setModuleOrder }
}
