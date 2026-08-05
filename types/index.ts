export interface ProcessedImage {
  id: string
  originalFile: File
  originalUrl: string
  originalWidth: number
  originalHeight: number
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
  top: number
  bottom: number
  left: number
  right: number
}

export interface ProcessingConfig {
  backgroundColor: string
  margin: MarginConfig
  transparentBorder: boolean
  jpegQuality: number
}

export type ImageStatus = "pending" | "processing" | "done" | "error"

export type OutputMimeType = "image/jpeg" | "image/png"

export interface ImageOutput {
  blob: Blob
  url: string
  mimeType: OutputMimeType
  extension: "jpg" | "png"
  width: number
  height: number
  configKey: string
}

export interface ValidatedImage {
  file: File
  width: number
  height: number
  key: string
}

export interface ValidationIssue {
  fileName: string
  message: string
}
