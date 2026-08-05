import {
  Download,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ProcessedImage } from "@/types"

interface ImageCardProps {
  image: ProcessedImage
  disabled: boolean
  onDownload: (image: ProcessedImage) => void
  onReset: (id: string) => void
  onDelete: (id: string) => void
}

const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`

const formatOutputSize = (originalBytes: number, outputBytes: number) => {
  const change = Math.round(((outputBytes - originalBytes) / originalBytes) * 100)
  if (change === 0) return formatFileSize(outputBytes)
  return `${formatFileSize(outputBytes)} · ${change > 0 ? "+" : ""}${change}%`
}

export const ImageCard = ({
  image,
  disabled,
  onDownload,
  onReset,
  onDelete,
}: ImageCardProps) => {
  const [previewOpen, setPreviewOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previewUrl = image.output?.url ?? image.originalUrl
  const previewLabel = image.output ? "处理结果" : "原图"
  const previewWidth = image.output?.width ?? image.originalWidth
  const previewHeight = image.output?.height ?? image.originalHeight
  const previewFitsWidth = previewWidth / previewHeight >= 4 / 3
  const previewClassName = `image-boundary ${
    previewFitsWidth ? "h-auto w-full" : "h-full w-auto"
  }`

  useEffect(() => {
    if (!previewOpen) return
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [previewOpen])

  return (
    <article className="image-card">
      <div className="checkerboard image-preview">
        {image.status === "processing" ? (
          <div className="flex h-full items-center justify-center" role="status">
            <RefreshCw className="size-7 animate-spin text-primary" />
            <span className="sr-only">正在处理 {image.originalFile.name}</span>
          </div>
        ) : image.output ? (
          <button
            type="button"
            className="image-preview-trigger"
            aria-label={`查看 ${image.originalFile.name} 的处理结果`}
            disabled={disabled}
            onClick={() => setPreviewOpen(true)}
          >
            <img
              src={previewUrl}
              alt={`${image.originalFile.name} ${previewLabel}`}
              className={previewClassName}
            />
          </button>
        ) : (
          <img
            src={previewUrl}
            alt={`${image.originalFile.name} ${previewLabel}`}
            className={previewClassName}
          />
        )}
        <div className="image-card-actions">
          {(image.output || image.status === "error") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={`重置 ${image.originalFile.name}`}
                  disabled={disabled}
                  onClick={() => onReset(image.id)}
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置结果</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label={`删除 ${image.originalFile.name}`}
                disabled={disabled}
                onClick={() => onDelete(image.id)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除图片</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="image-card-body">
        <h3 title={image.originalFile.name}>{image.originalFile.name}</h3>
        <div className="image-card-meta-row">
          <p title={`${image.originalWidth}×${image.originalHeight} · ${formatFileSize(image.originalFile.size)}`}>
            {image.originalWidth}×{image.originalHeight} · {formatFileSize(image.originalFile.size)}
          </p>
          {image.status === "done" && image.output ? (
            <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
              {formatOutputSize(image.originalFile.size, image.output.blob.size)}
            </Badge>
          ) : image.status === "error" ? (
            <Badge variant="destructive" className="shrink-0 whitespace-nowrap">
              失败
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 whitespace-nowrap">
              待处理
            </Badge>
          )}
        </div>
      </div>

      {image.error && <p className="image-error">{image.error}</p>}

      {image.output && (
        <Button
          type="button"
          variant="outline"
          className="result-download m-3 mt-0"
          disabled={disabled}
          aria-label={`下载 ${image.originalFile.name}，${image.output.extension.toUpperCase()}，${image.output.width}×${image.output.height}`}
          onClick={() => onDownload(image)}
        >
          <Download />
          <span>
            {image.output.extension.toUpperCase()} · {image.output.width}×{image.output.height}
          </span>
        </Button>
      )}

      {image.output && previewOpen && (
        <div
          className="image-viewer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`preview-title-${image.id}`}
          onClick={() => setPreviewOpen(false)}
        >
          <div className="image-viewer-panel" onClick={(event) => event.stopPropagation()}>
            <button
              ref={closeButtonRef}
              type="button"
              className="image-viewer-close"
              aria-label="关闭图片预览"
              onClick={() => setPreviewOpen(false)}
            >
              <X />
            </button>
            <div className="image-viewer-image-wrap">
              <img
                src={image.output.url}
                alt={`${image.originalFile.name} 处理结果大图`}
                className="image-viewer-image"
              />
            </div>
            <div className="image-viewer-caption">
              <h2 id={`preview-title-${image.id}`} title={image.originalFile.name}>
                {image.originalFile.name}
              </h2>
              <p>
                {image.output.width}×{image.output.height} · {image.output.extension.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
