import { describe, expect, it } from "vitest"
import {
  getFileKey,
  readImageMetadata,
  readJpegDimensions,
  readPngDimensions,
  readWebpDimensions,
  validateImageFiles,
} from "@/lib/image-validation"

const createPngFile = (name: string, width: number, height: number) => {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  bytes.set([73, 72, 68, 82], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return new File([bytes], name, { type: "image/png", lastModified: 1 })
}

const createJpegFile = (name: string, width: number, height: number) => {
  const bytes = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x08, 0x08,
    height >> 8, height & 0xff,
    width >> 8, width & 0xff,
    0x01,
    0xff, 0xd9,
  ])
  return new File([bytes], name, { type: "image/jpeg", lastModified: 2 })
}

const createWebpFile = (name: string, width: number, height: number) => {
  const bytes = new Uint8Array(30)
  bytes.set(Array.from("RIFF").map((value) => value.charCodeAt(0)), 0)
  bytes.set(Array.from("WEBPVP8X").map((value) => value.charCodeAt(0)), 8)
  const widthMinusOne = width - 1
  const heightMinusOne = height - 1
  bytes.set([
    widthMinusOne & 0xff,
    (widthMinusOne >> 8) & 0xff,
    (widthMinusOne >> 16) & 0xff,
  ], 24)
  bytes.set([
    heightMinusOne & 0xff,
    (heightMinusOne >> 8) & 0xff,
    (heightMinusOne >> 16) & 0xff,
  ], 27)
  return new File([bytes], name, { type: "image/webp", lastModified: 3 })
}

describe("image metadata", () => {
  it("reads PNG dimensions from the IHDR header", async () => {
    await expect(readPngDimensions(createPngFile("valid.png", 640, 480))).resolves.toEqual({
      width: 640,
      height: 480,
    })
  })

  it("reads JPEG dimensions from a SOF marker", async () => {
    await expect(readJpegDimensions(createJpegFile("valid.jpg", 800, 600))).resolves.toEqual({
      width: 800,
      height: 600,
    })
  })

  it("reads WebP dimensions from a VP8X header", async () => {
    await expect(readWebpDimensions(createWebpFile("valid.webp", 1024, 768))).resolves.toEqual({
      width: 1024,
      height: 768,
    })
  })

  it("detects the real format instead of trusting the declared MIME type", async () => {
    const jpeg = createJpegFile("renamed.png", 320, 240)
    const disguised = new File([await jpeg.arrayBuffer()], jpeg.name, {
      type: "image/png",
    })
    await expect(readImageMetadata(disguised)).resolves.toEqual({
      width: 320,
      height: 240,
      mimeType: "image/jpeg",
    })
  })

  it("rejects unsupported file content", async () => {
    const file = new File(["not an image"], "fake.png", { type: "image/png" })
    await expect(readImageMetadata(file)).rejects.toThrow(
      "仅支持 PNG、JPG 和 WebP 图片",
    )
  })
})

describe("validateImageFiles", () => {
  it("accepts every supported format and rejects duplicates", async () => {
    const png = createPngFile("sample.png", 10, 20)
    const jpeg = createJpegFile("sample.jpg", 30, 40)
    const webp = createWebpFile("sample.webp", 50, 60)
    const result = await validateImageFiles([png, jpeg, webp, png], {
      existingCount: 0,
      existingBytes: 0,
      existingKeys: new Set(),
    })

    expect(result.accepted.map(({ width, height, mimeType }) => ({
      width,
      height,
      mimeType,
    }))).toEqual([
      { width: 10, height: 20, mimeType: "image/png" },
      { width: 30, height: 40, mimeType: "image/jpeg" },
      { width: 50, height: 60, mimeType: "image/webp" },
    ])
    expect(result.issues).toEqual([{ fileName: "sample.png", message: "已在列表中" }])
  })

  it("respects files already in the list", async () => {
    const file = createPngFile("existing.png", 10, 10)
    const result = await validateImageFiles([file], {
      existingCount: 1,
      existingBytes: file.size,
      existingKeys: new Set([getFileKey(file)]),
    })

    expect(result.accepted).toHaveLength(0)
    expect(result.issues[0]?.message).toBe("已在列表中")
  })
})
