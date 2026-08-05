import { describe, expect, it } from "vitest"
import {
  getCanvasLayout,
  getCanvasBackground,
  getOutputDescriptor,
  getOutputFileName,
  getProcessingConfigKey,
  getUniqueFileName,
  normalizeMarginConfig,
} from "@/lib/image-processing"
import type { ProcessingConfig } from "@/types"

const createConfig = (transparentBorder: boolean): ProcessingConfig => ({
  backgroundColor: "#00ff00",
  margin: {
    top: 10,
    right: 20,
    bottom: 30,
    left: 40,
  },
  transparentBorder,
  jpegQuality: 0.9,
})

describe("image processing configuration", () => {
  it("clamps unsafe margin values", () => {
    expect(
      normalizeMarginConfig({
        top: -10,
        right: Number.POSITIVE_INFINITY,
        bottom: 9999,
        left: 12.6,
      }),
    ).toEqual({
      top: 0,
      right: 0,
      bottom: 500,
      left: 13,
    })
  })

  it("applies margins independently from transparent borders", () => {
    const opaqueLayout = getCanvasLayout(100, 50, createConfig(false).margin)
    const transparentLayout = getCanvasLayout(100, 50, createConfig(true).margin)

    expect(opaqueLayout).toEqual({ width: 160, height: 90, left: 40, top: 10 })
    expect(transparentLayout).toEqual(opaqueLayout)
  })

  it("uses PNG only when transparent borders are enabled", () => {
    expect(getOutputDescriptor(createConfig(true))).toEqual({
      mimeType: "image/png",
      extension: "png",
    })
    expect(getOutputDescriptor(createConfig(false))).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
    })
  })

  it("does not apply a background to transparent output", () => {
    expect(getCanvasBackground(createConfig(true))).toBeNull()
    expect(getCanvasBackground(createConfig(false))).toBe("#00ff00")
  })

  it("changes the key when processing settings change", () => {
    const original = createConfig(false)
    const backgroundChanged = { ...original, backgroundColor: "#ffffff" }
    const marginChanged = {
      ...original,
      margin: { ...original.margin, top: original.margin.top + 1 },
    }
    const transparencyChanged = { ...original, transparentBorder: true }
    const transparentBackgroundChanged = {
      ...transparencyChanged,
      backgroundColor: "#ffffff",
    }

    expect(getProcessingConfigKey(original)).not.toBe(
      getProcessingConfigKey(backgroundChanged),
    )
    expect(getProcessingConfigKey(original)).not.toBe(
      getProcessingConfigKey(marginChanged),
    )
    expect(getProcessingConfigKey(original)).not.toBe(
      getProcessingConfigKey(transparencyChanged),
    )
    expect(getProcessingConfigKey(transparencyChanged)).toBe(
      getProcessingConfigKey(transparentBackgroundChanged),
    )
  })
})

describe("output file names", () => {
  it("sanitizes names and handles uppercase extensions", () => {
    expect(getOutputFileName('bad:name.PNG', createConfig(false))).toBe(
      "bad_name_processed.jpg",
    )
  })

  it("keeps duplicate ZIP entries unique", () => {
    const usedNames = new Set<string>()
    expect(getUniqueFileName("image.jpg", usedNames)).toBe("image.jpg")
    expect(getUniqueFileName("image.jpg", usedNames)).toBe("image_2.jpg")
    expect(getUniqueFileName("IMAGE.jpg", usedNames)).toBe("IMAGE_3.jpg")
  })
})
