import { IMAGE_LIMITS } from "@/constants/limits"
import type { ValidatedImage, ValidationIssue } from "@/types"

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const IHDR_CHUNK = [73, 72, 68, 82]

interface ValidationContext {
  existingCount: number
  existingBytes: number
  existingKeys: Set<string>
}

interface ValidationResult {
  accepted: ValidatedImage[]
  issues: ValidationIssue[]
}

export const getFileKey = (file: File) =>
  [file.name.toLocaleLowerCase(), file.size, file.lastModified].join(":")

export const readPngDimensions = async (file: File) => {
  const header = new Uint8Array(await file.slice(0, 24).arrayBuffer())

  if (
    header.length < 24 ||
    PNG_SIGNATURE.some((value, index) => header[index] !== value) ||
    IHDR_CHUNK.some((value, index) => header[index + 12] !== value)
  ) {
    throw new Error("文件内容不是有效的 PNG")
  }

  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)

  if (width === 0 || height === 0) {
    throw new Error("图片尺寸无效")
  }

  return { width, height }
}

export const validatePngFiles = async (
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
      const { width, height } = await readPngDimensions(file)
      if (width > IMAGE_LIMITS.maxSourceDimension || height > IMAGE_LIMITS.maxSourceDimension) {
        throw new Error(`图片长宽不能超过 ${IMAGE_LIMITS.maxSourceDimension}px`)
      }
      if (width * height > IMAGE_LIMITS.maxSourcePixels) {
        throw new Error("图片总像素不能超过 4000 万")
      }

      accepted.push({ file, width, height, key })
      seenKeys.add(key)
      totalBytes += file.size
    } catch (error) {
      issues.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : "无法读取 PNG",
      })
    }
  }

  return { accepted, issues }
}
