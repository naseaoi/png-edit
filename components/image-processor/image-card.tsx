import {
  Download,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react"
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

export const ImageCard = ({
  image,
  disabled,
  onDownload,
  onReset,
  onDelete,
}: ImageCardProps) => {
  const previewUrl = image.output?.url ?? image.originalUrl
  const previewLabel = image.output ? "处理结果" : "原图"
  const resultFitsWidth = image.output
    ? image.output.width / image.output.height >= 4 / 3
    : false
  const previewClassName = image.output
    ? `result-image-boundary ${resultFitsWidth ? "h-auto w-full" : "h-full w-auto"}`
    : "h-full w-full object-contain"

  return (
    <article className="image-card">
      <div className="checkerboard image-preview">
        {image.status === "processing" ? (
          <div className="flex h-full items-center justify-center" role="status">
            <RefreshCw className="size-7 animate-spin text-primary" />
            <span className="sr-only">正在处理 {image.originalFile.name}</span>
          </div>
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
        <div className="min-w-0">
          <h3 title={image.originalFile.name}>{image.originalFile.name}</h3>
          <p>
            {image.originalWidth}×{image.originalHeight} · {formatFileSize(image.originalFile.size)}
          </p>
        </div>
        {image.status === "done" && image.output ? (
          <Badge variant="secondary">
            {image.output.extension.toUpperCase()} · {image.output.width}×{image.output.height}
          </Badge>
        ) : image.status === "error" ? (
          <Badge variant="destructive">失败</Badge>
        ) : (
          <Badge variant="outline">待处理</Badge>
        )}
      </div>

      {image.error && <p className="image-error">{image.error}</p>}

      {image.output && (
        <Button
          type="button"
          variant="outline"
          className="m-3 mt-0"
          disabled={disabled}
          onClick={() => onDownload(image)}
        >
          <Download />
          下载
        </Button>
      )}
    </article>
  )
}
