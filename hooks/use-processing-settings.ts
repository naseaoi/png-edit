"use client"

import { useMemo, useState } from "react"
import {
  normalizeMarginConfig,
  normalizeResizeConfig,
} from "@/lib/image-processing"
import { useModulePreferences } from "@/hooks/use-module-preferences"
import type {
  CompressionConfig,
  MarginConfig,
  ProcessingConfig,
  ResizeConfig,
} from "@/types"

const DEFAULT_MARGIN: MarginConfig = {
  enabled: false,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

const DEFAULT_COMPRESSION: CompressionConfig = {
  enabled: false,
  quality: 90,
}

const DEFAULT_RESIZE: ResizeConfig = {
  enabled: false,
  mode: "scale",
  scalePercent: 50,
  width: 1920,
  height: 1080,
  preserveAspectRatio: true,
}

export const useProcessingSettings = () => {
  const { preferences, setModuleEnabled } = useModulePreferences()
  const [selectedColor, setSelectedColor] = useState<string | null>("#00FF00")
  const [customColor, setCustomColor] = useState("#00FF00")
  const [margin, setMargin] = useState(DEFAULT_MARGIN)
  const [syncMargin, setSyncMargin] = useState(false)
  const [resize, setResize] = useState(DEFAULT_RESIZE)
  const [compression, setCompression] = useState(DEFAULT_COMPRESSION)
  const backgroundColor = selectedColor ?? customColor

  const config = useMemo<ProcessingConfig>(
    () => ({
      background: {
        enabled: preferences.background,
        color: backgroundColor,
      },
      margin: { ...margin, enabled: preferences.margin },
      transparentBorder: preferences.transparency,
      resize: { ...resize, enabled: preferences.resize },
      compression: { ...compression, enabled: preferences.compression },
    }),
    [backgroundColor, compression, margin, preferences, resize],
  )

  const selectPresetColor = (color: string) => {
    setSelectedColor(color)
  }

  const selectCustomColor = (color: string) => {
    setCustomColor(color)
    setSelectedColor(null)
  }

  const setMarginValue = (
    field: Exclude<keyof MarginConfig, "enabled">,
    value: number,
  ) => {
    setMargin((current) => {
      if (syncMargin) {
        return normalizeMarginConfig({
          ...current,
          top: value,
          right: value,
          bottom: value,
          left: value,
        })
      }
      return normalizeMarginConfig({ ...current, [field]: value })
    })
  }

  const toggleMarginSync = () => {
    setSyncMargin((current) => {
      const next = !current
      if (next) {
        setMargin((marginValue) => ({
          ...marginValue,
          right: marginValue.top,
          bottom: marginValue.top,
          left: marginValue.top,
        }))
      }
      return next
    })
  }

  const setResizeValue = <K extends keyof ResizeConfig>(
    field: K,
    value: ResizeConfig[K],
  ) => {
    if (field === "enabled") {
      setModuleEnabled("resize", Boolean(value))
      return
    }
    setResize((current) =>
      normalizeResizeConfig({ ...current, [field]: value }),
    )
  }

  const setCompressionValue = <K extends keyof CompressionConfig>(
    field: K,
    value: CompressionConfig[K],
  ) => {
    if (field === "enabled") {
      setModuleEnabled("compression", Boolean(value))
      return
    }
    setCompression((current) => ({ ...current, [field]: value }))
  }

  return {
    config,
    selectedColor,
    customColor,
    syncMargin,
    selectPresetColor,
    selectCustomColor,
    setBackgroundEnabled: (enabled: boolean) =>
      setModuleEnabled("background", enabled),
    setMarginValue,
    setMarginEnabled: (enabled: boolean) => setModuleEnabled("margin", enabled),
    setTransparentBorder: (enabled: boolean) =>
      setModuleEnabled("transparency", enabled),
    toggleMarginSync,
    setResizeValue,
    setCompressionValue,
  }
}
