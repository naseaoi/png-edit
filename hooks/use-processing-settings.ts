"use client"

import { useMemo, useState } from "react"
import { normalizeMarginConfig } from "@/lib/image-processing"
import type { MarginConfig, ProcessingConfig } from "@/types"

const DEFAULT_MARGIN: MarginConfig = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

export const useProcessingSettings = () => {
  const [selectedColor, setSelectedColor] = useState<string | null>("#00FF00")
  const [customColor, setCustomColor] = useState("#00FF00")
  const [margin, setMargin] = useState(DEFAULT_MARGIN)
  const [transparentBorder, setTransparentBorder] = useState(false)
  const [syncMargin, setSyncMargin] = useState(false)
  const [jpegQuality, setJpegQuality] = useState(0.9)
  const backgroundColor = selectedColor ?? customColor

  const config = useMemo<ProcessingConfig>(
    () => ({
      backgroundColor,
      margin,
      transparentBorder,
      jpegQuality,
    }),
    [backgroundColor, jpegQuality, margin, transparentBorder],
  )

  const selectPresetColor = (color: string) => {
    setSelectedColor(color)
  }

  const selectCustomColor = (color: string) => {
    setCustomColor(color)
    setSelectedColor(null)
  }

  const setMarginValue = (field: keyof MarginConfig, value: number) => {
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

  return {
    config,
    selectedColor,
    customColor,
    syncMargin,
    selectPresetColor,
    selectCustomColor,
    setMarginValue,
    setTransparentBorder,
    toggleMarginSync,
    setJpegQuality,
  }
}
