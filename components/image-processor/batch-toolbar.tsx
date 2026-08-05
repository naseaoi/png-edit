import {
  Download,
  ImageIcon,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BatchToolbarProps {
  totalCount: number
  completedCount: number
  pendingCount: number
  processing: boolean
  downloading: boolean
  progress: { completed: number; total: number }
  onProcess: () => void
  onCancel: () => void
  onDownload: () => void
  onReset: () => void
  onClear: () => void
}

export const BatchToolbar = ({
  totalCount,
  completedCount,
  pendingCount,
  processing,
  downloading,
  progress,
  onProcess,
  onCancel,
  onDownload,
  onReset,
  onClear,
}: BatchToolbarProps) => {
  const progressValue =
    progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100)

  return (
    <section className="batch-toolbar" aria-label="批量操作">
      <div className="batch-summary">
        <div>
          <h2 className="font-display text-base font-semibold">任务队列</h2>
          <p className="text-sm text-neutral-600">
            {completedCount} / {totalCount} 已完成
          </p>
        </div>
        {processing ? (
          <div className="processing-status" aria-live="polite">
            <span>处理进度 {progress.completed}/{progress.total}</span>
            <Progress aria-label="处理进度" value={progressValue} className="h-1" />
          </div>
        ) : (
          <span className="format-chip">
            {pendingCount > 0 ? `${pendingCount} 待处理` : "全部完成"}
          </span>
        )}
      </div>

      <div className="batch-actions">
        {processing ? (
          <Button type="button" variant="destructive" onClick={onCancel}>
            <Square />
            取消处理
          </Button>
        ) : (
          <Button type="button" disabled={pendingCount === 0} onClick={onProcess}>
            <ImageIcon />
            处理全部
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={completedCount === 0 || processing || downloading}
          onClick={onDownload}
        >
          <Download />
          {downloading ? "正在打包" : "下载全部"}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="重置全部结果"
              disabled={completedCount === 0 || processing}
              onClick={onReset}
            >
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>重置全部结果</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="清空任务队列"
              disabled={totalCount === 0 || processing}
              onClick={onClear}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>清空任务队列</TooltipContent>
        </Tooltip>
      </div>

    </section>
  )
}
