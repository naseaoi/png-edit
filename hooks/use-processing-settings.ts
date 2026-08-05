"use client"

import { useMemo, useState } from "react"
import { normalizeBorderConfig } from "@/lib/image-processing"
import type { BorderConfig, ProcessingConfig } from "@/types"

const DEFAULT_BORDER: BorderConfig = {
  enabled: false,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

export const useProcessingSettings = () => {
  const [selectedColor, setSelectedColor] = useState<string | null>("#00FF00")
  const [customColor, setCustomColor] = useState("#00FF00")
  const [border, setBorder] = useState(DEFAULT_BORDER)
  const [syncBorder, setSyncBorder] = useState(false)
  const [jpegQuality, setJpegQuality] = useState(0.9)
  const backgroundColor = selectedColor ?? customColor

  const config = useMemo<ProcessingConfig>(
    () => ({
      backgroundColor,
      border,
      jpegQuality,
    }),
    [backgroundColor, border, jpegQuality],
  )

  const selectPresetColor = (color: string) => {
    setSelectedColor(color)
  }

  const selectCustomColor = (color: string) => {
    setCustomColor(color)
    setSelectedColor(null)
  }

  const setBorderEnabled = (enabled: boolean) => {
    setBorder((current) => ({ ...current, enabled }))
  }

  const setBorderValue = (field: keyof Omit<BorderConfig, "enabled">, value: number) => {
    setBorder((current) => {
      if (syncBorder) {
        return normalizeBorderConfig({
          ...current,
          top: value,
          right: value,
          bottom: value,
          left: value,
        })
      }
      return normalizeBorderConfig({ ...current, [field]: value })
    })
  }

  const toggleBorderSync = () => {
    setSyncBorder((current) => {
      const next = !current
      if (next) {
        setBorder((borderValue) => ({
          ...borderValue,
          right: borderValue.top,
          bottom: borderValue.top,
          left: borderValue.top,
        }))
      }
      return next
    })
  }

  return {
    config,
    selectedColor,
    customColor,
    syncBorder,
    selectPresetColor,
    selectCustomColor,
    setBorderEnabled,
    setBorderValue,
    toggleBorderSync,
    setJpegQuality,
  }
}
