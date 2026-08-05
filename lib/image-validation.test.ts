import { describe, expect, it } from "vitest"
import { getFileKey, readPngDimensions, validatePngFiles } from "@/lib/image-validation"

const createPngFile = (name: string, width: number, height: number) => {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  bytes.set([73, 72, 68, 82], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return new File([bytes], name, { type: "image/png", lastModified: 1 })
}

describe("readPngDimensions", () => {
  it("reads dimensions from the IHDR header", async () => {
    await expect(readPngDimensions(createPngFile("valid.png", 640, 480))).resolves.toEqual({
      width: 640,
      height: 480,
    })
  })

  it("rejects a file with a forged MIME type", async () => {
    const file = new File(["not a png"], "fake.png", { type: "image/png" })
    await expect(readPngDimensions(file)).rejects.toThrow("文件内容不是有效的 PNG")
  })
})

describe("validatePngFiles", () => {
  it("accepts valid files and rejects duplicates", async () => {
    const file = createPngFile("sample.png", 10, 20)
    const result = await validatePngFiles([file, file], {
      existingCount: 0,
      existingBytes: 0,
      existingKeys: new Set(),
    })

    expect(result.accepted).toHaveLength(1)
    expect(result.accepted[0]).toMatchObject({ width: 10, height: 20 })
    expect(result.issues).toEqual([{ fileName: "sample.png", message: "已在列表中" }])
  })

  it("respects files already in the list", async () => {
    const file = createPngFile("existing.png", 10, 10)
    const result = await validatePngFiles([file], {
      existingCount: 1,
      existingBytes: file.size,
      existingKeys: new Set([getFileKey(file)]),
    })

    expect(result.accepted).toHaveLength(0)
    expect(result.issues[0]?.message).toBe("已在列表中")
  })
})
