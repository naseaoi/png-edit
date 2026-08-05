import { describe, expect, it } from "vitest"
import * as UPNG from "upng-js"
import { encodeRgbaToPng } from "@/lib/png-compression"

describe("lossless PNG encoding", () => {
  it("preserves every RGBA channel", async () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 0,
      0, 255, 0, 64,
      0, 0, 255, 128,
      255, 255, 255, 255,
    ])
    const blob = encodeRgbaToPng(rgba, 2, 2)
    const decoded = UPNG.decode(await blob.arrayBuffer())
    const [decodedRgba] = UPNG.toRGBA8(decoded)

    expect(blob.type).toBe("image/png")
    expect(Array.from(new Uint8Array(decodedRgba))).toEqual(Array.from(rgba))
  })

  it("rejects mismatched pixel data", () => {
    expect(() => encodeRgbaToPng(new Uint8ClampedArray(4), 2, 2)).toThrow(
      "PNG 编码数据无效",
    )
  })

  it("rejects unsafe palette sizes", () => {
    expect(() => encodeRgbaToPng(new Uint8ClampedArray(4), 1, 1, 4097)).toThrow(
      "PNG 编码数据无效",
    )
  })

  it("uses a smaller palette for opaque images when enabled", () => {
    const rgba = new Uint8ClampedArray(64 * 64 * 4)
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const offset = (y * 64 + x) * 4
        rgba[offset] = (x % 4) * 64
        rgba[offset + 1] = (y % 4) * 64
        rgba[offset + 2] = 128
        rgba[offset + 3] = 255
      }
    }

    const paletteBlob = encodeRgbaToPng(rgba, 64, 64, 64, false)
    const rgbaBlob = encodeRgbaToPng(rgba, 64, 64, 64, true)

    expect(paletteBlob.size).toBeLessThan(rgbaBlob.size)
  })
})
