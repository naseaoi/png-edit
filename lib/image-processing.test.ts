import { describe, expect, it } from "vitest"
import {
  getCanvasBackground,
  getCanvasLayout,
  getOutputDescriptor,
  getOutputFileName,
  getPngColorCount,
  getProcessingConfigKey,
  getResizedDimensions,
  getUniqueFileName,
  normalizeMarginConfig,
  normalizeResizeConfig,
} from "@/lib/image-processing"
import type { ProcessingConfig } from "@/types"

const createConfig = (): ProcessingConfig => ({
  background: {
    enabled: true,
    color: "#00ff00",
  },
  margin: {
    enabled: true,
    top: 10,
    right: 20,
    bottom: 30,
    left: 40,
  },
  transparentBorder: false,
  resize: {
    enabled: false,
    mode: "scale",
    scalePercent: 50,
    width: 1920,
    height: 1080,
    preserveAspectRatio: true,
  },
  compression: {
    enabled: true,
    quality: 90,
  },
})

describe("image processing configuration", () => {
  it("clamps unsafe margin values", () => {
    expect(
      normalizeMarginConfig({
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

  it("applies margins only when enabled", () => {
    const config = createConfig()
    expect(getCanvasLayout(100, 50, config.margin)).toEqual({
      width: 160,
      height: 90,
      left: 40,
      top: 10,
    })
    expect(
      getCanvasLayout(100, 50, { ...config.margin, enabled: false }),
    ).toEqual({ width: 100, height: 50, left: 0, top: 0 })
  })

  it("preserves the source format unless an output mode changes it", () => {
    const config = createConfig()
    expect(getOutputDescriptor(config)).toEqual({
      mimeType: "image/jpeg",
      extension: "jpg",
    })
    expect(
      getOutputDescriptor(
        {
          ...config,
          background: { ...config.background, enabled: false },
        },
        "image/png",
      ),
    ).toEqual({ mimeType: "image/png", extension: "png" })
    expect(
      getOutputDescriptor(
        {
          ...config,
          background: { ...config.background, enabled: false },
        },
        "image/jpeg",
      ),
    ).toEqual({ mimeType: "image/jpeg", extension: "jpg" })
    expect(
      getOutputDescriptor(
        {
          ...config,
          background: { ...config.background, enabled: false },
        },
        "image/webp",
      ),
    ).toEqual({ mimeType: "image/webp", extension: "webp" })
    expect(getOutputDescriptor({ ...config, transparentBorder: true })).toEqual({
      mimeType: "image/png",
      extension: "png",
    })
  })

  it("applies a background only when enabled and opaque", () => {
    const config = createConfig()
    expect(getCanvasBackground(config)).toBe("#00ff00")
    expect(
      getCanvasBackground({
        ...config,
        background: { ...config.background, enabled: false },
      }),
    ).toBeNull()
    expect(getCanvasBackground({ ...config, transparentBorder: true })).toBeNull()
  })

  it("ignores every disabled module value in the configuration key", () => {
    const original = createConfig()
    const dormant = {
      ...original,
      background: { enabled: false, color: "#00ff00" },
      margin: { ...original.margin, enabled: false },
      compression: { enabled: false, quality: 90 },
    }
    expect(getProcessingConfigKey(dormant)).toBe(
      getProcessingConfigKey({
        ...dormant,
        background: { enabled: false, color: "#ffffff" },
        margin: { enabled: false, top: 1, right: 2, bottom: 3, left: 4 },
        compression: { enabled: false, quality: 60 },
        resize: { ...dormant.resize, scalePercent: 25 },
      }),
    )
  })

  it("changes the key when enabled module values change", () => {
    const original = createConfig()
    expect(getProcessingConfigKey(original)).not.toBe(
      getProcessingConfigKey({
        ...original,
        background: { ...original.background, color: "#ffffff" },
      }),
    )
    expect(getProcessingConfigKey(original)).not.toBe(
      getProcessingConfigKey({
        ...original,
        margin: { ...original.margin, top: 11 },
      }),
    )
    expect(getProcessingConfigKey(original)).not.toBe(
      getProcessingConfigKey({
        ...original,
        compression: { ...original.compression, quality: 80 },
      }),
    )
  })
})

describe("image compression", () => {
  it("uses lossless PNG encoding at quality 100", () => {
    expect(getPngColorCount(100)).toBe(0)
  })

  it("increases the PNG palette with quality", () => {
    expect(getPngColorCount(60)).toBe(64)
    expect(getPngColorCount(90)).toBeGreaterThan(getPngColorCount(70))
  })
})

describe("image resizing", () => {
  const resize = createConfig().resize

  it("normalizes unsafe resize values", () => {
    expect(
      normalizeResizeConfig({
        ...resize,
        scalePercent: 150,
        width: Number.POSITIVE_INFINITY,
        height: -20,
      }),
    ).toEqual({
      ...resize,
      scalePercent: 100,
      width: 1,
      height: 1,
    })
  })

  it("shrinks both dimensions by percentage", () => {
    expect(
      getResizedDimensions(1200, 800, {
        ...resize,
        enabled: true,
        scalePercent: 25,
      }),
    ).toEqual({ width: 300, height: 200 })
  })

  it("fits custom dimensions without changing the aspect ratio", () => {
    expect(
      getResizedDimensions(1600, 900, {
        ...resize,
        enabled: true,
        mode: "dimensions",
        width: 800,
        height: 800,
      }),
    ).toEqual({ width: 800, height: 450 })
  })

  it("uses exact custom dimensions when aspect ratio is unlocked", () => {
    expect(
      getResizedDimensions(1600, 900, {
        ...resize,
        enabled: true,
        mode: "dimensions",
        width: 640,
        height: 480,
        preserveAspectRatio: false,
      }),
    ).toEqual({ width: 640, height: 480 })
  })
})

describe("output file names", () => {
  it("sanitizes names and handles uppercase extensions", () => {
    expect(getOutputFileName('bad:name.PNG', createConfig())).toBe(
      "bad_name_processed.jpg",
    )
  })

  it("uses the detected source format instead of the file extension", () => {
    const config = {
      ...createConfig(),
      background: { ...createConfig().background, enabled: false },
    }
    expect(getOutputFileName("renamed.PNG", config, "image/jpeg")).toBe(
      "renamed_processed.jpg",
    )
    expect(getOutputFileName("asset.jpeg", config, "image/webp")).toBe(
      "asset_processed.webp",
    )
  })

  it("keeps duplicate ZIP entries unique", () => {
    const usedNames = new Set<string>()
    expect(getUniqueFileName("image.jpg", usedNames)).toBe("image.jpg")
    expect(getUniqueFileName("image.jpg", usedNames)).toBe("image_2.jpg")
    expect(getUniqueFileName("IMAGE.jpg", usedNames)).toBe("IMAGE_3.jpg")
  })
})
