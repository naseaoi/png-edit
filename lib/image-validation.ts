import { IMAGE_LIMITS } from "@/constants/limits"
import type {
  SupportedImageMimeType,
  ValidatedImage,
  ValidationIssue,
} from "@/types"

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const IHDR_CHUNK = [73, 72, 68, 82]
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
])

interface ValidationContext {
  existingCount: number
  existingBytes: number
  existingKeys: Set<string>
}

interface ValidationResult {
  accepted: ValidatedImage[]
  issues: ValidationIssue[]
}

interface ImageMetadata {
  width: number
  height: number
  mimeType: SupportedImageMimeType
}

const matchesBytes = (bytes: Uint8Array, offset: number, expected: number[]) =>
  expected.every((value, index) => bytes[offset + index] === value)

const matchesText = (bytes: Uint8Array, offset: number, expected: string) =>
  Array.from(expected).every(
    (value, index) => bytes[offset + index] === value.charCodeAt(0),
  )

const readUint24LittleEndian = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)

const validateDimensions = (width: number, height: number) => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("图片尺寸无效")
  }
  return { width, height }
}

export const getFileKey = (file: File) =>
  [file.name.toLocaleLowerCase(), file.size, file.lastModified].join(":")

export const readPngDimensions = async (file: File) => {
  const header = new Uint8Array(await file.slice(0, 24).arrayBuffer())

  if (
    header.length < 24 ||
    !matchesBytes(header, 0, PNG_SIGNATURE) ||
    !matchesBytes(header, 12, IHDR_CHUNK)
  ) {
    throw new Error("文件内容不是有效的 PNG")
  }

  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  return validateDimensions(view.getUint32(16), view.getUint32(20))
}

export const readJpegDimensions = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("文件内容不是有效的 JPG")
  }

  let offset = 2
  while (offset + 3 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset]
    offset += 1

    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 1 >= bytes.length) break

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1]
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break

    if (JPEG_SOF_MARKERS.has(marker) && segmentLength >= 7) {
      return validateDimensions(
        (bytes[offset + 5] << 8) | bytes[offset + 6],
        (bytes[offset + 3] << 8) | bytes[offset + 4],
      )
    }
    offset += segmentLength
  }

  throw new Error("无法读取 JPG 图片尺寸")
}

export const readWebpDimensions = async (file: File) => {
  const bytes = new Uint8Array(await file.slice(0, 30).arrayBuffer())
  if (
    bytes.length < 30 ||
    !matchesText(bytes, 0, "RIFF") ||
    !matchesText(bytes, 8, "WEBP")
  ) {
    throw new Error("文件内容不是有效的 WebP")
  }

  if (matchesText(bytes, 12, "VP8X")) {
    return validateDimensions(
      readUint24LittleEndian(bytes, 24) + 1,
      readUint24LittleEndian(bytes, 27) + 1,
    )
  }

  if (matchesText(bytes, 12, "VP8L") && bytes[20] === 0x2f) {
    return validateDimensions(
      1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    )
  }

  if (
    matchesText(bytes, 12, "VP8 ") &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return validateDimensions(
      (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    )
  }

  throw new Error("无法读取 WebP 图片尺寸")
}

export const readImageMetadata = async (file: File): Promise<ImageMetadata> => {
  const header = new Uint8Array(await file.slice(0, 30).arrayBuffer())

  if (matchesBytes(header, 0, PNG_SIGNATURE)) {
    return { ...(await readPngDimensions(file)), mimeType: "image/png" }
  }
  if (header[0] === 0xff && header[1] === 0xd8) {
    return { ...(await readJpegDimensions(file)), mimeType: "image/jpeg" }
  }
  if (matchesText(header, 0, "RIFF") && matchesText(header, 8, "WEBP")) {
    return { ...(await readWebpDimensions(file)), mimeType: "image/webp" }
  }

  throw new Error("仅支持 PNG、JPG 和 WebP 图片")
}

export const validateImageFiles = async (
  files: File[],
  context: ValidationContext,
): Promise<ValidationResult> => {
  const accepted: ValidatedImage[] = []
  const issues: ValidationIssue[] = []
  const seenKeys = new Set(context.existingKeys)
  let totalBytes = context.existingBytes
  const candidates = files.slice(0, IMAGE_LIMITS.maxDiscoveredFiles)

  if (files.length > candidates.length) {
    issues.push({
      fileName: "批量导入",
      message: `一次最多检查 ${IMAGE_LIMITS.maxDiscoveredFiles} 个文件`,
    })
  }

  for (const file of candidates) {
    const key = getFileKey(file)

    if (context.existingCount + accepted.length >= IMAGE_LIMITS.maxFiles) {
      issues.push({ fileName: file.name, message: `最多上传 ${IMAGE_LIMITS.maxFiles} 张图片` })
      continue
    }
    if (seenKeys.has(key)) {
      issues.push({ fileName: file.name, message: "已在列表中" })
      continue
    }
    if (file.size === 0 || file.size > IMAGE_LIMITS.maxFileBytes) {
      issues.push({ fileName: file.name, message: "文件大小必须在 0 到 25 MB 之间" })
      continue
    }
    if (totalBytes + file.size > IMAGE_LIMITS.maxTotalBytes) {
      issues.push({ fileName: file.name, message: "全部文件总大小不能超过 250 MB" })
      continue
    }

    try {
      const { width, height, mimeType } = await readImageMetadata(file)
      if (width > IMAGE_LIMITS.maxSourceDimension || height > IMAGE_LIMITS.maxSourceDimension) {
        throw new Error(`图片长宽不能超过 ${IMAGE_LIMITS.maxSourceDimension}px`)
      }
      if (width * height > IMAGE_LIMITS.maxSourcePixels) {
        throw new Error("图片总像素不能超过 4000 万")
      }

      accepted.push({ file, width, height, mimeType, key })
      seenKeys.add(key)
      totalBytes += file.size
    } catch (error) {
      issues.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : "无法读取图片",
      })
    }
  }

  return { accepted, issues }
}
