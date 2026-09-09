import { IMAGE_LIMITS } from "@/constants/limits"
import type {
  ImageExtension,
  MarginConfig,
  OutputMimeType,
  ProcessingConfig,
  ProcessingModule,
  ResizeConfig,
  SupportedImageMimeType,
} from "@/types"
import { encodeRgbaToPng } from "@/lib/png-compression"

interface ProcessImageInput {
  sourceUrl: string
  sourceMimeType: SupportedImageMimeType
  config: ProcessingConfig
  signal: AbortSignal
}

interface ProcessImageResult {
  blob: Blob
  mimeType: OutputMimeType
  extension: ImageExtension
  width: number
  height: number
}

export const DEFAULT_MODULE_ORDER: ProcessingModule[] = [
  "background",
  "resize",
  "margin",
  "transparency",
  "compression",
]

export const normalizeModuleOrder = (order: unknown): ProcessingModule[] => {
  if (!Array.isArray(order)) return DEFAULT_MODULE_ORDER
  const seen = new Set<ProcessingModule>()
  const filtered: ProcessingModule[] = []
  order.forEach((module) => {
    if (
      typeof module === "string" &&
      DEFAULT_MODULE_ORDER.includes(module as ProcessingModule) &&
      !seen.has(module as ProcessingModule)
    ) {
      seen.add(module as ProcessingModule)
      filtered.push(module as ProcessingModule)
    }
  })
  if (filtered.length !== DEFAULT_MODULE_ORDER.length) return DEFAULT_MODULE_ORDER
  return filtered
}

const moduleOrderKey = (config: ProcessingConfig) =>
  normalizeModuleOrder(config.moduleOrder).join(">")

const clampInteger = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export const normalizeResizeConfig = (resize: ResizeConfig): ResizeConfig => ({
  enabled: resize.enabled,
  mode: resize.mode === "dimensions" ? "dimensions" : "scale",
  scalePercent: clampInteger(resize.scalePercent, 1, 100),
  width: clampInteger(resize.width, 1, IMAGE_LIMITS.maxOutputDimension),
  height: clampInteger(resize.height, 1, IMAGE_LIMITS.maxOutputDimension),
  preserveAspectRatio: resize.preserveAspectRatio,
})

export const getResizedDimensions = (
  sourceWidth: number,
  sourceHeight: number,
  resizeConfig: ResizeConfig,
) => {
  const width = clampInteger(sourceWidth, 1, IMAGE_LIMITS.maxOutputDimension)
  const height = clampInteger(sourceHeight, 1, IMAGE_LIMITS.maxOutputDimension)
  const resize = normalizeResizeConfig(resizeConfig)

  if (!resize.enabled) return { width, height }

  if (resize.mode === "scale") {
    const ratio = resize.scalePercent / 100
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    }
  }

  if (!resize.preserveAspectRatio) {
    return { width: resize.width, height: resize.height }
  }

  const ratio = Math.min(resize.width / width, resize.height / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

export const normalizeMarginConfig = (margin: MarginConfig): MarginConfig => ({
  enabled: margin.enabled,
  top: clampInteger(margin.top, 0, IMAGE_LIMITS.maxMargin),
  bottom: clampInteger(margin.bottom, 0, IMAGE_LIMITS.maxMargin),
  left: clampInteger(margin.left, 0, IMAGE_LIMITS.maxMargin),
  right: clampInteger(margin.right, 0, IMAGE_LIMITS.maxMargin),
})

export const getProcessingConfigKey = (config: ProcessingConfig) => {
  const margin = normalizeMarginConfig(config.margin)
  const resize = normalizeResizeConfig(config.resize)
  const resizeKey = resize.enabled
    ? [
        1,
        resize.mode,
        resize.mode === "scale" ? resize.scalePercent : resize.width,
        resize.mode === "scale" ? "" : resize.height,
        resize.mode === "dimensions" ? Number(resize.preserveAspectRatio) : "",
      ]
    : [0]
  const marginKey = margin.enabled
    ? [1, margin.top, margin.right, margin.bottom, margin.left]
    : [0]
  const compressionKey = config.compression.enabled
    ? [1, clampInteger(config.compression.quality, 60, 100)]
    : [0]
  return [
    config.background.enabled && !config.transparentBorder
      ? `BACKGROUND:${config.background.color.toUpperCase()}`
      : "NO_BACKGROUND",
    Number(config.transparentBorder),
    ...marginKey,
    ...resizeKey,
    ...compressionKey,
    moduleOrderKey(config),
  ].join(":")
}

export const getOutputDescriptor = (
  config: ProcessingConfig,
  sourceMimeType: SupportedImageMimeType = "image/png",
) => {
  if (config.transparentBorder) {
    return { mimeType: "image/png", extension: "png" } as const
  }
  if (config.background.enabled) {
    return { mimeType: "image/jpeg", extension: "jpg" } as const
  }
  if (sourceMimeType === "image/jpeg") {
    return { mimeType: "image/jpeg", extension: "jpg" } as const
  }
  if (sourceMimeType === "image/webp") {
    return { mimeType: "image/webp", extension: "webp" } as const
  }
  return { mimeType: "image/png", extension: "png" } as const
}

export const getCanvasBackground = (config: ProcessingConfig) =>
  config.transparentBorder || !config.background.enabled
    ? null
    : config.background.color

export const getPngColorCount = (quality: number) => {
  const normalizedQuality = clampInteger(quality, 60, 100)
  if (normalizedQuality === 100) return 0
  return 2 ** Math.round(6 + ((normalizedQuality - 60) / 40) * 5)
}

const sanitizeFileName = (name: string) =>
  name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 160) || "image"

export const getOutputFileName = (
  originalName: string,
  config: ProcessingConfig,
  sourceMimeType: SupportedImageMimeType = "image/png",
) => {
  const baseName = sanitizeFileName(originalName.replace(/\.[^.]+$/i, ""))
  const { extension } = getOutputDescriptor(config, sourceMimeType)
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
  if (!margin.enabled) {
    return { width: sourceWidth, height: sourceHeight, left: 0, top: 0 }
  }
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
      (blob) => {
        if (!blob) {
          reject(new Error("浏览器无法生成图片"))
          return
        }
        if (blob.type !== mimeType) {
          reject(new Error(`当前浏览器不支持生成 ${mimeType.replace("image/", "").toUpperCase()}`))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

export const processImage = async ({
  sourceUrl,
  sourceMimeType,
  config,
  signal,
}: ProcessImageInput): Promise<ProcessImageResult> => {
  if (signal.aborted) throw createAbortError()

  const image = await loadImage(sourceUrl, signal)
  const order = normalizeModuleOrder(config.moduleOrder)

  let imageWidth = image.naturalWidth
  let imageHeight = image.naturalHeight
  let canvasWidth = imageWidth
  let canvasHeight = imageHeight
  let offsetX = 0
  let offsetY = 0
  let background: string | null = null

  for (const step of order) {
    if (step === "resize") {
      const resized = getResizedDimensions(canvasWidth, canvasHeight, config.resize)
      const ratioX = resized.width / canvasWidth
      const ratioY = resized.height / canvasHeight
      imageWidth *= ratioX
      imageHeight *= ratioY
      offsetX *= ratioX
      offsetY *= ratioY
      canvasWidth = resized.width
      canvasHeight = resized.height
    } else if (step === "margin") {
      const layout = getCanvasLayout(canvasWidth, canvasHeight, config.margin)
      offsetX += layout.left
      offsetY += layout.top
      canvasWidth = layout.width
      canvasHeight = layout.height
    } else if (step === "background") {
      background = getCanvasBackground(config)
    }
  }
  const drawWidth = canvasWidth
  const drawHeight = canvasHeight

  if (
    drawWidth > IMAGE_LIMITS.maxOutputDimension ||
    drawHeight > IMAGE_LIMITS.maxOutputDimension ||
    drawWidth * drawHeight > IMAGE_LIMITS.maxOutputPixels
  ) {
    throw new Error("添加边距后的图片尺寸超过处理上限")
  }

  const canvas = document.createElement("canvas")
  canvas.width = drawWidth
  canvas.height = drawHeight
  const context = canvas.getContext("2d")
  if (!context) throw new Error("浏览器不支持图片画布")

  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, drawWidth, drawHeight)
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(image, offsetX, offsetY, imageWidth, imageHeight)

  if (signal.aborted) throw createAbortError()

  const descriptor = getOutputDescriptor(config, sourceMimeType)
  const quality = config.compression.enabled
    ? clampInteger(config.compression.quality, 60, 100) / 100
    : 1
  let blob = await canvasToBlob(
    canvas,
    descriptor.mimeType,
    quality,
  )

  if (descriptor.mimeType === "image/png" && config.compression.enabled) {
    const imageData = context.getImageData(0, 0, drawWidth, drawHeight)
    const colorCount = getPngColorCount(config.compression.quality)
    const hasTransparency = imageData.data.some(
      (value, index) => index % 4 === 3 && value !== 255,
    )
    const compressedBlob = encodeRgbaToPng(
      imageData.data,
      drawWidth,
      drawHeight,
      colorCount,
      colorCount === 0 || hasTransparency,
    )
    if (compressedBlob.size < blob.size) blob = compressedBlob
  }

  if (signal.aborted) throw createAbortError()
  return { blob, ...descriptor, width: drawWidth, height: drawHeight }
}
