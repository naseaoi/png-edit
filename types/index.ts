export interface ProcessedImage {
  id: string
  originalFile: File
  originalUrl: string
  originalWidth: number
  originalHeight: number
  originalMimeType: SupportedImageMimeType
  status: ImageStatus
  output: ImageOutput | null
  error: string | null
}

export interface BackgroundColor {
  name: string
  value: string
  description: string
}

export interface MarginConfig {
  enabled: boolean
  top: number
  bottom: number
  left: number
  right: number
}

export interface BackgroundConfig {
  enabled: boolean
  color: string
}

export interface CompressionConfig {
  enabled: boolean
  quality: number
}

export type ResizeMode = "scale" | "dimensions"

export interface ResizeConfig {
  enabled: boolean
  mode: ResizeMode
  scalePercent: number
  width: number
  height: number
  preserveAspectRatio: boolean
}

export type ProcessingModule =
  | "background"
  | "resize"
  | "margin"
  | "transparency"
  | "compression"

export interface ProcessingConfig {
  background: BackgroundConfig
  margin: MarginConfig
  transparentBorder: boolean
  resize: ResizeConfig
  compression: CompressionConfig
  moduleOrder: ProcessingModule[]
}

export type ImageStatus = "pending" | "processing" | "done" | "error"

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp"
export type OutputMimeType = SupportedImageMimeType
export type ImageExtension = "jpg" | "png" | "webp"

export interface ImageOutput {
  blob: Blob
  url: string
  mimeType: OutputMimeType
  extension: ImageExtension
  width: number
  height: number
  configKey: string
}

export interface ValidatedImage {
  file: File
  width: number
  height: number
  mimeType: SupportedImageMimeType
  key: string
}

export interface ValidationIssue {
  fileName: string
  message: string
}
