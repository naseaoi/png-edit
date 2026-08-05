import { describe, expect, it } from "vitest"
import {
  getOutputDescriptor,
  getOutputFileName,
  getProcessingConfigKey,
  getUniqueFileName,
  normalizeBorderConfig,
} from "@/lib/image-processing"
import type { ProcessingConfig } from "@/types"

const createConfig = (borderEnabled: boolean): ProcessingConfig => ({
  backgroundColor: "#00ff00",
  border: {
    enabled: borderEnabled,
    top: 10,
    right: 20,
    bottom: 30,
    left: 40,
  },
  jpegQuality: 0.9,
})

describe("image processing configuration", () => {
  it("clamps unsafe border values", () => {
    expect(
      normalizeBorderConfig({
        enabled: true,
        top: -10,
        right: Number.POSITIVE_INFINITY,
        bottom: 9999,
        left: 12.6,
      }),
    ).toEqual({
      enabled: true,
      top: 0,
      right: 0,
      bottom: 500,
      left: 13,
    })
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

  it("changes the key when processing settings change", () => {
    const original = createConfig(false)
    const changed = { ...original, backgroundColor: "#ffffff" }
    expect(getProcessingConfigKey(original)).not.toBe(getProcessingConfigKey(changed))
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
