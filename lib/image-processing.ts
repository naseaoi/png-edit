import { IMAGE_LIMITS } from "@/constants/limits"
import type {
  MarginConfig,
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

export const normalizeMarginConfig = (margin: MarginConfig): MarginConfig => ({
  top: clampInteger(margin.top, 0, IMAGE_LIMITS.maxMargin),
  bottom: clampInteger(margin.bottom, 0, IMAGE_LIMITS.maxMargin),
  left: clampInteger(margin.left, 0, IMAGE_LIMITS.maxMargin),
  right: clampInteger(margin.right, 0, IMAGE_LIMITS.maxMargin),
})

export const getProcessingConfigKey = (config: ProcessingConfig) => {
  const margin = normalizeMarginConfig(config.margin)
  return [
    config.transparentBorder ? "TRANSPARENT" : config.backgroundColor.toUpperCase(),
    clampInteger(config.jpegQuality * 100, 1, 100),
    Number(config.transparentBorder),
    margin.top,
    margin.right,
    margin.bottom,
    margin.left,
  ].join(":")
}

export const getOutputDescriptor = (config: ProcessingConfig) =>
  config.transparentBorder
    ? ({ mimeType: "image/png", extension: "png" } as const)
    : ({ mimeType: "image/jpeg", extension: "jpg" } as const)

export const getCanvasBackground = (config: ProcessingConfig) =>
  config.transparentBorder ? null : config.backgroundColor

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

export const getCanvasLayout = (
  sourceWidth: number,
  sourceHeight: number,
  marginConfig: MarginConfig,
) => {
  const margin = normalizeMarginConfig(marginConfig)
  return {
    width: sourceWidth + margin.left + margin.right,
    height: sourceHeight + margin.top + margin.bottom,
    left: margin.left,
    top: margin.top,
  }
}

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
  const { width, height, left, top } = getCanvasLayout(
    image.naturalWidth,
    image.naturalHeight,
    config.margin,
  )

  if (
    width > IMAGE_LIMITS.maxOutputDimension ||
    height > IMAGE_LIMITS.maxOutputDimension ||
    width * height > IMAGE_LIMITS.maxOutputPixels
  ) {
    throw new Error("添加边距后的图片尺寸超过处理上限")
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("浏览器不支持图片画布")

  const canvasBackground = getCanvasBackground(config)
  if (canvasBackground) {
    context.fillStyle = canvasBackground
    context.fillRect(0, 0, width, height)
  }
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
