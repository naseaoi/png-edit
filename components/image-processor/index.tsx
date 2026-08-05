"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useImageProcessor } from "@/hooks/use-image-processor"
import { useProcessingSettings } from "@/hooks/use-processing-settings"
import { BatchToolbar } from "./batch-toolbar"
import { FeedbackList } from "./feedback-list"
import { ImageCard } from "./image-card"
import { SettingsPanel } from "./settings-panel"
import { UploadZone } from "./upload-zone"

export default function ImageProcessor() {
  const settings = useProcessingSettings()
  const processor = useImageProcessor(settings.config)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const deleteImage = processor.images.find((image) => image.id === deleteImageId)

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-background text-slate-900">
        <header className="app-header">
          <div className="app-shell flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="app-mark" aria-hidden="true">
                PNG
              </div>
              <div className="min-w-0">
                <h1 className="font-display truncate text-lg font-semibold">PNG 批量处理</h1>
                <p className="text-xs text-slate-500">背景填充、边距与透明边框</p>
              </div>
            </div>
            <span className="format-chip shrink-0">JPG / PNG</span>
          </div>
        </header>

        <main className="app-shell py-5 sm:py-7">
          <UploadZone
            disabled={processor.processing}
            onFiles={processor.addFiles}
            onError={processor.reportOperationError}
          />

          <FeedbackList
            issues={processor.validationIssues}
            operationError={processor.operationError}
            onDismiss={processor.clearMessages}
          />

          {processor.images.length > 0 ? (
            <div className="workspace-layout">
              <SettingsPanel
                config={settings.config}
                selectedColor={settings.selectedColor}
                customColor={settings.customColor}
                syncMargin={settings.syncMargin}
                disabled={processor.processing}
                onPresetColor={settings.selectPresetColor}
                onCustomColor={settings.selectCustomColor}
                onMarginValue={settings.setMarginValue}
                onTransparentBorder={settings.setTransparentBorder}
                onToggleMarginSync={settings.toggleMarginSync}
                onJpegQuality={settings.setJpegQuality}
              />

              <section className="min-w-0" aria-label="图片任务">
                <BatchToolbar
                  totalCount={processor.images.length}
                  completedCount={processor.completedCount}
                  pendingCount={processor.pendingCount}
                  processing={processor.processing}
                  downloading={processor.downloading}
                  progress={processor.progress}
                  onProcess={processor.processAll}
                  onCancel={processor.cancelProcessing}
                  onDownload={processor.downloadAll}
                  onReset={processor.resetAll}
                  onClear={() => setShowClearDialog(true)}
                />

                <div className="image-grid">
                  {processor.images.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      disabled={processor.processing}
                      onDownload={processor.downloadImage}
                      onReset={processor.resetImage}
                      onDelete={setDeleteImageId}
                    />
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="empty-state">
              <ImageIcon aria-hidden="true" />
              <p>任务队列为空</p>
            </div>
          )}
        </main>

        <AlertDialog
          open={deleteImageId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteImageId(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除图片</AlertDialogTitle>
              <AlertDialogDescription>
                将从任务队列移除“{deleteImage?.originalFile.name ?? "此图片"}”。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteImageId) processor.removeImage(deleteImageId)
                  setDeleteImageId(null)
                }}
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>清空任务队列</AlertDialogTitle>
              <AlertDialogDescription>
                将移除全部原图和处理结果。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  processor.clearAll()
                  setShowClearDialog(false)
                }}
              >
                清空
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
