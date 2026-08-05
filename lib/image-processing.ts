import { IMAGE_LIMITS } from "@/constants/limits"
import type {
  BorderConfig,
  OutputMimeType,
  ProcessingConfig,
} from "@/types"

interface ProcessImageInput {
  sourceUrl: string
  config: ProcessingConfig
  signal: AbortSignal
}

interface ProcessImageResult {
  blob: Blob
  mimeType: OutputMimeType
  extension: "jpg" | "png"
  width: number
  height: number
}

const clampInteger = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export const normalizeBorderConfig = (border: BorderConfig): BorderConfig => ({
  enabled: Boolean(border.enabled),
  top: clampInteger(border.top, 0, IMAGE_LIMITS.maxBorder),
  bottom: clampInteger(border.bottom, 0, IMAGE_LIMITS.maxBorder),
  left: clampInteger(border.left, 0, IMAGE_LIMITS.maxBorder),
  right: clampInteger(border.right, 0, IMAGE_LIMITS.maxBorder),
})

export const getProcessingConfigKey = (config: ProcessingConfig) => {
  const border = normalizeBorderConfig(config.border)
  return [
    config.backgroundColor.toUpperCase(),
    clampInteger(config.jpegQuality * 100, 1, 100),
    Number(border.enabled),
    border.top,
    border.right,
    border.bottom,
    border.left,
  ].join(":")
}

export const getOutputDescriptor = (config: ProcessingConfig) =>
  config.border.enabled
    ? ({ mimeType: "image/png", extension: "png" } as const)
    : ({ mimeType: "image/jpeg", extension: "jpg" } as const)

const sanitizeFileName = (name: string) =>
  name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 160) || "image"

export const getOutputFileName = (originalName: string, config: ProcessingConfig) => {
  const baseName = sanitizeFileName(originalName.replace(/\.png$/i, ""))
  const { extension } = getOutputDescriptor(config)
  return `${baseName}_processed.${extension}`
}

export const getUniqueFileName = (fileName: string, usedNames: Set<string>) => {
  if (!usedNames.has(fileName.toLocaleLowerCase())) {
    usedNames.add(fileName.toLocaleLowerCase())
    return fileName
  }

  const dotIndex = fileName.lastIndexOf(".")
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : ""
  let index = 2
  let candidate = `${baseName}_${index}${extension}`

  while (usedNames.has(candidate.toLocaleLowerCase())) {
    index += 1
    candidate = `${baseName}_${index}${extension}`
  }

  usedNames.add(candidate.toLocaleLowerCase())
  return candidate
}

const createAbortError = () => new DOMException("处理已取消", "AbortError")

const loadImage = (sourceUrl: string, signal: AbortSignal) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener("abort", handleAbort)
    }
    const handleAbort = () => {
      cleanup()
      image.src = ""
      reject(createAbortError())
    }

    image.decoding = "async"
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error("无法解码图片"))
    }
    signal.addEventListener("abort", handleAbort, { once: true })
    image.src = sourceUrl
  })

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: OutputMimeType,
  quality: number,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("浏览器无法生成图片"))),
      mimeType,
      quality,
    )
  })

export const processImage = async ({
  sourceUrl,
  config,
  signal,
}: ProcessImageInput): Promise<ProcessImageResult> => {
  if (signal.aborted) throw createAbortError()

  const image = await loadImage(sourceUrl, signal)
  const border = normalizeBorderConfig(config.border)
  const left = border.enabled ? border.left : 0
  const right = border.enabled ? border.right : 0
  const top = border.enabled ? border.top : 0
  const bottom = border.enabled ? border.bottom : 0
  const width = image.naturalWidth + left + right
  const height = image.naturalHeight + top + bottom

  if (
    width > IMAGE_LIMITS.maxOutputDimension ||
    height > IMAGE_LIMITS.maxOutputDimension ||
    width * height > IMAGE_LIMITS.maxOutputPixels
  ) {
    throw new Error("添加边框后的图片尺寸超过处理上限")
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("浏览器不支持图片画布")

  context.fillStyle = config.backgroundColor
  context.fillRect(left, top, image.naturalWidth, image.naturalHeight)
  context.drawImage(image, left, top)

  if (signal.aborted) throw createAbortError()

  const descriptor = getOutputDescriptor(config)
  const blob = await canvasToBlob(
    canvas,
    descriptor.mimeType,
    clampInteger(config.jpegQuality * 100, 1, 100) / 100,
  )

  if (signal.aborted) throw createAbortError()
  return { blob, ...descriptor, width, height }
}
