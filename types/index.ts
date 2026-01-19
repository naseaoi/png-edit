export interface ProcessedImage {
  id: string
  originalFile: File
  originalUrl: string
  processedUrl: string | null
  processed: boolean
  processing: boolean
  history: Array<{ processedUrl: string | null; processed: boolean; timestamp: number }>
}

export interface BackgroundColor {
  name: string
  value: string
  description: string
}

export interface BorderConfig {
  enabled: boolean
  top: number
  bottom: number
  left: number
  right: number
}
